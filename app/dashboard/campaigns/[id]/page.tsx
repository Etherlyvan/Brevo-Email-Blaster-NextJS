// app/dashboard/campaigns/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import CampaignViewer from '@/components/email/CampaignViewer';
import { Prisma } from '@prisma/client';

type Params = Promise<{ id: string }>;

// Helper function to safely parse JSON values
function parseJsonValue(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch (e) {
      console.error('Error parsing JSON string:', e);
      return {};
    }
  }
  return value as Record<string, unknown>;
}

export default async function CampaignDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // Fetch campaign with related data
  const campaignData = await prisma.campaign.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
    include: {
      template: true,
      recipients: {
        take: 100, // Limit to prevent loading too many records
      },
    },
  });
  
  if (!campaignData) {
    notFound();
  }
  
  // Process the campaign data to ensure proper typing
  const campaign = {
    ...campaignData,
    // Parse parameterValues from JsonValue to proper Record<string, unknown>
    parameterValues: parseJsonValue(campaignData.parameterValues),
    // Process each recipient to ensure metadata is properly typed
    recipients: campaignData.recipients.map(recipient => ({
      ...recipient,
      metadata: parseJsonValue(recipient.metadata)
    }))
  };
  
  // Get SMTP configuration if available
  let smtpConfig = null;
  if (campaign.smtpConfigId) {
    smtpConfig = await prisma.smtpConfig.findUnique({
      where: {
        id: campaign.smtpConfigId,
      },
      select: {
        id: true,
        name: true,
        host: true,
        fromEmail: true,
        fromName: true,
      },
    });
  }
  
  return (
    <div>
      <Header title={`Campaign: ${campaign.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">{campaign.name}</h2>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/campaigns"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back to Campaigns
              </Link>
            </div>
          </div>
          
          <CampaignViewer campaign={campaign} smtpConfig={smtpConfig} />
        </div>
      </div>
    </div>
  );
}