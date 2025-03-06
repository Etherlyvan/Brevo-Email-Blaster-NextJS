// components/analytics/CampaignAnalyticsDetail.tsx
'use client';

import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface CampaignAnalyticsDetailProps {
  campaignId: string;
}

interface DeviceData {
  mobile: number;
  desktop: number;
  tablet: number;
  other: number;
}

interface AnalyticsDetail {
  deviceStats: DeviceData;
  topLocations: Array<{ location: string; count: number }>;
  hourlyData: Array<{ hour: number; opens: number; clicks: number }>;
}

export default function CampaignAnalyticsDetail({ campaignId }: CampaignAnalyticsDetailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDetail | null>(null);
  
  useEffect(() => {
    fetchAnalyticsDetail();
  }, [campaignId]);
  
  const fetchAnalyticsDetail = async () => {
    try {
      setLoading(true);
      
      const url = new URL(`/api/analytics/detail/${campaignId}`, window.location.origin);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch detailed analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare device chart data
  const deviceChartData: ChartData<'doughnut'> = {
    labels: ['Mobile', 'Desktop', 'Tablet', 'Other'],
    datasets: [
      {
        data: analyticsData 
          ? [
              analyticsData.deviceStats.mobile,
              analyticsData.deviceStats.desktop,
              analyticsData.deviceStats.tablet,
              analyticsData.deviceStats.other
            ]
          : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(201, 203, 207, 0.6)'
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
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
      </div>
    );
  }
  
  if (!analyticsData) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
        No detailed analytics data available
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Device Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={deviceChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Top Locations */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Locations</h3>
          {analyticsData.topLocations.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topLocations.map((location, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700">{location.location}</span>
                  <div className="flex items-center">
                    <span className="text-gray-900 font-medium">{location.count}</span>
                    <div className="ml-2 w-24 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${(location.count / Math.max(...analyticsData.topLocations.map(l => l.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No location data available</p>
          )}
        </div>
      </div>
      
      {/* Hourly Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Activity</h3>
        <div className="h-64">
          {analyticsData.hourlyData.length > 0 ? (
            <div className="space-y-2">
              {analyticsData.hourlyData.map((hourData) => (
                <div key={hourData.hour} className="flex items-center">
                  <span className="w-8 text-right text-gray-500 text-sm">
                    {hourData.hour}:00
                  </span>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(hourData.opens / Math.max(...analyticsData.hourlyData.map(h => Math.max(h.opens, h.clicks)))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{hourData.opens} opens</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(hourData.clicks / Math.max(...analyticsData.hourlyData.map(h => Math.max(h.opens, h.clicks)))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{hourData.clicks} clicks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No hourly data available</p>
          )}
        </div>
      </div>
    </div>
  );
}