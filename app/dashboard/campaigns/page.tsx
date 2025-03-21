// app/dashboard/campaigns/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import { FiClock } from 'react-icons/fi';

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Please sign in to access this page</div>;
  }
  
  const campaigns = await prisma.campaign.findMany({
    where: { 
      userId: session.user.id,
      isScheduled: false, // Only show non-scheduled campaigns
    },
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { name: true } },
    },
  });
  
  // Count scheduled campaigns
  const scheduledCount = await prisma.campaign.count({
    where: {
      userId: session.user.id,
      isScheduled: true,
    },
  });
  
  return (
    <div>
      <Header title="Email Campaigns" />
      
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
              <Link
                href="/dashboard/campaigns/create"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Campaign
              </Link>
            </div>
          </div>
          
          {campaigns.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
              <p className="text-gray-500">No campaigns found.</p>
              <p className="mt-2 text-gray-500">
                Create your first email campaign to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="font-medium text-blue-600 truncate">{campaign.name}</p>
                          <div className="ml-2">
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 
                                campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                                campaign.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'}
                            `}>
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 ml-2">
                          <Link
                            href={`/dashboard/campaigns/${campaign.id}`}
                            className="font-medium text-blue-600 hover:text-blue-500"
                          >
                            View Details
                          </Link>
                          {(campaign.status === 'draft' || campaign.status === 'queued') && (
                            <Link
                              href={`/dashboard/campaigns/edit/${campaign.id}/schedule`}
                              className="ml-4 font-medium text-purple-600 hover:text-purple-500"
                            >
                              Schedule
                            </Link>
                          )}
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
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}