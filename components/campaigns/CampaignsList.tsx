// components/campaigns/CampaignsList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle } from 'react-icons/fi';

interface Campaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
  template: {
    name: string;
  };
  lastProcessedAt: string | null;
}

interface CampaignsListProps {
  initialCampaigns: Campaign[];
}

export default function CampaignsList({ initialCampaigns }: CampaignsListProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check for stalled campaigns every 2 minutes
    const interval = setInterval(() => {
      checkForStalledCampaigns();
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [campaigns]);
  
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email');
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Check for stalled campaigns and offer to restart them
  const checkForStalledCampaigns = () => {
    const now = new Date();
    const stalledCampaigns = campaigns.filter(campaign => {
      if (campaign.status !== 'processing' || !campaign.lastProcessedAt) return false;
      
      const lastActivity = new Date(campaign.lastProcessedAt);
      const diffMs = now.getTime() - lastActivity.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      return diffMins > 5; // Stalled if no activity for more than 5 minutes
    });
    
    if (stalledCampaigns.length > 0) {
      const campaignNames = stalledCampaigns.map(c => c.name).join(', ');
      const shouldView = window.confirm(
        `You have ${stalledCampaigns.length} stalled campaign(s): ${campaignNames}. Would you like to view them?`
      );
      
      if (shouldView) {
        router.push('/dashboard/campaigns/stalled');
      }
    }
  };
  
  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete the campaign "${campaignName}"?`)) {
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
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if campaign is stalled
  const isStalledCampaign = (campaign: Campaign): boolean => {
    if (campaign.status !== 'processing' || !campaign.lastProcessedAt) return false;
    
    const lastActivity = new Date(campaign.lastProcessedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins > 5; // Stalled if no activity for more than 5 minutes
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return dateStr;
    }
  };
  
  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading campaigns...</span>
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
        <p className="text-gray-500">No campaigns found.</p>
        <p className="mt-2 text-gray-500">
          Create your first email campaign to get started.
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
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="flex items-center">
                    <p className="font-medium text-blue-600 truncate">{campaign.name}</p>
                    <div className="ml-2">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 
                          campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                          campaign.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          campaign.status === 'processing' && isStalledCampaign(campaign) ? 'bg-red-100 text-red-800' :
                          campaign.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {campaign.status === 'processing' && isStalledCampaign(campaign) 
                          ? 'Stalled' 
                          : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 ml-2 space-x-2">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                    className="font-medium text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    <svg
                      className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Template: {campaign.template.name}
                  </p>
                </div>
                <div className="flex items-center mt-2 text-sm text-gray-500 sm:mt-0">
                  <svg
                    className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {formatDate(campaign.createdAt)}
                  </span>
                  
                  {campaign.status === 'processing' && isStalledCampaign(campaign) && (
                    <span className="ml-4 flex items-center text-red-600">
                      <FiAlertTriangle className="mr-1" />
                      Stalled
                    </span>
                  )}
                </div>
              </div>
              
              {/* Progress bar for campaigns in progress */}
              {campaign.status === 'processing' && campaign.recipientCount > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {campaign.processedCount} of {campaign.recipientCount} 
                      ({Math.round((campaign.processedCount / campaign.recipientCount) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${isStalledCampaign(campaign) ? 'bg-red-600' : 'bg-blue-600'}`}
                      style={{ width: `${(campaign.processedCount / campaign.recipientCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}