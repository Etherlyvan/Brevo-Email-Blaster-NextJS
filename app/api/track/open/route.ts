// app/api/track/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get campaign and recipient IDs from query parameters
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('c');
  const recipientId = searchParams.get('r');
  
  // If parameters are missing, return a transparent pixel anyway
  // This ensures tracking pixel always returns an image even if tracking fails
  if (!campaignId || !recipientId) {
    return getTrackingPixel();
  }
  
  try {
    // Get user agent and IP for analytics
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';
    
    // Record the open event asynchronously (don't await)
    recordOpenEvent(campaignId, recipientId, userAgent, ip).catch(error => {
      console.error('Error recording email open:', error);
    });
  } catch (error) {
    console.error('Error processing tracking pixel:', error);
  }
  
  // Always return a transparent pixel regardless of tracking success
  return getTrackingPixel();
}

// Helper function to return a transparent 1x1 GIF
function getTrackingPixel() {
  // This is a transparent 1x1 pixel GIF
  const TRANSPARENT_GIF_BUFFER = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Record email open event in database
async function recordOpenEvent(
  campaignId: string, 
  recipientId: string, 
  userAgent: string,
  ip: string
) {
  try {
    // First check if the recipient exists to avoid errors
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId }
    });
    
    if (!recipient || recipient.campaignId !== campaignId) {
      console.warn(`Invalid tracking parameters: recipient ${recipientId} doesn't match campaign ${campaignId}`);
      return false;
    }
    
    // Try to update campaign in a single transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update campaign open count
      await tx.campaign.update({
        where: { id: campaignId },
        data: { openCount: { increment: 1 } },
      });
      
      // Find existing log or create new one
      const existingLog = await tx.emailLog.findFirst({
        where: {
          campaignId,
          recipientId,
        },
      });
      
      if (existingLog) {
        // Update existing log
        await tx.emailLog.update({
          where: { id: existingLog.id },
          data: {
            openedAt: new Date(),
            userAgent,
            ipAddress: ip,
            status: existingLog.status === 'sent' ? 'opened' : existingLog.status,
          },
        });
      } else {
        // Get SMTP config from campaign
        const campaign = await tx.campaign.findUnique({
          where: { id: campaignId },
          select: { smtpConfigId: true },
        });
        
        if (!campaign?.smtpConfigId) {
          throw new Error('Campaign or SMTP config not found');
        }
        
        // Create new log
        await tx.emailLog.create({
          data: {
            campaignId,
            recipientId,
            smtpConfigId: campaign.smtpConfigId,
            status: 'opened',
            sentAt: new Date(), // Approximate since we don't know the actual send time
            openedAt: new Date(),
            userAgent,
            ipAddress: ip,
          },
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error recording email open:', error);
    return false;
  }
}