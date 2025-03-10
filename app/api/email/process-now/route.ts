// app/api/email/process-now/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startCampaignProcessing } from "@/lib/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { id: campaignId } = params;
  
  try {
    console.log(`Processing campaign ${campaignId} now`);
    
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Only process if the campaign is in a valid state
    if (!['draft', 'queued', 'processing'].includes(campaign.status)) {
      return NextResponse.json({ 
        error: `Cannot process campaign with status '${campaign.status}'` 
      }, { status: 400 });
    }
    
    // Update campaign to processing status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'processing',
        startedAt: campaign.startedAt || new Date(),
        lastProcessedAt: new Date(),
      },
    });
    
    // Start processing
    const success = await startCampaignProcessing(campaignId);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to start campaign processing" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Campaign processing started",
    });
  } catch (error) {
    console.error("Error processing campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to process campaign" 
    }, { status: 500 });
  }
}