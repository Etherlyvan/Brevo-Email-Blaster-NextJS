// app/dashboard/contacts/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';
import ContactsList from '@/components/contacts/ContactsList';

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Please sign in to access this page</div>;
  }
  
  // Get total contact count for pagination info
  const totalContacts = await prisma.contact.count({
    where: { userId: session.user.id }
  });
  
  // Get first page of contacts with their groups
  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    include: {
      groups: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
  
  // Format the contacts for the component
  const formattedContacts = contacts.map(contact => {
    // Extract groups from the contact object
    const contactGroups = contact.groups.map(g => ({
      id: g.group.id,
      name: g.group.name,
    }));
    
    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      metadata: contact.metadata,
      groups: contactGroups,
      createdAt: contact.createdAt.toISOString(),
    };
  });
  
  return (
    <div>
      <Header title="Contacts Management" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Your Contacts</h2>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/contacts/create"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Contact
              </Link>
              <Link
                href="/dashboard/contacts/import"
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Import Contacts
              </Link>
              <Link
                href="/dashboard/contact-groups"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Manage Groups
              </Link>
            </div>
          </div>
          
          <ContactsList initialContacts={formattedContacts} totalContacts={totalContacts} />
        </div>
      </div>
    </div>
  );
}