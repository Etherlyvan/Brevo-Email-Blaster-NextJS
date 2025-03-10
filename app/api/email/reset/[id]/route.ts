// app/api/email/reset/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startCampaignProcessing } from "@/lib/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });// app/api/email/reset/[id]/route.ts (lanjutan)
}

const { id: campaignId } = await params;

try {
  console.log(`Resetting campaign ${campaignId}`);
  
  // Verify campaign belongs to user
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId: session.user.id,
    },
  });
  
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  
  // Reset campaign status
  await prisma.campaign.update({
    where: { 
      id: campaignId,
      userId: session.user.id
    },
    data: {
      status: 'draft',
      processedCount: 0,
      successCount: 0,
      failCount: 0,
      lastError: null,
      completedAt: null,
    },
  });
  
  // Reset all recipients
  await prisma.recipient.updateMany({
    where: { campaignId },
    data: {
      status: 'pending',
      errorMessage: null,
      sentAt: null,
      retryCount: 0,
    },
  });
  
  console.log(`Campaign ${campaignId} reset, starting processing`);
  
  // Start campaign processing
  await startCampaignProcessing(campaignId);
  
  return NextResponse.json({ 
    success: true, 
    message: "Campaign reset and restarted" 
  });
} catch (error) {
  console.error("Error resetting campaign:", error);
  return NextResponse.json({ 
    error: error instanceof Error ? error.message : "Unknown error" 
  }, { status: 500 });
}
}