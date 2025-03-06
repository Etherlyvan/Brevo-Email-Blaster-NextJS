// app/api/cron/reset-smtp-quotas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const config = {
  runtime: 'edge',
};

export async function GET() {
  try {
    // Reset all SMTP configs' last used timestamp
    await prisma.smtpConfig.updateMany({
      data: {
        lastUsed: null
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: "SMTP quotas reset successfully",
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Error resetting SMTP quotas:", error);
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}