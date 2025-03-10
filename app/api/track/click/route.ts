// app/api/track/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get campaign and recipient IDs from query parameters
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('c');
  const recipientId = searchParams.get('r');
  const url = searchParams.get('url');
  
  // If parameters are missing, redirect to homepage
  if (!campaignId || !recipientId || !url) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  try {
    // Get user agent and IP for analytics
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';
    
    // Record the click event asynchronously (don't await)
    recordClickEvent(campaignId, recipientId, userAgent, ip).catch(error => {
      console.error('Error recording email click:', error);
    });
  } catch (error) {
    console.error('Error processing click tracking:', error);
  }
  
  // Redirect to the target URL
  try {
    // Add security checks for URL to prevent open redirect vulnerabilities
    let targetUrl = url;
    
    // Ensure the URL is absolute and uses http or https protocol
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Validate URL format
    try {
      new URL(targetUrl);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.error('Invalid URL:', targetUrl);
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Redirect to the target URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error('Error redirecting to URL:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// Record email click event in database
async function recordClickEvent(
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
      // Update campaign click count
      await tx.campaign.update({
        where: { id: campaignId },
        data: { clickCount: { increment: 1 } },
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
            clickedAt: new Date(),
            userAgent,
            ipAddress: ip,
            status: 'clicked',
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
            status: 'clicked',
            sentAt: new Date(), // Approximate since we don't know the actual send time
            clickedAt: new Date(),
            userAgent,
            ipAddress: ip,
          },
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error recording email click:', error);
    return false;
  }
}