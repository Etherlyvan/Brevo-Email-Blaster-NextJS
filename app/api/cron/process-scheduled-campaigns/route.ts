// app/api/cron/process-scheduled-campaigns/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startCampaignProcessing } from "@/lib/queue";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    
    // Find scheduled campaigns that are due to run
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        isScheduled: true,
        scheduledFor: {
          lte: now, // Scheduled time is before or equal to now
        },
        status: 'queued', // Only process queued campaigns
      },
      select: {
        id: true,
        name: true,
        scheduledFor: true,
      },
    });
    
    console.log(`Found ${scheduledCampaigns.length} scheduled campaigns to process`);
    
    // Start processing each campaign
    const results = [];
    for (const campaign of scheduledCampaigns) {
      console.log(`Starting scheduled campaign: ${campaign.id} (${campaign.name})`);
      
      try {
        // Process in a transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
          // Verify the campaign is still in queued state (hasn't been processed by another instance)
          const currentCampaign = await tx.campaign.findUnique({
            where: { id: campaign.id },
            select: { status: true, isScheduled: true }
          });
          
          if (!currentCampaign || currentCampaign.status !== 'queued' || !currentCampaign.isScheduled) {
            console.log(`Campaign ${campaign.id} has already been processed or status changed`);
            return;
          }
          
          // Update campaign to processing status
          await tx.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'processing',
              isScheduled: false, // Mark as no longer scheduled
              startedAt: new Date(),
            },
          });
        });
        
        // Start processing (outside transaction to avoid long-running transactions)
        const success = await startCampaignProcessing(campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          success,
          error: success ? null : 'Failed to start campaign processing',
        });
      } catch (error) {
        console.error(`Error processing scheduled campaign ${campaign.id}:`, error);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      processed: scheduledCampaigns.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing scheduled campaigns:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}