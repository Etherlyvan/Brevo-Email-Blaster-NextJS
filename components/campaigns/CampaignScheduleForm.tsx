// components/campaigns/CampaignScheduleForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiClock, FiCalendar } from 'react-icons/fi';

interface CampaignScheduleFormProps {
  campaignId: string;
  initialData: {
    name: string;
    isScheduled: boolean;
    scheduledFor: string | null;
  };
}

export default function CampaignScheduleForm({ campaignId, initialData }: CampaignScheduleFormProps) {
  const router = useRouter();
  const [isScheduled, setIsScheduled] = useState(initialData.isScheduled);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sendImmediately, setSendImmediately] = useState(!initialData.isScheduled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Set initial date and time if scheduledFor exists
    if (initialData.scheduledFor) {
      const date = new Date(initialData.scheduledFor);
      setScheduledDate(date.toISOString().split('T')[0]);
      
      // Format time as HH:MM
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setScheduledTime(`${hours}:${minutes}`);
    } else {
      // Set default to tomorrow at current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setScheduledTime(`${hours}:${minutes}`);
    }
  }, [initialData.scheduledFor]);
  
  // Update sendImmediately when isScheduled changes
  useEffect(() => {
    if (isScheduled) {
      // Can't send immediately if scheduled
      setSendImmediately(false);
    }
  }, [isScheduled]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate schedule if enabled
      if (isScheduled) {
        if (!scheduledDate || !scheduledTime) {
          throw new Error('Please set a complete schedule date and time');
        }
        
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
      }
      
      // Prepare data for API
      const updateData = {
        isScheduled,
        scheduledFor: isScheduled ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
        sendImmediately: !isScheduled && sendImmediately,
      };
      
      // Send request to update campaign
      const response = await fetch(`/api/email/schedule/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update campaign schedule');
      }
      
      // Navigate back to campaign page or scheduled campaigns list
      if (isScheduled) {
        router.push('/dashboard/campaigns/scheduled');
      } else {
        router.push(`/dashboard/campaigns/${campaignId}`);
      }
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-6">Edit Campaign Schedule</h2>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">{initialData.name}</h3>
          <p className="text-sm text-gray-500">
            Update the scheduling options for this campaign
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Schedule Option */}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isScheduled"
              checked={isScheduled}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsScheduled(checked);
                if (checked) {
                  // If scheduled, can't send immediately
                  setSendImmediately(false);
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isScheduled" className="ml-2 block text-sm text-gray-900">
              Schedule for later
            </label>
          </div>
          
          {/* Send Immediately Option - only show if not scheduled */}
          {!isScheduled && (
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="sendImmediately"
                checked={sendImmediately}
                onChange={(e) => setSendImmediately(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sendImmediately" className="ml-2 block text-sm text-gray-900">
                <span className="font-medium">Start sending immediately</span> after updating
              </label>
            </div>
          )}
          
          {/* Schedule Date/Time Fields */}
          {isScheduled && (
            <div className="ml-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="scheduledDate"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    min={new Date().toISOString().split('T')[0]}
                    required={isScheduled}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiClock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="time"
                    id="scheduledTime"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    required={isScheduled}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <FiClock className="mr-2" />
            {isScheduled ? (
              <span>Campaign will be sent on {scheduledDate} at {scheduledTime}</span>
            ) : (
              <span>
                Campaign will be {sendImmediately ? 'processed immediately' : 'saved as draft'} after updating
              </span>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Link
            href={initialData.isScheduled ? '/dashboard/campaigns/scheduled' : `/dashboard/campaigns/${campaignId}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}