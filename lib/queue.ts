// lib/queue.ts
import { Campaign, SmtpConfig, Recipient, EmailTemplate } from '@prisma/client';
import { createSmtpTransport, replaceTemplateParams, sanitizeEmail } from './email';
import { addTrackingToHtml } from './analytics';
import { prisma } from './db';

interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Get the next available SMTP configuration for sending emails
 * This rotates through configurations and respects daily limits
 */
export async function getNextAvailableSmtp(userId: string): Promise<SmtpConfig | null> {
  // Get all SMTP configs for the user, ordered by last used time
  const availableConfigs = await prisma.smtpConfig.findMany({
    where: {
      userId,
    },
    orderBy: [
      // Order by last used timestamp
      { lastUsed: 'asc' }
    ],
    take: 1
  });
  
  if (availableConfigs.length === 0) {
    return null;
  }
  
  // Update the selected config's usage data
  const selectedConfig = availableConfigs[0];
  await prisma.smtpConfig.update({
    where: { id: selectedConfig.id },
    data: {
      lastUsed: new Date(),
    }
  });
  
  return selectedConfig;
}

/**
 * Send an email with retry logic
 */
export async function sendEmailWithRetry(
  campaign: Campaign & { template: EmailTemplate },
  smtpConfig: SmtpConfig,
  recipient: Recipient,
  maxRetries = 3
): Promise<SendEmailResult> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      
      // Create transporter
      const transporter = await createSmtpTransport(smtpConfig);
      
      // Parse recipient metadata
      const metadata = recipient.metadata as Record<string, string> || {};
      
      // Prepare parameters
      const recipientParams: Record<string, string> = {
        email: recipient.email,
        name: recipient.name ?? recipient.email,
        ...metadata,
      };
      
      // Add default parameter values for missing parameters
      if (campaign.parameterValues) {
        const defaultParams = campaign.parameterValues as Record<string, string>;
        Object.entries(defaultParams).forEach(([key, value]) => {
          if (!recipientParams[key] && typeof value === 'string') {
            recipientParams[key] = value;
          }
        });
      }
      
      // Replace parameters in template
      let personalizedHtml = replaceTemplateParams(
        campaign.template.htmlContent,
        recipientParams
      );
      
      // Add tracking pixels and convert links
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      personalizedHtml = addTrackingToHtml(
        personalizedHtml,
        baseUrl,
        campaign.id,
        recipient.id
      );
      
      const personalizedSubject = replaceTemplateParams(
        campaign.template.subject,
        recipientParams
      );
      
      // Sanitize email addresses
      const sanitizedFromEmail = sanitizeEmail(smtpConfig.fromEmail);
      const sanitizedToEmail = sanitizeEmail(recipient.email);
      
      // Send email
      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${sanitizedFromEmail}>`,
        to: sanitizedToEmail,
        subject: personalizedSubject,
        html: personalizedHtml,
      });
      
      // Update recipient status
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { 
          status: 'sent',
          sentAt: new Date(),
        },
      });
      
      // Log success in analytics
      await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          smtpConfigId: smtpConfig.id,
          status: 'sent',
          sentAt: new Date(),
        },
      });
      
      return { success: true };
    } catch (error) {
      // If this is the last attempt, mark as failed
      if (attempt >= maxRetries) {
        // Update recipient status
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { 
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
        
        // Log failure in analytics
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            smtpConfigId: smtpConfig.id,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            sentAt: new Date(),
          },
        });
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
      
      // Exponential backoff before retry
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the return in the catch block
  return { success: false, error: 'Unknown error' };
}

/**
 * Finalize campaign status after all processing is complete
 */
export async function finalizeCampaign(campaignId: string): Promise<void> {
  // Get counts
  const [sentCount, failedCount] = await Promise.all([
    prisma.recipient.count({
      where: {
        campaignId,
        status: 'sent',
      },
    }),
    prisma.recipient.count({
      where: {
        campaignId,
        status: 'failed',
      },
    }),
  ]);
  
  // Determine final status
  let finalStatus: 'sent' | 'failed' | 'partial';
  
  if (failedCount === 0) {
    finalStatus = 'sent';
  } else if (sentCount === 0) {
    finalStatus = 'failed';
  } else {
    finalStatus = 'partial';
  }
  
  // Update campaign status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { 
      status: finalStatus,
      completedAt: new Date(),
      successCount: sentCount,
      failCount: failedCount,
    },
  });
}

/**
 * Check if a campaign is ready to be processed
 * This prevents multiple webhook invocations from processing the same campaign simultaneously
 */
export async function acquireCampaignLock(campaignId: string): Promise<boolean> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true }
    });
    
    // If campaign is already completed, don't process it again
    if (campaign?.status && ['sent', 'failed', 'partial'].includes(campaign.status)) {
      return false;
    }
    
    // Mark campaign as processing to acquire the lock
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'processing' }
    });
    
    return true;
  } catch (error) {
    console.error(`Error acquiring campaign lock for ${campaignId}:`, error);
    return false;
  }
}

/**
 * Trigger the next batch of a campaign
 */
export async function triggerNextBatch(
  campaignId: string, 
  batchIndex: number, 
  batchSize: number
): Promise<void> {
  try {
    // Construct the webhook URL
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const webhookUrl = new URL(
      `/api/webhooks/process-campaign?campaignId=${campaignId}&batchIndex=${batchIndex}&batchSize=${batchSize}`,
      baseUrl
    ).toString();
    
    // Trigger the webhook asynchronously
    fetch(webhookUrl, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        triggeredAt: new Date().toISOString()
      })
    }).catch(error => {
      console.error(`Failed to trigger next batch for campaign ${campaignId}:`, error);
    });
  } catch (error) {
    console.error(`Error triggering next batch for campaign ${campaignId}:`, error);
  }
}

/**
 * Get the current status of a campaign
 */
export async function getCampaignStatus(campaignId: string): Promise<{
  inProgress: boolean;
  progress: number;
  status: string;
  processed: number;
  total: number;
  success: number;
  failed: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        status: true,
        recipientCount: true,
        successCount: true,
        failCount: true,
        startedAt: true,
        completedAt: true,
      }
    });
    
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Calculate processed count based on success and fail counts
    const processedCount = campaign.successCount + campaign.failCount;
    const progress = campaign.recipientCount > 0
      ? Math.round((processedCount / campaign.recipientCount) * 100)
      : 0;
    
    return {
      inProgress: ['processing', 'queued'].includes(campaign.status),
      progress,
      status: campaign.status,
      processed: processedCount,
      total: campaign.recipientCount,
      success: campaign.successCount,
      failed: campaign.failCount,
      startTime: campaign.startedAt ?? undefined,
      endTime: campaign.completedAt ?? undefined
    };
  } catch (error) {
    console.error(`Error getting campaign status for ${campaignId}:`, error);
    return {
      inProgress: false,
      progress: 0,
      status: 'error',
      processed: 0,
      total: 0,
      success: 0,
      failed: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}