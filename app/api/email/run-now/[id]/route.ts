// app/api/email/run-now/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startCampaignProcessing } from "@/lib/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("Run Now API called with params:", params);
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { id: campaignId } = params;
  
  try {
    // Log untuk debugging
    const bodyText = await request.text();
    console.log(`Running scheduled campaign ${campaignId} now. Request body:`, bodyText || "No body");
    
    // Check if campaign exists, is scheduled, and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
        isScheduled: true,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Scheduled campaign not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update campaign to start now
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        isScheduled: false,
        status: 'processing',
        startedAt: new Date(),
      },
    });
    
    // Start campaign processing
    const success = await startCampaignProcessing(campaignId);
    
    if (!success) {
      throw new Error("Failed to start campaign processing");
    }
    
    return NextResponse.json({
      success: true,
      message: "Campaign started successfully",
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error running scheduled campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to run campaign" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}