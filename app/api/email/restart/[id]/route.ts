// app/api/email/restart/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { triggerProcessBatch } from "@/lib/queue";

export const maxDuration = 30; // 30 seconds max duration

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
    console.log(`Restarting campaign ${campaignId}`);
    
    // Check if campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Only restart campaigns that are in 'processing' status or have failed
    if (!['processing', 'failed', 'partial'].includes(campaign.status)) {
      return NextResponse.json({ 
        error: `Cannot restart campaign with status '${campaign.status}'` 
      }, { status: 400 });
    }
    
    // Check if there are any pending recipients
    const pendingCount = await prisma.recipient.count({
      where: {
        campaignId,
        status: 'pending',
      },
    });
    
    if (pendingCount === 0) {
      return NextResponse.json({ 
        error: "No pending recipients to process" 
      }, { status: 400 });
    }
    
    // Reset campaign to processing status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'processing',
        lastProcessedAt: new Date(),
        lastError: null,
      },
    });
    
    console.log(`Campaign ${campaignId} set to processing status, triggering batch processing`);
    
    // Restart campaign processing using webhook
    await triggerProcessBatch(campaignId, 0);
    
    return NextResponse.json({
      success: true,
      message: "Campaign processing restarted",
      pendingCount,
    });
  } catch (error) {
    console.error("Error restarting campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to restart campaign" 
    }, { status: 500 });
  }
}