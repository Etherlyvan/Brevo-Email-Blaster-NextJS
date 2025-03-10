// app/api/email/stalled/route.ts
import {  NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get stalled campaigns (no activity for more than 5 minutes)
    const stalledCampaigns = await prisma.campaign.findMany({
      where: {
        userId: session.user.id,
        status: 'processing',
        lastProcessedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        lastProcessedAt: 'asc', // Show oldest first
      },
    });
    
    return NextResponse.json(stalledCampaigns);
  } catch (error) {
    console.error("Error fetching stalled campaigns:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch stalled campaigns" 
    }, { status: 500 });
  }
}