// app/api/email/process-next/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmailWithRetry, getNextAvailableSmtp, triggerProcessBatch } from "@/lib/queue";

export const maxDuration = 60; // 60 seconds max duration

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Await the params promise to get the actual parameters
  const { id: campaignId } = await params;
  
  try {
    console.log(`Manual processing request for campaign ${campaignId}`);
    
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      include: { 
        template: true
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Only process campaigns that are in processing status or stalled
    const isStalled = campaign.status === 'processing' && 
                     campaign.lastProcessedAt && 
                     (new Date().getTime() - new Date(campaign.lastProcessedAt).getTime() > 5 * 60 * 1000);
    
    if (campaign.status !== 'processing' && !isStalled) {
      return NextResponse.json({ 
        error: `Campaign is in ${campaign.status} status, not processing` 
      }, { status: 400 });
    }
    
    // Ensure campaign is in processing status
    if (campaign.status !== 'processing') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'processing',
          lastProcessedAt: new Date(),
        },
      });
    }
    
    // Get next batch of recipients
    const recipients = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Found ${recipients.length} pending recipients to process manually`);
    
    if (recipients.length === 0) {
      // No more recipients to process
      // Finalize campaign
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'sent',
          completedAt: new Date(),
        },
      });
      
      return NextResponse.json({ 
        message: "Campaign completed - no more recipients to process" 
      });
    }
    
    // Get SMTP config
    const smtpConfig = await getNextAvailableSmtp(session.user.id);
    
    if (!smtpConfig) {
      return NextResponse.json({ error: "No SMTP configuration available" }, { status: 400 });
    }
    
    // Process this batch
    const results = [];
    
    for (const recipient of recipients) {
      console.log(`Manually sending to ${recipient.email}`);
      const result = await sendEmailWithRetry(campaign, smtpConfig, recipient);
      results.push({
        email: recipient.email,
        success: result.success,
        error: result.error,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`Manual processing results: ${successCount} succeeded, ${failCount} failed`);
    
    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        successCount: { increment: successCount },
        failCount: { increment: failCount },
        processedCount: { increment: successCount + failCount },
        lastProcessedAt: new Date(),
      },
    });
    
    // Check if campaign is complete
    const pendingCount = await prisma.recipient.count({
      where: {
        campaignId,
        status: 'pending',
      },
    });
    
    if (pendingCount === 0) {
      // Finalize campaign
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'sent',
          completedAt: new Date(),
        },
      });
      
      return NextResponse.json({ 
        message: "Batch processed and campaign completed",
        results,
      });
    }
    
    // Trigger next batch using webhook
    await triggerProcessBatch(campaignId, 0);
    
    return NextResponse.json({ 
      message: "Batch processed successfully, next batch triggered",
      results,
      remainingCount: pendingCount,
    });
  } catch (error) {
    console.error("Error processing campaign batch:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}