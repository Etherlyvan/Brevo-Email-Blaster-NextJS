// app/api/webhooks/proceess-campaign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  sendEmailWithRetry, 
  finalizeCampaign, 
  acquireCampaignLock, 
  triggerNextBatch,
  getNextAvailableSmtp
} from "@/lib/queue";

// Set maximum execution duration (60 seconds for Pro plans)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Parse query parameters
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaignId');
  const batchIndex = parseInt(url.searchParams.get('batchIndex') ?? '0');
  const batchSize = parseInt(url.searchParams.get('batchSize') ?? '20');
  
  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }
  
  try {
    // Try to acquire a lock on the campaign to prevent concurrent processing
    const lockAcquired = await acquireCampaignLock(campaignId);
    
    if (!lockAcquired) {
      return NextResponse.json({ 
        success: false, 
        message: "Campaign is already being processed or completed" 
      });
    }
    
    // Get campaign data
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
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Update campaign status to processing if it's not already
    if (campaign.status !== 'processing') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'processing',
          startedAt: campaign.startedAt || new Date()
        },
      });
    }
    
    // Get recipients for this batch
    const recipients = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      take: batchSize,
      skip: batchIndex * batchSize,
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    if (recipients.length === 0) {
      // No more recipients to process, finalize the campaign
      await finalizeCampaign(campaignId);
      return NextResponse.json({ 
        success: true, 
        message: "Campaign completed" 
      });
    }
    
    // Process this batch
    let successCount = 0;
    let failCount = 0;
    
    for (const recipient of recipients) {
      try {
        // Get next available SMTP config
        const smtpConfig = await getNextAvailableSmtp(campaign.user.id);
        
        if (!smtpConfig) {
          // No SMTP configs available
          throw new Error("No SMTP configurations available");
        }
        
        // Send email with retry logic
        const result = await sendEmailWithRetry(campaign, smtpConfig, recipient);
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        failCount++;
        
        // Update recipient as failed
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
      }
      
      // Check if we're approaching the timeout limit (leave 5 seconds buffer)
      if (Date.now() - new Date().getTime() > 55000) {
        break;
      }
    }
    
    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        successCount: { increment: successCount },
        failCount: { increment: failCount },
      },
    });
    
    // Check if there are more recipients to process
    const remainingCount = await prisma.recipient.count({
      where: {
        campaignId,
        status: 'pending',
      },
    });
    
    // Prepare response object
    const responseData = {
      success: true,
      processed: successCount + failCount,
      successCount: successCount,
      failedCount: failCount,
      remaining: remainingCount
    };
    
    if (remainingCount > 0) {
      // Schedule the next batch
      triggerNextBatch(campaignId, batchIndex + 1, batchSize);
      
      return NextResponse.json({
        ...responseData,
        nextBatch: batchIndex + 1
      });
    } else {
      // No more recipients, finalize the campaign
      await finalizeCampaign(campaignId);
      
      return NextResponse.json({
        ...responseData,
        message: "Campaign completed"
      });
    }
  } catch (error) {
    console.error(`Error processing campaign batch:`, error);
    
    // Update campaign with error information if possible
    if (campaignId) {
      try {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'failed',
          }
        });
      } catch (updateError) {
        console.error("Error updating campaign status:", updateError);
      }
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}