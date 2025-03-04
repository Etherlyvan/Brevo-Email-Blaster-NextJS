// app/dashboard/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Fetch user's stats
  const [smtpCount, templateCount, campaignCount] = await Promise.all([
    prisma.smtpConfig.count({ where: { userId: session?.user?.id } }),
    prisma.emailTemplate.count({ where: { userId: session?.user?.id } }),
    prisma.campaign.count({ where: { userId: session?.user?.id } }),
  ]);
  
  return (
    <div>
      <Header title="Dashboard" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* SMTP Configurations Card */}
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    SMTP Configurations
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {smtpCount}
                  </dd>
                </dl>
              </div>
            </div>
            
            {/* Email Templates Card */}
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Email Templates
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {templateCount}
                  </dd>
                </dl>
              </div>
            </div>
            
            {/* Campaigns Card */}
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Campaigns
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {campaignCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Getting Started</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">1. Configure SMTP</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Add your SMTP server details to start sending emails.
                </p>
              </div>
              
              <div className="relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">2. Create Templates</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Design email templates with dynamic parameters for personalization.
                </p>
              </div>
              
              <div className="relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">3. Send Campaigns</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload recipients from Excel and send personalized emails to your audience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}