// app/dashboard/contact-groups/create/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import ContactGroupForm from '@/components/contacts/ContactGroupForm';

export default async function CreateContactGroupPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  return (
    <div>
      <Header title="Create Contact Group" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <ContactGroupForm />
        </div>
      </div>
    </div>
  );
}