// app/api/track/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseTrackingParams, recordEmailEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const params = parseTrackingParams(request);
  
  if (!params || params.type !== 'open') {
    // Return a transparent 1x1 pixel GIF even if tracking fails
    return new NextResponse(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
  
  // Record the open event asynchronously
  recordEmailEvent(params, request).catch(error => {
    console.error('Error recording email open:', error);
  });
  
  // Return a transparent 1x1 pixel GIF
  return new NextResponse(
    Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}