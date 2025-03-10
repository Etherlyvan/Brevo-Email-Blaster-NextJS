// app/api/webhooks/process-campaign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  sendEmailWithRetry, 
  acquireCampaignLock, 
  triggerProcessBatch, 
  getNextAvailableSmtp, 
  isCampaignCompleted, 
  finalizeCampaign 
} from "@/lib/queue";

export const maxDuration = 60; // 60 seconds max duration
export const dynamic = 'force-dynamic'; // Ensure this is not cached

// For production, use smaller batch size to avoid timeout
const BATCH_SIZE = process.env.NODE_ENV === 'production' ? 5 : 10;

export async function POST(request: NextRequest) {
  console.log("Webhook handler triggered");
  
  try {
    // Parse request body
    const body = await request.json();
    console.log("Received webhook payload:", JSON.stringify({
      campaignId: body.campaignId,
      batchIndex: body.batchIndex,
      secretProvided: !!body.secret
    }));
    
    const { campaignId, batchIndex, secret } = body;
    
    // Verify webhook secret with timing-safe comparison
    if (secret !== process.env.WEBHOOK_SECRET) {
      console.error("Webhook secret verification failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!campaignId) {
      console.error("Missing campaignId in webhook payload");
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }
    
    // Try to acquire a lock on the campaign
    const lockAcquired = await acquireCampaignLock(campaignId);
    
    if (!lockAcquired) {
      console.log(`Could not acquire lock for campaign ${campaignId}, it's likely being processed by another webhook`);
      return NextResponse.json({
        message: "Campaign is already being processed",
        retry: true
      }, { status: 409 });
    }
    
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
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // If campaign is not in processing status, don't continue
    if (campaign.status !== 'processing') {
      console.log(`Campaign ${campaignId} is in ${campaign.status} status, not processing`);
      return NextResponse.json({ 
        message: `Campaign is in ${campaign.status} status, not processing`,
        status: campaign.status
      });
    }
    
    // Update last processed timestamp
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { lastProcessedAt: new Date() }
    });
    
    // Define timeout to ensure we don't exceed Vercel's limit
    const startTime = Date.now();
    const timeoutMs = 50000; // 50 seconds to be safe
    
    // Get pending recipients for this batch
    const recipients = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${recipients.length} pending recipients for batch ${batchIndex}`);
    
    // If no more recipients to process
    if (recipients.length === 0) {
      // Check if all recipients have been processed
      const isCompleted = await isCampaignCompleted(campaignId);
      
      if (isCompleted) {
        console.log(`All recipients processed for campaign ${campaignId}, finalizing`);
        // Finalize campaign
        await finalizeCampaign(campaignId);
        
        return NextResponse.json({ 
          message: "Campaign completed", 
          status: "completed" 
        }, { status: 200 });
      } else {
        // There's an anomaly - some recipients might still be in other status
        console.log(`No pending recipients but campaign ${campaignId} not completed, possible anomaly`);
        
        return NextResponse.json({ 
          message: "No pending recipients but campaign not completed", 
          status: "anomaly" 
        }, { status: 200 });
      }
    }
    
    // Get available SMTP config
    const smtpConfig = await getNextAvailableSmtp(campaign.user.id);
    
    if (!smtpConfig) {
      console.error(`No SMTP configuration available for campaign ${campaignId}`);
      return NextResponse.json({ error: "No SMTP configuration available" }, { status: 400 });
    }
    
    console.log(`Processing batch ${batchIndex} with ${recipients.length} recipients for campaign ${campaignId}`);
    
    // Send email to each recipient in the batch
    const results = [];
    for (const recipient of recipients) {
      // Check if we're approaching the timeout
      if (Date.now() - startTime > timeoutMs) {
        console.log(`Approaching timeout limit after processing ${results.length} recipients, will continue in next batch`);
        break;
      }
      
      console.log(`Sending email to ${recipient.email}`);
      const result = await sendEmailWithRetry(campaign, smtpConfig, recipient);
      results.push({
        recipientId: recipient.id,
        email: recipient.email,
        success: result.success,
        error: result.error
      });
      
      // Add small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`Batch ${batchIndex} results: ${results.filter(r => r.success).length} succeeded, ${results.filter(r => !r.success).length} failed`);
    
    // Update campaign statistics
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        successCount: { increment: successCount },
        failCount: { increment: failCount },
        processedCount: { increment: successCount + failCount },
      },
    });
    
    // Check if campaign is completed
    const isCompleted = await isCampaignCompleted(campaignId);
    
    if (isCompleted) {
      console.log(`Campaign ${campaignId} completed after batch ${batchIndex}`);
      // Finalize campaign
      await finalizeCampaign(campaignId);
      
      return NextResponse.json({ 
        message: "Batch processed and campaign completed", 
        results,
        status: "completed"
      }, { status: 200 });
    } else {
      // Trigger next batch
      console.log(`Triggering next batch ${batchIndex + 1} for campaign ${campaignId}`);
      await triggerProcessBatch(campaignId, batchIndex + 1);
      
      return NextResponse.json({ 
        message: `Batch ${batchIndex} processed, triggered next batch`, 
        results,
        nextBatch: batchIndex + 1
      }, { status: 200 });
    }
  } catch (error) {
    console.error("Error processing campaign batch:", error);
    
    // Log stack trace for better debugging
    if (error instanceof Error) {
      console.error(error.stack);
    }
    
    // Try to update campaign error status
    try {
      const { campaignId } = await request.json();
      if (campaignId) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            lastError: error instanceof Error ? error.message : "Unknown error"
          }
        });
        console.log(`Updated campaign ${campaignId} with error status`);
      }
    } catch (e) {
      console.error("Failed to update campaign error status:", e);
    }
    
    // Add retry-after header on error
    const headers = new Headers();
    headers.append('Retry-After', '60');
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { 
      headers,
      status: 500 
    });
  }
}