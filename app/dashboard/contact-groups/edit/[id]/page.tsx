// app/dashboard/contact-groups/edit/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import ContactGroupForm from '@/components/contacts/ContactGroupForm';

export default async function EditContactGroupPage({ 
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
  
  return (
    <div>
      <Header title="Edit Contact Group" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <ContactGroupForm groupId={id} />
        </div>
      </div>
    </div>
  );
}