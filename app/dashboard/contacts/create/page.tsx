// app/dashboard/contacts/create/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import ContactForm from '@/components/contacts/ContactForm';

export default async function CreateContactPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  return (
    <div>
      <Header title="Add New Contact" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}