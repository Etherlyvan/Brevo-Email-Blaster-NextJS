// app/api/email/status/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await params untuk mendapatkan id
    const { id: campaignId } = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`Fetching status for campaign ${campaignId}`);
    
    // Check if campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        recipientCount: true,
        processedCount: true,
        successCount: true,
        failCount: true,
        openCount: true,
        clickCount: true,
        startedAt: true,
        completedAt: true,
        lastProcessedAt: true,
        lastError: true,
        isScheduled: true,
        scheduledFor: true,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Calculate progress percentage
    const progress = campaign.recipientCount > 0
      ? Math.round((campaign.processedCount / campaign.recipientCount) * 100)
      : 0;
    
    // Get recent errors for better debugging
    const recentErrors = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'failed',
      },
      select: {
        email: true,
        errorMessage: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    });
    
    // Check if campaign is stalled (no activity for more than 5 minutes)
    const isStalled = campaign.status === 'processing' && 
                     campaign.lastProcessedAt && 
                     (new Date().getTime() - new Date(campaign.lastProcessedAt).getTime() > 5 * 60 * 1000);
    
    // Check for stuck campaigns - in processing state but no activity for a long time
    if (isStalled && process.env.NODE_ENV === 'development') {
      console.log(`Campaign ${campaignId} appears to be stalled - last activity at ${campaign.lastProcessedAt}`);
    }
    
    return NextResponse.json({
      campaign,
      progress,
      isStalled,
      recentErrors,
      inProgress: campaign.status === 'processing' || campaign.status === 'queued',
      isComplete: ['sent', 'failed', 'partial'].includes(campaign.status),
    });
  } catch (error) {
    console.error("Error fetching campaign status:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch campaign status" 
    }, { status: 500 });
  }
}