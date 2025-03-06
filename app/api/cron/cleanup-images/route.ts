// app/api/cron/cleanup-images/route.ts
import { NextResponse } from "next/server";
import { cleanupUnusedImages } from "@/lib/user-image";

export const config = {
  runtime: 'edge',
};

export async function GET() {
  try {
    // Cleanup unused profile images
    const result = await cleanupUnusedImages();
    
    return NextResponse.json({ 
      success: true,
      message: `Cleaned up ${result.removed} unused images with ${result.errors} errors`,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Error cleaning up images:", error);
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}