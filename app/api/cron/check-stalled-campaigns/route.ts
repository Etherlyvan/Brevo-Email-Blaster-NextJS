// app/api/cron/check-stalled-campaigns/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerProcessBatch } from "@/lib/queue";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find stalled campaigns (in processing status but no activity for 10 minutes)
    const stalledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'processing',
        lastProcessedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      },
      select: {
        id: true,
        name: true,
        userId: true,
        lastProcessedAt: true,
      },
    });
    
    console.log(`Found ${stalledCampaigns.length} stalled campaigns`);
    
    // Restart stalled campaigns
    const results = [];
    for (const campaign of stalledCampaigns) {
      console.log(`Restarting stalled campaign: ${campaign.id}`);
      
      try {
        // Update timestamp to mark campaign as being processed
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            lastProcessedAt: new Date(),
            lastError: `Auto-restarted after stalling at ${campaign.lastProcessedAt ? new Date(campaign.lastProcessedAt).toISOString() : 'unknown time'}`,
          },
        });
        
        // Check if there are pending recipients
        const pendingCount = await prisma.recipient.count({
          where: {
            campaignId: campaign.id,
            status: 'pending',
          },
        });
        
        if (pendingCount === 0) {
          // No pending recipients, finalize the campaign
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'partial', // Mark as partial since it stalled
              completedAt: new Date(),
            },
          });
          
          results.push({
            id: campaign.id,
            name: campaign.name,
            action: 'finalized',
            reason: 'No pending recipients found',
          });
          
          continue;
        }
        
        // Trigger webhook to continue processing
        const webhookTriggered = await triggerProcessBatch(campaign.id, 0);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          action: webhookTriggered ? 'restarted' : 'failed',
          reason: webhookTriggered ? 'Stalled campaign restarted' : 'Failed to trigger processing webhook',
        });
      } catch (error) {
        console.error(`Error restarting stalled campaign ${campaign.id}:`, error);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          action: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      stalledCampaigns: stalledCampaigns.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking stalled campaigns:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}