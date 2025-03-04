// app/api/auth/callback/google/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get the code and state from the URL
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=MissingParameters", request.url));
  }
  
  try {
    // Let NextAuth handle the OAuth flow normally
    return NextResponse.next();
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return NextResponse.redirect(new URL("/login?error=OAuthError", request.url));
  }
}