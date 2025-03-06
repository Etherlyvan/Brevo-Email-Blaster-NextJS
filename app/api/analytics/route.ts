// app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Parse query parameters
  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? '30d'; // Changed || to ?? here
  const campaignId = url.searchParams.get('campaignId');
  
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  try {
    // Base query conditions
    const baseWhere = {
      userId: session.user.id,
      createdAt: {
        gte: startDate,
      },
      ...(campaignId ? { id: campaignId } : {}),
    };
    
    // Get campaign stats
    const campaigns = await prisma.campaign.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
        status: true,
        recipientCount: true,
        successCount: true,
        failCount: true,
        openCount: true,
        clickCount: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Calculate overall stats
    const totalStats = campaigns.reduce((acc, campaign) => {
      acc.sent += campaign.successCount;
      acc.failed += campaign.failCount;
      acc.opened += campaign.openCount;
      acc.clicked += campaign.clickCount;
      acc.total += campaign.recipientCount;
      return acc;
    }, { sent: 0, failed: 0, opened: 0, clicked: 0, total: 0 });
    
    // Calculate rates
    const rates = {
      deliveryRate: totalStats.total > 0 ? (totalStats.sent / totalStats.total) * 100 : 0,
      openRate: totalStats.sent > 0 ? (totalStats.opened / totalStats.sent) * 100 : 0,
      clickRate: totalStats.opened > 0 ? (totalStats.clicked / totalStats.opened) * 100 : 0,
    };
    
    // Get daily stats for chart
    const dailyStats = await getDailyStats(session.user.id, startDate, campaignId);
    
    // Get top performing campaigns
    const topCampaigns = [...campaigns]
      .sort((a, b) => {
        const aOpenRate = a.successCount > 0 ? (a.openCount / a.successCount) * 100 : 0;
        const bOpenRate = b.successCount > 0 ? (b.openCount / b.successCount) * 100 : 0;
        return bOpenRate - aOpenRate;
      })
      .slice(0, 5)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        openRate: campaign.successCount > 0 ? (campaign.openCount / campaign.successCount) * 100 : 0,
        clickRate: campaign.openCount > 0 ? (campaign.clickCount / campaign.openCount) * 100 : 0,
      }));
    
    return NextResponse.json({
      totalStats,
      rates,
      dailyStats,
      topCampaigns,
      campaigns: campaigns.map(campaign => ({
        ...campaign,
        openRate: campaign.successCount > 0 ? (campaign.openCount / campaign.successCount) * 100 : 0,
        clickRate: campaign.openCount > 0 ? (campaign.clickCount / campaign.openCount) * 100 : 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch analytics" 
    }, { status: 500 });
  }
}

/**
 * Get daily stats for charting
 */
async function getDailyStats(
  userId: string, 
  startDate: Date, 
  campaignId?: string | null
): Promise<Array<{
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}>> {
  // This is a simplified implementation - in a real app, we'd use SQL date functions
  // to group by day more efficiently
  
  // Get all events in the period
  const logs = await prisma.emailLog.findMany({
    where: {
      campaign: {
        userId,
        ...(campaignId ? { id: campaignId } : {}),
      },
      sentAt: {
        gte: startDate,
      },
    },
    select: {
      sentAt: true,
      openedAt: true,
      clickedAt: true,
      status: true,
    },
  });
  
  // Group by day
  const dailyMap = new Map<string, { sent: number; opened: number; clicked: number }>();
  
  // Generate all days in the period
  const now = new Date();
  const currentDate = new Date(startDate); // Changed from 'let' to 'const'
  
  while (currentDate <= now) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyMap.set(dateKey, { sent: 0, opened: 0, clicked: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Fill in the data
  logs.forEach(log => {
    const sentDate = log.sentAt.toISOString().split('T')[0];
    const stats = dailyMap.get(sentDate) || { sent: 0, opened: 0, clicked: 0 };
    
    if (log.status === 'sent' || log.status === 'opened' || log.status === 'clicked') {
      stats.sent++;
    }
    
    if (log.openedAt) {
      const openedDate = log.openedAt.toISOString().split('T')[0];
      const openStats = dailyMap.get(openedDate) || { sent: 0, opened: 0, clicked: 0 };
      openStats.opened++;
      dailyMap.set(openedDate, openStats);
    }
    
    if (log.clickedAt) {
      const clickedDate = log.clickedAt.toISOString().split('T')[0];
      const clickStats = dailyMap.get(clickedDate) || { sent: 0, opened: 0, clicked: 0 };
      clickStats.clicked++;
      dailyMap.set(clickedDate, clickStats);
    }
    
    dailyMap.set(sentDate, stats);
  });
  
  // Convert map to array
  return Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      ...stats,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}