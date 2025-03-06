// app/dashboard/contacts/import/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import ContactImporter from '@/components/contacts/ContactImporter';

export default async function ImportContactsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  return (
    <div>
      <Header title="Import Contacts" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <ContactImporter />
        </div>
      </div>
    </div>
  );
}