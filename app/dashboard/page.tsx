// app/dashboard/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import CampaignsList from '@/components/campaigns/CampaignsList';
import { FiClock, FiAlertTriangle } from 'react-icons/fi';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Please sign in to access this page</div>;
  }
  
  // Fetch data from database
  const campaignsData = await prisma.campaign.findMany({
    where: { 
      userId: session.user.id,
      isScheduled: false, // Only show non-scheduled campaigns
    },
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { name: true } },
    },
  });
  
  // Convert Date objects to strings to match the expected interface
  const campaigns = campaignsData.map(campaign => ({
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    startedAt: campaign.startedAt ? campaign.startedAt.toISOString() : null,
    completedAt: campaign.completedAt ? campaign.completedAt.toISOString() : null,
    lastProcessedAt: campaign.lastProcessedAt ? campaign.lastProcessedAt.toISOString() : null,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
  }));
  
  // Count scheduled campaigns
  const scheduledCount = await prisma.campaign.count({
    where: {
      userId: session.user.id,
      isScheduled: true,
    },
  });
  
  // Count stalled campaigns (no activity for more than 5 minutes)
  const stalledCount = await prisma.campaign.count({
    where: {
      userId: session.user.id,
      status: 'processing',
      lastProcessedAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    },
  });
  
  return (
    <div>
      <Header title="Dashboard" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Your Campaigns</h2>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/campaigns/scheduled"
                className="flex items-center px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-100 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                <FiClock className="w-4 h-4 mr-2" />
                Scheduled ({scheduledCount})
              </Link>
              
              {stalledCount > 0 && (
                <Link
                  href="/dashboard/campaigns/stalled"
                  className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <FiAlertTriangle className="w-4 h-4 mr-2" />
                  Stalled ({stalledCount})
                </Link>
              )}
              
              <Link
                href="/dashboard/campaigns/create"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Campaign
              </Link>
            </div>
          </div>
          
          {/* Hobby Plan Warning Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Vercel Hobby Plan Notice</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Due to Vercel Hobby Plan limitations, scheduled campaigns require manual checking.
                    Please visit the Scheduled Campaigns page regularly to ensure your emails are sent on time.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <CampaignsList initialCampaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}