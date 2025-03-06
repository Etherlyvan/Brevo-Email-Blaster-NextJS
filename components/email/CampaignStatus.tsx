// components/email/CampaignStatus.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CampaignStatusProps {
  campaignId: string;
}

export default function CampaignStatus({ campaignId }: CampaignStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<{
    campaign: {
      name: string;
      status: string;
      recipientCount: number;
      successCount: number;
      failCount: number;
      openCount: number;
      clickCount: number;
    };
    queue: {
      inProgress: boolean;
      progress: number;
      processed: number;
      total: number;
      success: number;
      failed: number;
    };
    recentErrors: Array<{
      email: string;
      errorMessage: string | null;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/email/status/${campaignId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch campaign status');
        }
        
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    
    // Poll for updates if campaign is in progress
    const interval = setInterval(() => {
      if (status?.campaign?.status === 'processing' || status?.queue?.inProgress) {
        fetchStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [campaignId, status?.campaign?.status, status?.queue?.inProgress]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        <p>Error: {error}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!status) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
        Campaign status not available
      </div>
    );
  }
  
  const { campaign, queue, recentErrors } = status;
  
  // Calculate percentages
  const deliveryRate = campaign.recipientCount > 0 
    ? (campaign.successCount / campaign.recipientCount) * 100 
    : 0;
  
  const openRate = campaign.successCount > 0 
    ? (campaign.openCount / campaign.successCount) * 100 
    : 0;
  
  const clickRate = campaign.openCount > 0 
    ? (campaign.clickCount / campaign.openCount) * 100 
    : 0;
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">{campaign.name}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Status</div>
            <div className="text-lg font-medium capitalize">
              {campaign.status}
              {queue.inProgress && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Recipients</div>
            <div className="text-lg font-medium">{campaign.recipientCount}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Delivered</div>
            <div className="text-lg font-medium">
              {campaign.successCount} 
              <span className="text-sm text-gray-500 ml-1">
                ({deliveryRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-lg font-medium">
              {campaign.failCount}
              {campaign.recipientCount > 0 && (
                <span className="text-sm text-gray-500 ml-1">
                  ({((campaign.failCount / campaign.recipientCount) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress bar for active campaigns */}
        {queue.inProgress && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Progress</span>
              <span>{queue.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                style={{ width: `${queue.progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {queue.processed} of {queue.total} emails processed
            </div>
          </div>
        )}
      </div>
      
      {/* Engagement metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Engagement</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Opens</div>
            <div className="text-lg font-medium">
              {campaign.openCount}
              <span className="text-sm text-gray-500 ml-1">
                ({openRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Clicks</div>
            <div className="text-lg font-medium">
              {campaign.clickCount}
              <span className="text-sm text-gray-500 ml-1">
                ({clickRate.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent errors */}
      {recentErrors && recentErrors.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Recent Errors</h3>
          
          <div className="space-y-2">
            {recentErrors.map((err, index) => (
              <div key={index} className="bg-red-50 p-3 rounded-md">
                <div className="font-medium">{err.email}</div>
                <div className="text-sm text-red-700">{err.errorMessage}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}