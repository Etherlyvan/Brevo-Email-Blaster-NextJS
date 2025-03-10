// app/api/email/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { id: campaignId } = params;
  
  try {
    // Check if campaign exists and belongs to user
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
    
    // Check if campaign can be deleted
    if (campaign.status === 'processing') {
      return NextResponse.json({ 
        error: "Cannot delete a campaign that is currently processing" 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete campaign
    await prisma.campaign.delete({
      where: { id: campaignId },
    });
    
    return NextResponse.json({ 
      success: true,
      message: "Campaign deleted successfully" 
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete campaign" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { id: campaignId } = params;
  
  try {
    // Get campaign details
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      include: {
        template: true,
        smtpConfig: {
          select: {
            id: true,
            name: true,
            host: true,
            fromEmail: true,
            fromName: true,
          },
        },
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return NextResponse.json(campaign, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch campaign" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}