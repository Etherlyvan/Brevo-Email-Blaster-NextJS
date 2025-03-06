// app/api/analytics/detail/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
    // Verify the campaign belongs to the user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Get all logs for the campaign
    const logs = await prisma.emailLog.findMany({
      where: {
        campaignId,
      },
      select: {
        status: true,
        openedAt: true,
        clickedAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });
    
    // Extract device information from user agent
    const deviceStats = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      other: 0,
    };
    
    logs.forEach(log => {
      if (!log.userAgent) {
        return;
      }
      
      const userAgent = log.userAgent.toLowerCase();
      
      if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        deviceStats.mobile++;
      } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
        deviceStats.tablet++;
      } else if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
        deviceStats.desktop++;
      } else {
        deviceStats.other++;
      }
    });
    
    // Extract location data (simplified, normally would use GeoIP)
    const locations: Record<string, number> = {};
    
    logs.forEach(log => {
      if (!log.ipAddress) {
        return;
      }
      
      // This is a simplified example - in a real app you would use a GeoIP service
      // Here we'll just use the first part of the IP as a "location"
      const location = log.ipAddress.split('.')[0] + '.*.*.*';
      locations[location] = (locations[location] || 0) + 1;
    });
    
    const topLocations = Object.entries(locations)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate hourly activity
    const hourlyData: Record<number, { opens: number; clicks: number }> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { opens: 0, clicks: 0 };
    }
    
    logs.forEach(log => {
      if (log.openedAt) {
        const hour = new Date(log.openedAt).getHours();
        hourlyData[hour].opens++;
      }
      
      if (log.clickedAt) {
        const hour = new Date(log.clickedAt).getHours();
        hourlyData[hour].clicks++;
      }
    });
    
    // Convert to array format for easier frontend consumption
    const hourlyDataArray = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      opens: data.opens,
      clicks: data.clicks,
    }));
    
    return NextResponse.json({
      deviceStats,
      topLocations,
      hourlyData: hourlyDataArray,
    });
  } catch (error) {
    console.error("Error fetching analytics detail:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch analytics details" 
    }, { status: 500 });
  }
}