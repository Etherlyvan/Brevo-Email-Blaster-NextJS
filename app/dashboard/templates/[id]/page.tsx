// app/dashboard/templates/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import TemplateViewer from '@/components/email/TemplateViewer';

type Params = Promise<{ id: string }>;

export default async function TemplatePage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  const template = await prisma.emailTemplate.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
  });
  
  if (!template) {
    notFound();
  }
  
  return (
    <div>
      <Header title={`Template: ${template.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">{template.name}</h2>
            <div className="flex space-x-3">
              <Link
                href={`/dashboard/templates/edit/${id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Edit Template
              </Link>
              <Link
                href={`/dashboard/campaigns/create?templateId=${id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Use in Campaign
              </Link>
              <Link
                href="/dashboard/templates"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back to Templates
              </Link>
            </div>
          </div>
          
          <TemplateViewer template={template} />
        </div>
      </div>
    </div>
  );
}