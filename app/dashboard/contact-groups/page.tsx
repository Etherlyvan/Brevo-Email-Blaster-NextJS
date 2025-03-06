// app/dashboard/contact-groups/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import Header from '@/components/dashboard/Header';
import ContactGroupsList from '@/components/contacts/ContactGroupsList';

export default async function ContactGroupsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  return (
    <div>
      <Header title="Contact Groups" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Your Contact Groups</h2>
            <Link
              href="/dashboard/contact-groups/create"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Group
            </Link>
          </div>
          
          <ContactGroupsList />
        </div>
      </div>
    </div>
  );
}