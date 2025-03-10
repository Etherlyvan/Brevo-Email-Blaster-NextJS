// app/dashboard/campaigns/create/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import CampaignForm from '@/components/email/CampaignForm';

export default async function CreateCampaignPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }
  
  return (
    <div>
      <Header title="Create Campaign" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <CampaignForm />
        </div>
      </div>
    </div>
  );
}