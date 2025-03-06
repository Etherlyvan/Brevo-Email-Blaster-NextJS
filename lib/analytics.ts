// lib/analytics.ts
import { prisma } from './db';
import type { NextRequest } from 'next/server';

interface TrackingParams {
  type: 'open' | 'click';
  campaignId: string;
  recipientId: string;
}

/**
 * Parse tracking pixel URL parameters
 */
export function parseTrackingParams(request: NextRequest): TrackingParams | null {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('t') as 'open' | 'click';
    const campaignId = url.searchParams.get('c');
    const recipientId = url.searchParams.get('r');
    
    if (!type || !campaignId || !recipientId) {
      return null;
    }
    
    return { type, campaignId, recipientId };
  } catch (error) {
    console.error('Error parsing tracking parameters:', error);
    return null;
  }
}

/**
 * Record an email open or click event
 */
export async function recordEmailEvent(
  params: TrackingParams,
  request: NextRequest
): Promise<boolean> {
  try {
    const { type, campaignId, recipientId } = params;
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Find existing log entry
    const existingLog = await prisma.emailLog.findFirst({
      where: {
        campaignId,
        recipientId,
        status: 'sent',
      },
    });
    
    if (!existingLog) {
      // Find the SMTP config used
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { smtpConfigId: true }
      });
      
      // Create a new log if one doesn't exist
      await prisma.emailLog.create({
        data: {
          campaignId,
          recipientId,
          smtpConfigId: campaign?.smtpConfigId ?? '',
          status: type === 'open' ? 'opened' : 'clicked',
          sentAt: new Date(), // This is approximate since we don't have the actual sent time
          [type === 'open' ? 'openedAt' : 'clickedAt']: new Date(),
          ipAddress,
          userAgent,
        },
      });
    } else {
      // Update existing log
      await prisma.emailLog.update({
        where: { id: existingLog.id },
        data: {
          status: type === 'open' ? 'opened' : 'clicked',
          [type === 'open' ? 'openedAt' : 'clickedAt']: new Date(),
          ipAddress,
          userAgent,
        },
      });
    }
    
    // Update campaign counters
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        [type === 'open' ? 'openCount' : 'clickCount']: {
          increment: 1,
        },
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error recording email event:', error);
    return false;
  }
}

/**
 * Generate a tracking pixel URL
 */
export function generateTrackingPixelUrl(
  baseUrl: string,
  campaignId: string,
  recipientId: string
): string {
  return `${baseUrl}/api/track/open?c=${campaignId}&r=${recipientId}&t=open`;
}

/**
 * Generate a tracking link URL
 */
export function generateTrackingLinkUrl(
  baseUrl: string,
  campaignId: string,
  recipientId: string,
  originalUrl: string
): string {
  // Encode the original URL to include as a parameter
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/track/click?c=${campaignId}&r=${recipientId}&t=click&url=${encodedUrl}`;
}

/**
 * Process HTML content to add tracking pixels and convert links to tracking links
 */
export function addTrackingToHtml(
  html: string,
  baseUrl: string,
  campaignId: string,
  recipientId: string
): string {
  // Add tracking pixel
  const trackingPixel = `<img src="${generateTrackingPixelUrl(baseUrl, campaignId, recipientId)}" width="1" height="1" alt="" style="display:none;" />`;
  
  // Add tracking pixel before closing body tag
  let processedHtml = html.replace('</body>', `${trackingPixel}</body>`);
  
  // If no body tag, append to the end
  if (processedHtml === html) {
    processedHtml = html + trackingPixel;
  }
  
  // Replace links with tracking links
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi;
  processedHtml = processedHtml.replace(linkRegex, (match, url, rest) => {
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      // Don't track anchor links or mailto/tel links
      return match;
    }
    
    const trackingUrl = generateTrackingLinkUrl(baseUrl, campaignId, recipientId, url);
    return `<a href="${trackingUrl}"${rest}>`;
  });
  
  return processedHtml;
}