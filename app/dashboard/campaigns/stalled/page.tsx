// app/dashboard/campaigns/stalled/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import StalledCampaignsList from '@/components/campaigns/StalledCampaignsList';

export default async function StalledCampaignsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Please sign in to access this page</div>;
  }
  
  // Get stalled campaigns (no activity for more than 5 minutes)
  const stalledCampaignsData = await prisma.campaign.findMany({
    where: {
      userId: session.user.id,
      status: 'processing',
      lastProcessedAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      lastProcessedAt: 'asc', // Show oldest first
    },
  });
  
  // Convert Date objects to strings to match the expected interface
  const stalledCampaigns = stalledCampaignsData.map(campaign => ({
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    // Convert Date objects to strings, handling null values
    lastProcessedAt: campaign.lastProcessedAt ? campaign.lastProcessedAt.toISOString() : '',
    startedAt: campaign.startedAt ? campaign.startedAt.toISOString() : null,
    completedAt: campaign.completedAt ? campaign.completedAt.toISOString() : null,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
  }));
  
  return (
    <div>
      <Header title="Stalled Campaigns" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Stalled Campaigns</h2>
            <Link
              href="/dashboard/campaigns"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to Campaigns
            </Link>
          </div>
          
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">About Stalled Campaigns</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Stalled campaigns are those that have started processing but haven&apos;t had any activity for 5 minutes or more.
                    This can happen due to Vercel Hobby Plan limitations on background processing.
                    You can restart these campaigns to continue sending emails.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <StalledCampaignsList initialCampaigns={stalledCampaigns} />
        </div>
      </div>
    </div>
  );
}