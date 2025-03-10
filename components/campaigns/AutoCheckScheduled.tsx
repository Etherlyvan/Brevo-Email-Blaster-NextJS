// components/campaigns/AutoCheckScheduled.tsx (fixed)
'use client';

import { useState, useEffect } from 'react';

// Define interface for campaign structure
interface Campaign {
  id: string;
  name: string;
  scheduledFor: string | null;
}

export default function AutoCheckScheduled() {
  const [hasChecked, setHasChecked] = useState(false);
  
  useEffect(() => {
    // Only run once after component mounts
    if (!hasChecked) {
      checkScheduledCampaigns();
      setHasChecked(true);
    }
    
    // Set up interval to check every 5 minutes
    const interval = setInterval(() => {
      checkScheduledCampaigns();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [hasChecked]);
  
  const checkScheduledCampaigns = async () => {
    try {
      // Fetch scheduled campaigns
      const response = await fetch('/api/email/scheduled');
      
      if (!response.ok) {
        console.error('Failed to fetch scheduled campaigns');
        return;
      }
      
      const campaigns: Campaign[] = await response.json();
      
      // Check for due campaigns
      const now = new Date();
      const dueCampaigns = campaigns.filter((campaign: Campaign) => {
        if (!campaign.scheduledFor) return false;
        
        const scheduledTime = new Date(campaign.scheduledFor);
        return scheduledTime <= now;
      });
      
      if (dueCampaigns.length > 0) {
        // Notify user about due campaigns
        const campaignNames = dueCampaigns.map((c: Campaign) => c.name).join(', ');
        const shouldProcess = window.confirm(
          `You have ${dueCampaigns.length} campaign(s) that are scheduled to run now: ${campaignNames}. Would you like to start them?`
        );
        
        if (shouldProcess) {
          // Process each due campaign
          for (const campaign of dueCampaigns) {
            await fetch(`/api/email/run-now/${campaign.id}`, {
              method: 'POST',
            });
            console.log(`Started campaign: ${campaign.name}`);
          }
          
          // Refresh page to show updated status
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error checking scheduled campaigns:', error);
    }
  };
  
  // This component doesn't render anything
  return null;
}