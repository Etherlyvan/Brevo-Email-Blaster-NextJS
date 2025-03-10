// lib/queue.ts
import { Campaign, SmtpConfig, Recipient, EmailTemplate } from '@prisma/client';
import { createSmtpTransport, replaceTemplateParams, sanitizeEmail } from './email';
import { prisma } from './db';


/**
 * Send email with retry logic
 */
export async function sendEmailWithRetry(
  campaign: Campaign & { template: EmailTemplate },
  smtpConfig: SmtpConfig,
  recipient: Recipient,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Sending email to ${recipient.email}, attempt ${attempt}/${maxRetries}`);
      
      // Add delay for rate limiting in production
      if (process.env.NODE_ENV === 'production') {
        const sentCount = await prisma.emailLog.count({
          where: {
            smtpConfigId: smtpConfig.id,
            status: 'sent',
            sentAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // Since beginning of day
            },
          },
        });
        
        // Add progressive delay based on sent count
        if (sentCount > 100) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
        } else if (sentCount > 50) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second
        }
      }
      
      // Create transporter with timeout options
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
      const personalizedHtml = replaceTemplateParams(
        campaign.template.htmlContent,
        recipientParams
      );
      
      const personalizedSubject = replaceTemplateParams(
        campaign.template.subject,
        recipientParams
      );
      
      // Sanitize email addresses
      const sanitizedFromEmail = sanitizeEmail(smtpConfig.fromEmail);
      const sanitizedToEmail = sanitizeEmail(recipient.email);
      
      // Add tracking pixel if the base URL is available
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const trackingPixel = `<img src="${baseUrl}/api/track/open?c=${campaign.id}&r=${recipient.id}" width="1" height="1" alt="" style="display:none;" />`;
      
      // Add tracking to links
      let htmlWithTracking = personalizedHtml;
      
      // Add tracking pixel before closing body tag or at the end if no body tag
      if (htmlWithTracking.includes('</body>')) {
        htmlWithTracking = htmlWithTracking.replace('</body>', `${trackingPixel}</body>`);
      } else {
        htmlWithTracking = htmlWithTracking + trackingPixel;
      }
      
      // Process links to add click tracking
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi;
      htmlWithTracking = htmlWithTracking.replace(linkRegex, (match, url, rest) => {
        if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
          // Don't track anchor links or mailto/tel links
          return match;
        }
        
        const trackingUrl = `${baseUrl}/api/track/click?c=${campaign.id}&r=${recipient.id}&url=${encodeURIComponent(url)}`;
        return `<a href="${trackingUrl}"${rest}>`;
      });
      
      // Define a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timed out')), 15000);
      });
      
      // Send email with timeout
      const sendPromise = transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${sanitizedFromEmail}>`,
        to: sanitizedToEmail,
        subject: personalizedSubject,
        html: htmlWithTracking,
      });
      
      // Use Promise.race to implement timeout
      await Promise.race([sendPromise, timeoutPromise]);
      
      console.log(`Email successfully sent to ${recipient.email}`);
      
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
      console.error(`Attempt ${attempt} failed for recipient ${recipient.id}:`, error);
      
      // Check if this is a rate limiting error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimitError = errorMessage.toLowerCase().includes('rate') || 
                             errorMessage.toLowerCase().includes('limit') ||
                             errorMessage.toLowerCase().includes('421');
      
      // If this is the last attempt or it's not a rate limiting error
      if (attempt >= maxRetries || !isRateLimitError) {
        console.log(`Failed to send email to ${recipient.email} after ${attempt} attempts, marking as failed`);
        
        // Update recipient status as failed
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { 
            status: 'failed',
            errorMessage: errorMessage,
            retryCount: { increment: 1 },
          },
        });
        
        // Log failure in analytics
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            smtpConfigId: smtpConfig.id,
            status: 'failed',
            errorMessage: errorMessage,
            sentAt: new Date(),
          },
        });
        
        return { 
          success: false, 
          error: errorMessage
        };
      }
      
      // For rate limiting, use exponential backoff
      if (isRateLimitError) {
        // Use more aggressive backoff in production
        const delay = process.env.NODE_ENV === 'production'
          ? Math.pow(2, attempt + 1) * 1000 // Longer in production
          : Math.pow(2, attempt) * 1000;
        
        console.log(`Rate limiting detected, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Update SMTP usage counter on the last attempt
        if (isRateLimitError && process.env.NODE_ENV === 'production' && attempt === maxRetries - 1) {
          await prisma.smtpConfig.update({
            where: { id: smtpConfig.id },
            data: {
              usedToday: { increment: 1 }
            },
          });
        }
      } else {
        // For other errors, wait a shorter time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // This should never be reached due to the return in the catch block
  return { success: false, error: 'Maximum retries exceeded' };
}

/**
 * Get next available SMTP config
 */
export async function getNextAvailableSmtp(userId: string): Promise<SmtpConfig | null> {
  console.log(`Finding available SMTP config for user ${userId}`);
  
  try {
    // Get all SMTP configs for the user, with smart ordering
    const availableConfigs = await prisma.smtpConfig.findMany({
      where: {
        userId,
      },
      orderBy: [
        // Prioritize configs with daily quota remaining
        {
          usedToday: 'asc',
        },
        // Then by last used timestamp (null values first)
        { 
          lastUsed: 'asc' 
        }
      ],
    });
    
    if (availableConfigs.length === 0) {
      console.log('No SMTP configurations found');
      return null;
    }
    
    // Find a config that hasn't exceeded its daily quota
    for (const config of availableConfigs) {
      // Check if quota reset is needed (new day)
      if (config.lastQuotaReset) {
        const lastResetDate = new Date(config.lastQuotaReset);
        const currentDate = new Date();
        
        // If last reset was yesterday or earlier, reset the counter
        if (lastResetDate.getDate() !== currentDate.getDate() || 
            lastResetDate.getMonth() !== currentDate.getMonth() || 
            lastResetDate.getFullYear() !== currentDate.getFullYear()) {
          
          await prisma.smtpConfig.update({
            where: { id: config.id },
            data: {
              usedToday: 0,
              lastQuotaReset: currentDate
            }
          });
          
          // Reset the local value too
          config.usedToday = 0;
        }
      }
      
      // Check if this config has quota available
      if (config.usedToday < config.dailyQuota) {
        // Update the selected config's usage data
        const updatedConfig = await prisma.smtpConfig.update({
          where: { id: config.id },
          data: {
            lastUsed: new Date(),
            usedToday: { increment: 1 }
          }
        });
        
        console.log(`Selected SMTP config: ${updatedConfig.name} (${updatedConfig.host})`);
        return updatedConfig;
      }
    }
    
    // If all configs have reached their quota
    console.log('All SMTP configurations have reached their daily quota');
    return null;
  } catch (error) {
    console.error('Error selecting SMTP config:', error);
    return null;
  }
}

/**
 * Acquire a lock on a campaign to prevent concurrent processing
 */
export async function acquireCampaignLock(campaignId: string): Promise<boolean> {
  try {
    // Use a transaction to ensure atomic operations
    return await prisma.$transaction(async (tx) => {
      // Try to get the campaign with up-to-date information
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { 
          id: true, 
          status: true,
          lastProcessedAt: true
        }
      });
      
      if (!campaign) {
        return false;
      }
      
      // Check if the campaign is already being processed
      if (campaign.status === 'processing') {
        // Check if it's stalled (no activity for more than 5 minutes)
        const isStalled = campaign.lastProcessedAt &&
          (Date.now() - new Date(campaign.lastProcessedAt).getTime() > 5 * 60 * 1000);
        
        if (!isStalled) {
          // Campaign is actively being processed by another function
          return false;
        }
      } else if (!['draft', 'queued', 'processing', 'failed'].includes(campaign.status)) {
        // Campaign is in a state that shouldn't be processed
        return false;
      }
      
      // Update the lastProcessedAt timestamp to claim the lock
      await tx.campaign.update({
        where: { id: campaignId },
        data: { 
          lastProcessedAt: new Date(),
          // If campaign was in failed state, move it back to processing
          status: campaign.status === 'failed' ? 'processing' : campaign.status
        }
      });
      
      return true;
    }, {
      timeout: 5000, // 5 second timeout for the transaction
      isolationLevel: 'Serializable' // Highest isolation level for locking
    });
  } catch (error) {
    console.error(`Error acquiring lock for campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Start campaign processing
 */
export async function startCampaignProcessing(campaignId: string): Promise<boolean> {
  try {
    console.log(`Starting campaign processing for campaign ${campaignId}`);
    
    // Get campaign data to check if it's valid for processing
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { 
        template: true,
        user: {
          select: { id: true }
        }
      },
    });
    
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return false;
    }
    
    // Only process campaigns in draft, queued, or processing status
    if (!['draft', 'queued', 'processing'].includes(campaign.status)) {
      console.log(`Campaign ${campaignId} is in ${campaign.status} status, cannot process`);
      return false;
    }
    
    // Update campaign to processing status if not already
    if (campaign.status !== 'processing') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'processing',
          startedAt: campaign.startedAt || new Date(),
          lastProcessedAt: new Date()
        },
      });
    }
    
    // Trigger webhook for processing
    const webhookTriggered = await triggerProcessBatch(campaignId, 0);
    
    // Also try direct processing as a fallback
    if (!webhookTriggered) {
      console.log(`Webhook trigger failed, attempting direct processing for campaign ${campaignId}`);
      try {
        await processBatchDirect(campaignId, 0);
      } catch (directError) {
        console.warn(`Direct processing attempt failed: ${directError}`);
        // Continue even if direct processing fails, as webhook should handle it
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error starting campaign ${campaignId}:`, error);
    return false;
  }
}


/**
 * Check if campaign is completed
 */
export async function isCampaignCompleted(campaignId: string): Promise<boolean> {
  try {
    const [totalCount, processedCount] = await Promise.all([
      prisma.recipient.count({
        where: { campaignId },
      }),
      prisma.recipient.count({
        where: {
          campaignId,
          status: { in: ['sent', 'failed'] },
        },
      }),
    ]);
    
    return totalCount === processedCount;
  } catch (error) {
    console.error(`Error checking if campaign ${campaignId} is completed:`, error);
    return false;
  }
}

/**
 * Finalize campaign after all emails processed
 */
export async function finalizeCampaign(campaignId: string): Promise<boolean> {
  try {
    console.log(`Finalizing campaign ${campaignId}`);
    
    // Get counts
    const [totalCount, sentCount, failedCount] = await Promise.all([
      prisma.recipient.count({
        where: { campaignId },
      }),
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
        processedCount: sentCount + failedCount,
      },
    });
    
    console.log(`Campaign ${campaignId} finalized with status: ${finalStatus}`);
    console.log(`Results: ${sentCount} sent, ${failedCount} failed, ${totalCount} total`);
    
    return true;
  } catch (error) {
    console.error(`Error finalizing campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Process batch directly (without webhook)
 * Useful for development environment or manual processing
 */
export async function processBatchDirect(campaignId: string, batchIndex: number): Promise<boolean> {
  try {
    console.log(`Directly processing batch ${batchIndex} for campaign ${campaignId}`);
    
    // Check campaign status
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { 
        template: true,
        user: {
          select: { id: true }
        }
      },
    });
    
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return false;
    }
    
    // Update last processed timestamp
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        lastProcessedAt: new Date(),
        status: campaign.status === 'draft' || campaign.status === 'queued' 
          ? 'processing' 
          : campaign.status
      }
    });
    
    // Define timeout to ensure we don't exceed function limits
    const startTime = Date.now();
    const timeoutMs = 50000; // 50 seconds to be safe
    
    // Smaller batch size for direct processing
    const DIRECT_BATCH_SIZE = 5;
    
    // Get batch of recipients that haven't been processed
    const recipients = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      take: DIRECT_BATCH_SIZE,
      orderBy: { createdAt: 'asc' }
    });
    
    // If no more recipients to process
    if (recipients.length === 0) {
      const isCompleted = await isCampaignCompleted(campaignId);
      if (isCompleted) {
        // Finalize campaign if all recipients have been processed
        await finalizeCampaign(campaignId);
        return true;
      }
      return false;
    }
    
    // Get an available SMTP config
    const smtpConfig = await getNextAvailableSmtp(campaign.user.id);
    
    if (!smtpConfig) {
      throw new Error('No SMTP configuration available');
    }
    
    // Send email to each recipient in the batch
    const results = [];
    for (const recipient of recipients) {
      // Check if we're approaching the timeout
      if (Date.now() - startTime > timeoutMs) {
        console.log(`Approaching timeout limit after processing ${results.length} recipients`);
        break;
      }
      
      const result = await sendEmailWithRetry(campaign, smtpConfig, recipient);
      results.push({
        recipientId: recipient.id,
        email: recipient.email,
        success: result.success,
        error: result.error
      });
      
      // Add small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Calculate statistics
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    // Update campaign statistics
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        successCount: { increment: successCount },
        failCount: { increment: failCount },
        processedCount: { increment: successCount + failCount },
      },
    });
    
    // Check if campaign is complete
    const isCompleted = await isCampaignCompleted(campaignId);
    
    if (isCompleted) {
      // Finalize campaign
      await finalizeCampaign(campaignId);
    } else {
      // Process next batch with a delay
      setTimeout(() => {
        processBatchDirect(campaignId, batchIndex + 1).catch(err => {
          console.error(`Error processing next batch: ${err}`);
        });
      }, 1000);
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing batch ${batchIndex} for campaign ${campaignId}:`, error);
    
    // Update campaign with error
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        lastError: error instanceof Error ? error.message : 'Unknown error'
      },
    });
    
    return false;
  }
}


// lib/queue.ts (tambahkan fungsi ini)

/**
 * Fungsi untuk memeriksa dan memulai ulang webhook
 * Berguna untuk Vercel Hobby Plan yang tidak mendukung cron jobs
 */
export async function checkAndResumeWebhooks() {
  // Cek kampanye yang sedang berjalan tapi tidak ada aktivitas selama 5 menit
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      status: 'processing',
      lastProcessedAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 menit yang lalu
      },
    },
    select: {
      id: true,
      nextBatchIndex: true,
    },
  });
  
  // Restart webhook untuk kampanye yang aktif
  for (const campaign of activeCampaigns) {
    await triggerProcessBatch(campaign.id, campaign.nextBatchIndex || 0);
  }
}

/**
 * Modifikasi triggerProcessBatch untuk lebih tahan terhadap kegagalan
 */
export async function triggerProcessBatch(campaignId: string, batchIndex: number): Promise<boolean> {
  try {
    // Gunakan URL absolut untuk webhook
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/process-campaign`;
    
    console.log(`Triggering batch ${batchIndex} for campaign ${campaignId} at ${webhookUrl}`);
    
    // Tambahkan header dan timeout yang sesuai
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BrevoEmailApp/1.0',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
        body: JSON.stringify({
          campaignId,
          batchIndex,
          secret: process.env.WEBHOOK_SECRET,
          timestamp: Date.now() // Add timestamp to prevent caching
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log status response untuk debugging
      console.log(`Webhook response status: ${response.status}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.warn(`Webhook responded with non-OK status: ${response.status}, body: ${responseText}`);
        
        // For Vercel Hobby Plan: If webhook fails, try direct processing
        try {
          await processBatchDirect(campaignId, batchIndex);
          console.log(`Direct processing successful for campaign ${campaignId} batch ${batchIndex}`);
          return true;
        } catch (directError) {
          console.error(`Direct processing failed: ${directError}`);
          return false;
        }
      }
      
      return true;
    } catch (fetchError) {
      console.error(`Error calling webhook: ${fetchError}`);
      clearTimeout(timeoutId);
      
      // For Vercel Hobby Plan: If webhook fails, try direct processing
      try {
        await processBatchDirect(campaignId, batchIndex);
        console.log(`Direct processing successful after webhook failure for campaign ${campaignId}`);
        return true;
      } catch (directError) {
        console.error(`Direct processing failed: ${directError}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`Error triggering batch processing for campaign ${campaignId}:`, error);
    return false;
  }
}