// components/campaigns/StalledCampaignsList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiRefreshCw, FiEye, FiPlay } from 'react-icons/fi';

interface Campaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  lastProcessedAt: string;
  template: {
    name: string;
  };
}

interface StalledCampaignsListProps {
  initialCampaigns: Campaign[];
}

export default function StalledCampaignsList({ initialCampaigns }: StalledCampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Auto-refresh every minute
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/stalled');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stalled campaigns');
      }
      
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRestartCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to restart processing this campaign?')) {
      return;
    }
    
    try {
      setActionLoading(campaignId);
      const response = await fetch(`/api/email/restart/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restart campaign');
      }
      
      // Remove campaign from list
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      
      // Show success message
      alert('Campaign restarted successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Format time since last activity
  const formatTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    }
  };
  
  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading stalled campaigns...</span>
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
        <p className="text-gray-500">No stalled campaigns found.</p>
        <p className="mt-2 text-gray-500">
          All your campaigns are running smoothly.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/campaigns"
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            View All Campaigns
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Stalled Campaigns</h3>
        
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
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Stalled
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      Template: {campaign.template.name}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleRestartCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === campaign.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Restarting...
                        </>
                      ) : (
                        <>
                          <FiPlay className="mr-1.5 h-4 w-4" />
                          Restart
                        </>
                      )}
                    </button>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      <FiEye className="mr-1.5 h-4 w-4" />
                      View
                    </Link>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Last activity: {formatTimeSince(campaign.lastProcessedAt)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p>
                      {campaign.processedCount} of {campaign.recipientCount} processed ({campaign.successCount} sent)
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}