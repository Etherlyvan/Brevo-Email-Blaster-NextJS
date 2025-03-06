// components/analytics/Dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsDashboardProps {
  campaignId?: string;
}

export default function AnalyticsDashboard({ campaignId }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    totalStats: {
      sent: number;
      failed: number;
      opened: number;
      clicked: number;
      total: number;
    };
    rates: {
      deliveryRate: number;
      openRate: number;
      clickRate: number;
    };
    dailyStats: Array<{
      date: string;
      sent: number;
      opened: number;
      clicked: number;
    }>;
    topCampaigns: Array<{
      id: string;
      name: string;
      openRate: number;
      clickRate: number;
    }>;
  } | null>(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Build URL with query parameters
        const url = new URL('/api/analytics', window.location.origin);
        url.searchParams.append('period', period);
        if (campaignId) {
          url.searchParams.append('campaignId', campaignId);
        }
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [period, campaignId]);
  
  // Prepare chart data
  const chartData: ChartData<'line'> = {
    labels: analytics?.dailyStats.map(stat => stat.date) || [],
    datasets: [
      {
        label: 'Sent',
        data: analytics?.dailyStats.map(stat => stat.sent) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.2,
      },
      {
        label: 'Opened',
        data: analytics?.dailyStats.map(stat => stat.opened) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.2,
      },
      {
        label: 'Clicked',
        data: analytics?.dailyStats.map(stat => stat.clicked) || [],
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.2,
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
  
  if (!analytics) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
        No analytics data available
      </div>
    );
  }
  
  const { totalStats, rates, topCampaigns } = analytics;
  
  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex space-x-2">
        {['7d', '30d', '90d', '1y'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {p === '7d' ? '7 days' : 
             p === '30d' ? '30 days' : 
             p === '90d' ? '90 days' : 
             '1 year'}
          </button>
        ))}
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Delivery Rate</div>
          <div className="text-2xl font-semibold">{rates.deliveryRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">
            {totalStats.sent} of {totalStats.total} emails delivered
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Open Rate</div>
          <div className="text-2xl font-semibold">{rates.openRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">
            {totalStats.opened} of {totalStats.sent} emails opened
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Click Rate</div>
          <div className="text-2xl font-semibold">{rates.clickRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">
            {totalStats.clicked} of {totalStats.opened} emails clicked
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Total Emails</div>
          <div className="text-2xl font-semibold">{totalStats.total}</div>
          <div className="text-xs text-gray-500">
            {totalStats.failed} failed ({((totalStats.failed / totalStats.total) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Performance Over Time</h3>
        <div className="h-80">
          <Line 
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      </div>
      
      {/* Top campaigns */}
      {!campaignId && topCampaigns.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Campaigns</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topCampaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {campaign.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.openRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.clickRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}