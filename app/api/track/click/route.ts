// app/api/track/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseTrackingParams, recordEmailEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const params = parseTrackingParams(request);
  
  if (!params || params.type !== 'click') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Get the target URL from the request
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Record the click event asynchronously
  recordEmailEvent(params, request).catch(error => {
    console.error('Error recording email click:', error);
  });
  
  // Redirect to the target URL
  try {
    return NextResponse.redirect(new URL(targetUrl));
  } catch (error) {
    console.error('Error redirecting to URL:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}