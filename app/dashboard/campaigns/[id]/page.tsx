// app/dashboard/campaigns/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import CampaignStatusMonitor from '@/components/email/CampaignStatusMonitor';

export default async function CampaignDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // Fetch campaign with related data
  const campaign = await prisma.campaign.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
    include: {
      template: true,
      smtpConfig: {
        select: {
          id: true,
          name: true,
          host: true,
          fromEmail: true,
          fromName: true,
        },
      },
    },
  });
  
  if (!campaign) {
    notFound();
  }
  
  return (
    <div>
      <Header title={`Campaign: ${campaign.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <Link
              href="/dashboard/campaigns"
              className="text-blue-600 hover:text-blue-500"
            >
              ← Back to Campaigns
            </Link>
          </div>
          
          <CampaignStatusMonitor campaignId={campaign.id} />
          
          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Campaign Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Template</h4>
                <p className="mt-1">{campaign.template.name}</p>
                <p className="mt-1 text-sm text-gray-500">Subject: {campaign.template.subject}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">SMTP Configuration</h4>
                <p className="mt-1">{campaign.smtpConfig?.name || 'N/A'}</p>
                <p className="mt-1 text-sm text-gray-500">
                  From: {campaign.smtpConfig?.fromName} &lt;{campaign.smtpConfig?.fromEmail}&gt;
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500">Email Preview</h4>
              <div className="mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="prose prose-sm max-h-64 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: campaign.template.htmlContent }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}