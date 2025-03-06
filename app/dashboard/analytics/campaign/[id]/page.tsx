// app/dashboard/analytics/campaign/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import AnalyticsDashboard from '@/components/analytics/Dashboard';

export default async function CampaignAnalyticsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Await the params promise to get the actual parameters
  const { id } = await params;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  // Verify the campaign exists and belongs to the user
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: id,
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  if (!campaign) {
    notFound();
  }
  
  return (
    <div>
      <Header title={`Analytics: ${campaign.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <Link
              href="/dashboard/analytics"
              className="text-blue-600 hover:text-blue-500"
            >
              ← Back to All Analytics
            </Link>
          </div>
          
          <AnalyticsDashboard campaignId={campaign.id} />
        </div>
      </div>
    </div>
  );
}