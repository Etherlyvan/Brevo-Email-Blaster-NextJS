// app/dashboard/campaigns/edit/[id]/schedule/page.tsx
import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import CampaignScheduleForm from '@/components/campaigns/CampaignScheduleForm';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCampaignSchedulePage({ 
  params 
}: PageProps) {
  // Await params untuk mendapatkan id
  const { id } = await params;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // Fetch campaign data
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });
  
  if (!campaign) {
    notFound();
  }
  
  // Only allow editing schedule for draft, queued, or scheduled campaigns
  if (!['draft', 'queued'].includes(campaign.status) && !campaign.isScheduled) {
    redirect(`/dashboard/campaigns/${id}`);
  }
  
  return (
    <div>
      <Header title={`Edit Schedule: ${campaign.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <CampaignScheduleForm campaignId={campaign.id} initialData={{
            name: campaign.name,
            isScheduled: campaign.isScheduled,
            scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
          }} />
        </div>
      </div>
    </div>
  );
}