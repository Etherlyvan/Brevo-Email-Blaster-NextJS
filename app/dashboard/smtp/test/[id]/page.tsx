// app/dashboard/smtp/test/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import SmtpTestForm from '@/components/smtp/SmtpTestForm';

type Params = Promise<{ id: string }>;

export default async function TestSmtpPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // Fetch the SMTP configuration
  const smtpConfig = await prisma.smtpConfig.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
  });
  
  if (!smtpConfig) {
    notFound();
  }
  
  return (
    <div>
      <Header title={`Test SMTP Configuration: ${smtpConfig.name}`} />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <SmtpTestForm smtpConfig={smtpConfig} />
        </div>
      </div>
    </div>
  );
}