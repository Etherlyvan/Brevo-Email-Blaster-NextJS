// app/dashboard/campaigns/scheduled/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import ScheduledCampaignsList from '@/components/campaigns/ScheduledCampaignsList';

export default async function ScheduledCampaignsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  // Fetch scheduled campaigns
  const scheduledCampaigns = await prisma.campaign.findMany({
    where: {
      userId: session.user.id,
      isScheduled: true,
    },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      scheduledFor: 'asc',
    },
  });
  
  // Ensure all dates are properly serialized to ISO strings
  const serializedCampaigns = scheduledCampaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    recipientCount: campaign.recipientCount,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
    template: {
      name: campaign.template.name,
    },
  }));
  
  return (
    <div>
      <Header title="Scheduled Campaigns" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Scheduled Email Campaigns</h2>
            <Link
              href="/dashboard/campaigns/create"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Campaign
            </Link>
          </div>
          
          <ScheduledCampaignsList initialCampaigns={serializedCampaigns} />
        </div>
      </div>
    </div>
  );
}