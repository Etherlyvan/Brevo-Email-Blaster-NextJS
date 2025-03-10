// app/api/email/schedule/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startCampaignProcessing } from "@/lib/queue";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await params untuk mendapatkan id
    const { id: campaignId } = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await request.json();
    const { isScheduled, scheduledFor, sendImmediately } = data;
    
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Only allow updating schedule for draft, queued campaigns or already scheduled ones
    if (!['draft', 'queued'].includes(campaign.status) && !campaign.isScheduled) {
      return NextResponse.json({
        error: "Cannot update schedule for campaigns that are already processing or completed"
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate scheduled time if scheduling
    if (isScheduled && scheduledFor) {
      const scheduledTime = new Date(scheduledFor);
      const now = new Date();
      
      if (scheduledTime <= now) {
        return NextResponse.json({
          error: "Scheduled time must be in the future"
        }, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Create update data object with proper typing
    interface UpdateData {
      isScheduled: boolean;
      scheduledFor: Date | null;
      status?: string;
    }
    
    // Prepare update data
    const updateData: UpdateData = {
      isScheduled,
      scheduledFor: isScheduled ? new Date(scheduledFor) : null,
    };
    
    // If scheduling, set status to queued
    if (isScheduled) {
      updateData.status = 'queued';
    }
    
    // Update campaign
    await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });
    
    // Handle immediate sending
    if (!isScheduled && sendImmediately) {
      // Update status to processing
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });
      
      // Start processing
      await startCampaignProcessing(campaignId);
    }
    
    // Create response message based on conditions
    let responseMessage: string;
    
    if (isScheduled) {
      responseMessage = `Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}`;
    } else if (sendImmediately) {
      responseMessage = "Campaign processing started";
    } else {
      responseMessage = "Campaign saved as draft";
    }
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error updating campaign schedule:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update campaign schedule" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await params untuk mendapatkan id
    const { id: campaignId } = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get campaign scheduling details
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        isScheduled: true,
        scheduledFor: true,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      isScheduled: campaign.isScheduled,
      scheduledFor: campaign.scheduledFor,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching campaign schedule:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch campaign schedule" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}