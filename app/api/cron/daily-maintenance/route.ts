// app/api/cron/daily-maintenance/route.ts
import { NextResponse } from "next/server";
import { cleanupUnusedImages } from "@/lib/user-image";
import { prisma } from "@/lib/db";
import { triggerProcessBatch } from "@/lib/queue";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = {
      cleanupImages: await runCleanupImages(),
      resetSmtpQuotas: await runResetSmtpQuotas(),
      stalledCampaigns: await checkStalledCampaigns(),
      scheduledCampaigns: await processScheduledCampaigns()
    };
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in daily maintenance:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

// Fungsi untuk membersihkan gambar
async function runCleanupImages() {
  try {
    const result = await cleanupUnusedImages();
    return { success: true, removed: result.removed, errors: result.errors };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fungsi untuk reset SMTP quotas
async function runResetSmtpQuotas() {
  try {
    await prisma.smtpConfig.updateMany({
      data: {
        lastUsed: null,
        usedToday: 0,
        lastQuotaReset: new Date()
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fungsi untuk memeriksa kampanye yang terhenti
async function checkStalledCampaigns() {
  try {
    // Cari kampanye yang terhenti (dalam status processing tapi tidak ada aktivitas selama 24 jam)
    // Untuk hobby plan, kita periksa kampanye yang terhenti lebih lama
    const stalledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'processing',
        lastProcessedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 jam yang lalu
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
    
    // Restart kampanye yang terhenti
    const restartResults = [];
    for (const campaign of stalledCampaigns) {
      console.log(`Restarting stalled campaign: ${campaign.id}`);
      
      // Update timestamp untuk menandai bahwa kampanye sedang diproses
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          lastProcessedAt: new Date(),
          lastError: `Auto-restarted after stalling at ${campaign.lastProcessedAt}`,
        },
      });
      
      // Trigger webhook untuk melanjutkan pemrosesan
      await triggerProcessBatch(campaign.id, 0);
      restartResults.push({ id: campaign.id, name: campaign.name, restarted: true });
    }
    
    return { 
      success: true, 
      stalledCampaigns: stalledCampaigns.length,
      restartedCampaigns: restartResults
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fungsi untuk memproses kampanye terjadwal
async function processScheduledCampaigns() {
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
        // Update campaign to processing status
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'processing',
            isScheduled: false, // Mark as no longer scheduled
            startedAt: new Date(),
          },
        });
        
        // Trigger processing via webhook
        await triggerProcessBatch(campaign.id, 0);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          success: true,
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
    
    return {
      success: true,
      processed: scheduledCampaigns.length,
      results,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}