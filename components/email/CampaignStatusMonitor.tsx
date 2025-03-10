// components/email/CampaignStatusMonitor.tsx
'use client';

import { useState, useEffect } from 'react';

interface CampaignStatusProps {
  campaignId: string;
  autoRefresh?: boolean;
}

export default function CampaignStatusMonitor({ 
  campaignId, 
  autoRefresh = true 
}: CampaignStatusProps) {
  const [status, setStatus] = useState<{
    campaign: {
      id: string;
      name: string;
      status: string;
      recipientCount: number;
      processedCount: number;
      successCount: number;
      failCount: number;
      openCount: number;
      clickCount: number;
      startedAt: string | null;
      completedAt: string | null;
      lastProcessedAt: string | null;
      lastError: string | null;
    };
    progress: number;
    inProgress: boolean;
    isComplete: boolean;
    isStalled: boolean;
    recentErrors: Array<{
      email: string;
      errorMessage: string | null;
      updatedAt: string;
    }>;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restartLoading, setRestartLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [processNextLoading, setProcessNextLoading] = useState(false);
  const [sendNowLoading, setSendNowLoading] = useState(false);
  
  useEffect(() => {
    fetchStatus();
    
    // Set up polling if autoRefresh is enabled
    // Use more frequent polling to compensate for lack of cron jobs
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 10000); // Poll every 10 seconds for more responsive updates
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaignId, autoRefresh]);
  
  // Add effect to automatically check for stalled campaigns and restart if needed
  useEffect(() => {
    // Auto-restart stalled campaigns after confirmation
    if (status?.isStalled) {
      const timeSinceLastActivity = status.campaign.lastProcessedAt 
        ? Math.round((Date.now() - new Date(status.campaign.lastProcessedAt).getTime()) / 60000) 
        : 0;
      
      console.log(`Campaign appears stalled. Last activity was ${timeSinceLastActivity} minutes ago.`);
      
      // If stalled for more than 10 minutes, offer to restart automatically
      if (timeSinceLastActivity > 10) {
        const shouldRestart = window.confirm(
          `This campaign appears to be stalled (no activity for ${timeSinceLastActivity} minutes). Would you like to restart processing?`
        );
        
        if (shouldRestart) {
          handleRestartCampaign();
        }
      }
    }
  }, [status?.isStalled]);
  
  const fetchStatus = async () => {
    try {
      setLoading(true);
      console.log(`Fetching status for campaign ${campaignId}`);
      
      const response = await fetch(`/api/email/status/${campaignId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign status');
      }
      
      const data = await response.json();
      console.log('Campaign status data:', data);
      
      setStatus(data);
      
      // Stop polling if campaign is complete
      if (data.isComplete && autoRefresh) {
        console.log('Campaign is complete, stopping auto-refresh');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching campaign status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRestartCampaign = async () => {
    try {
      setRestartLoading(true);
      console.log(`Restarting campaign ${campaignId}`);
      
      const response = await fetch(`/api/email/restart/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restart campaign');
      }
      
      // Refresh status immediately
      await fetchStatus();
      
      // Show success message
      alert('Campaign processing restarted successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error restarting campaign:', error);
    } finally {
      setRestartLoading(false);
    }
  };
  
  const handleResetCampaign = async () => {
    // Ask for confirmation
    if (!confirm("Are you sure you want to reset this campaign? This will reset all progress and start over.")) {
      return;
    }
    
    try {
      setResetLoading(true);
      console.log(`Resetting campaign ${campaignId}`);
      
      const response = await fetch(`/api/email/reset/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset campaign');
      }
      
      // Refresh status immediately
      await fetchStatus();
      
      // Show success message
      alert('Campaign has been reset and restarted!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error resetting campaign:', error);
    } finally {
      setResetLoading(false);
    }
  };
  
  const handleProcessNextBatch = async () => {
    try {
      setProcessNextLoading(true);
      console.log(`Processing next batch for campaign ${campaignId}`);
      
      const response = await fetch(`/api/email/process-next/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process next batch');
      }
      
      // Refresh status after processing
      await fetchStatus();
      
      alert('Processing next batch. Check status for updates.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error processing next batch:', error);
    } finally {
      setProcessNextLoading(false);
    }
  };
  
  // Add handler for "Send Now" button for draft campaigns
  const handleSendNow = async () => {
    if (!confirm('Start sending emails now?')) return;
    
    try {
      setSendNowLoading(true);
      console.log(`Starting campaign ${campaignId} now`);
      
      const response = await fetch(`/api/email/process-now/${campaignId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start campaign');
      }
      
      // Refresh status
      await fetchStatus();
      
      alert('Email sending started!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error starting campaign:', error);
    } finally {
      setSendNowLoading(false);
    }
  };
  
  if (loading && !status) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading campaign status...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-md">
        <p>{error}</p>
        <button 
          onClick={fetchStatus}
          className="px-4 py-2 mt-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!status) {
    return (
      <div className="p-4 text-yellow-700 bg-yellow-100 rounded-md">
        <p>Could not retrieve campaign status. Please try again later.</p>
      </div>
    );
  }
  
  const { campaign, progress, inProgress, isStalled, recentErrors } = status;
  
  // Format dates for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Calculate rates
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{campaign.name}</h2>
          <div className="flex flex-wrap gap-2">
            {/* "Send Now" button for draft campaigns */}
            {campaign.status === 'draft' && (
              <button
                onClick={handleSendNow}
                disabled={sendNowLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {sendNowLoading ? 'Starting...' : 'Send Now'}
              </button>
            )}
            
            {/* Process next batch button */}
            {inProgress && (
              <button
                onClick={handleProcessNextBatch}
                disabled={processNextLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {processNextLoading ? 'Processing...' : 'Process Next Batch'}
              </button>
            )}
            
            {/* Restart button for stalled campaigns */}
            {isStalled && (
              <button
                onClick={handleRestartCampaign}
                disabled={restartLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {restartLoading ? 'Restarting...' : 'Restart Processing'}
              </button>
            )}
            
            {/* Reset campaign button */}
            <button
              onClick={handleResetCampaign}
              disabled={resetLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {resetLoading ? 'Resetting...' : 'Reset Campaign'}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Refresh Status
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Status</div>
            <div className="flex items-center">
              <div className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 
                  campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                  campaign.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  campaign.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'}
              `}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </div>
              {inProgress && (
                <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              )}
              {isStalled && (
                <div className="ml-2 text-xs text-yellow-600 font-medium">
                  (Stalled)
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-500">Recipients</div>
            <div className="text-lg font-medium">
              {campaign.processedCount} / {campaign.recipientCount}
            </div>
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
        
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                campaign.status === 'failed' ? 'bg-red-600' :
                campaign.status === 'partial' ? 'bg-yellow-600' :
                campaign.status === 'sent' ? 'bg-green-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Started: </span>
            <span>{formatDate(campaign.startedAt)}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Activity: </span>
            <span>{formatDate(campaign.lastProcessedAt)}</span>
          </div>
          <div>
            <span className="text-gray-500">Completed: </span>
            <span>{formatDate(campaign.completedAt)}</span>
          </div>
        </div>
        
        {/* Last error */}
        {campaign.lastError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            <div className="font-medium">Last Error:</div>
            <div>{campaign.lastError}</div>
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
          
          <div className="space-y-3">
            {recentErrors.map((err, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-md">
                <div className="font-medium">{err.email}</div>
                <div className="text-sm text-red-700">{err.errorMessage || 'Unknown error'}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(err.updatedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}