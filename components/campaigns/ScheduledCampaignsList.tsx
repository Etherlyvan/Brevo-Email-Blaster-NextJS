// components/campaigns/ScheduledCampaignsList.tsx (FIXED)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiClock, FiPlay, FiEdit, FiTrash2 } from 'react-icons/fi';

interface Campaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  scheduledFor: string | null; // Keep as string to avoid hydration issues
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
  }, []);
  
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
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="flex items-center">
                    <p className="font-medium text-blue-600 truncate">{campaign.name}</p>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Scheduled
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    Template: {campaign.template.name}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRunNow(campaign.id)}
                    className="p-2 text-green-600 bg-green-100 rounded-full hover:bg-green-200"
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
  );
}