// app/dashboard/templates/edit/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import TemplateEditor from '@/components/email/TemplateEditor';

// Define params type
type Params = Promise<{ id: string }>;

// Correct syntax for the component props
export default async function EditTemplatePage({ params }: { params: Params }) {
  const { id } = await params;  // Await the params Promise
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4 text-red-600">You must be logged in to access this page</p>
        <Link href="/login" className="px-4 py-2 text-white bg-blue-600 rounded">
          Go to Login
        </Link>
      </div>
    );
  }
  
  const template = await prisma.emailTemplate.findUnique({
    where: {
      id: id,  // Use the extracted id
      userId: session.user.id,
    },
  });
  
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4 text-red-600">Template not found</p>
        <Link href="/dashboard/templates" className="px-4 py-2 text-white bg-blue-600 rounded">
          Back to Templates
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <Header title={`Edit Template: ${template.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <TemplateEditor template={template} />
        </div>
      </div>
    </div>
  );
}