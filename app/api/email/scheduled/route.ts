// app/api/email/scheduled/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get all scheduled campaigns for the user
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        userId: session.user.id,
        isScheduled: true,
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
    
    // Serialize dates for consistent representation
    const serializedCampaigns = scheduledCampaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      recipientCount: campaign.recipientCount,
      scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
      template: {
        name: campaign.template.name,
      },
    }));
    
    return NextResponse.json(serializedCampaigns, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching scheduled campaigns:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch scheduled campaigns" 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}