// components/campaigns/ScheduledCampaignsList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiClock, FiPlay, FiEdit, FiTrash2, FiRefreshCw } from 'react-icons/fi';

interface Campaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  scheduledFor: string | null;
  template: {
    name: string;
  };
}

interface ScheduledCampaignsListProps {
  initialCampaigns: Campaign[];
}

export default function ScheduledCampaignsList({ initialCampaigns }: ScheduledCampaignsListProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after hydration is complete
  useEffect(() => {
    setIsClient(true);
    
    // Set up automatic refresh every 30 seconds to compensate for lack of cron
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Check for due campaigns on client side (since we don't have frequent cron jobs)
  useEffect(() => {
    if (isClient) {
      // Check if any campaigns are due and should be started
      checkForDueCampaigns();
    }
  }, [campaigns, isClient]);
  
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/scheduled');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled campaigns');
      }
      
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check and start campaigns that are due
  const checkForDueCampaigns = () => {
    const now = new Date();
    
    campaigns.forEach(campaign => {
      if (campaign.scheduledFor) {
        const scheduledTime = new Date(campaign.scheduledFor);
        
        // If campaign is due (scheduled time is in the past)
        if (scheduledTime <= now) {
          console.log(`Campaign ${campaign.id} is due to run (scheduled: ${scheduledTime.toISOString()})`);
          
          // Ask user if they want to run the campaign now
          const shouldRun = window.confirm(
            `Campaign "${campaign.name}" was scheduled to run at ${scheduledTime.toLocaleString()} and is now due. Run it now?`
          );
          
          if (shouldRun) {
            handleRunNow(campaign.id);
          }
        }
      }
    });
  };
  
  const handleRunNow = async (campaignId: string) => {
    if (!confirm('Are you sure you want to run this campaign now?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/email/run-now/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run campaign');
      }
      
      // Refresh campaigns list
      fetchCampaigns();
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled campaign?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/email/${campaignId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }
      
      // Remove campaign from list
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
// components/campaigns/ScheduledCampaignsList.tsx (lanjutan)
setLoading(false);
}
};

// Client-side only function - safe to use after hydration
const formatScheduledTime = (dateStr: string | null) => {
if (!dateStr) return 'Not scheduled';

// Only format on client side to avoid hydration mismatch
if (!isClient) {
  return dateStr; // Return the raw string during server rendering
}

try {
  const date = new Date(dateStr);
  return date.toLocaleString();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  return 'Invalid date';
}
};

// Client-side only function - safe to use after hydration
const getTimeRemaining = (dateStr: string | null) => {
if (!dateStr) return 'Not scheduled';

// Only calculate on client side to avoid hydration mismatch
if (!isClient) {
  return 'Calculating...'; // Placeholder during server rendering
}

try {
  const now = new Date();
  const scheduledDate = new Date(dateStr);
  const diff = scheduledDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Processing soon';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  return 'Invalid date';
}
};

// Check if campaign is due to run
const isDueCampaign = (dateStr: string | null) => {
if (!dateStr || !isClient) return false;

try {
  const now = new Date();
  const scheduledDate = new Date(dateStr);
  return scheduledDate <= now;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  return false;
}
};

if (loading && campaigns.length === 0) {
return (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
    <span className="ml-2 text-gray-600">Loading scheduled campaigns...</span>
  </div>
);
}

if (error) {
return (
  <div className="p-4 text-red-700 bg-red-100 rounded-md">
    <p>{error}</p>
    <button 
      onClick={fetchCampaigns}
      className="px-4 py-2 mt-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
    >
      Try Again
    </button>
  </div>
);
}

if (campaigns.length === 0) {
return (
  <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
    <p className="text-gray-500">No scheduled campaigns found.</p>
    <p className="mt-2 text-gray-500">
      Schedule a campaign to send emails at a specific time.
    </p>
    <div className="mt-4">
      <Link
        href="/dashboard/campaigns/create"
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Create Campaign
      </Link>
    </div>
  </div>
);
}

return (
<div>
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-medium">Scheduled Campaigns</h3>
    
    <button
      onClick={fetchCampaigns}
      className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
    >
      <FiRefreshCw className="w-4 h-4 mr-1" />
      Refresh
    </button>
  </div>
  
  <div className="overflow-hidden bg-white shadow sm:rounded-md">
    <ul className="divide-y divide-gray-200">
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <div className="flex items-center">
                  <p className="font-medium text-blue-600 truncate">{campaign.name}</p>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isDueCampaign(campaign.scheduledFor) 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isDueCampaign(campaign.scheduledFor) ? 'Due Now' : 'Scheduled'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  Template: {campaign.template.name}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRunNow(campaign.id)}
                  className={`p-2 text-green-600 ${
                    isDueCampaign(campaign.scheduledFor) 
                      ? 'bg-green-100 animate-pulse' 
                      : 'bg-green-50'
                  } rounded-full hover:bg-green-200`}
                  title="Run Now"
                >
                  <FiPlay className="w-5 h-5" />
                </button>
                <Link
                  href={`/dashboard/campaigns/edit/${campaign.id}`}
                  className="p-2 text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                  title="Edit Campaign"
                >
                  <FiEdit className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => handleDeleteCampaign(campaign.id)}
                  className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                  title="Delete Campaign"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <div className="flex items-center text-sm text-gray-500">
                  <FiCalendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {isClient ? (
                    <span>Scheduled for: {formatScheduledTime(campaign.scheduledFor)}</span>
                  ) : (
                    <span>Scheduled for: {campaign.scheduledFor ? new Date(campaign.scheduledFor).toISOString() : 'Not scheduled'}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <FiClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                <p>
                  {isClient ? getTimeRemaining(campaign.scheduledFor) : 'Calculating...'} • {campaign.recipientCount} recipients
                </p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
  
  {/* Notification for Hobby Plan Users */}
  <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-md text-sm">
    <h4 className="font-medium">Note for Vercel Hobby Plan Users</h4>
    <p className="mt-1">
      Since cron jobs are limited on the Hobby plan, you may need to manually check this page 
      to ensure scheduled campaigns run on time. The system will automatically prompt you 
      to run campaigns that are due.
    </p>
  </div>
</div>
);
}