// app/api/email/status/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getCampaignStatus } from "@/lib/queue";

export async function GET(
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
        successCount: true,
        failCount: true,
        openCount: true,
        clickCount: true,
        startedAt: true,
        completedAt: true,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Get real-time status
    const queueStatus = await getCampaignStatus(campaignId);
    
    // Get recent errors - without using updatedAt for ordering
    // Use createdAt instead, which should definitely be in the schema
    const recentErrors = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'failed',
      },
      select: {
        email: true,
        errorMessage: true,
      },
      take: 5,
      // Alternative approach - use a different field or remove the ordering
      orderBy: {
        createdAt: 'desc'
      },
    });
    
    return NextResponse.json({
      campaign,
      queue: queueStatus,
      recentErrors,
    });
  } catch (error) {
    console.error("Error fetching campaign status:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch campaign status" 
    }, { status: 500 });
  }
}