// app/dashboard/templates/page.tsx
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/dashboard/Header';

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: session?.user?.id },
    orderBy: { updatedAt: 'desc' },
  });
  
  return (
    <div>
      <Header title="Email Templates" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Your Templates</h2>
            <Link
              href="/dashboard/templates/create"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Template
            </Link>
          </div>
          
          {templates.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
              <p className="text-gray-500">No templates found.</p>
              <p className="mt-2 text-gray-500">
                Create your first email template to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="overflow-hidden bg-white rounded-lg shadow">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 truncate">{template.subject}</p>
                    <div className="mt-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg
                          className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <svg
                          className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        <span>
                          Parameters: {template.parameters.length > 0 
                            ? template.parameters.join(', ') 
                            : 'None'}
                        </span>
                      </div>
                    </div>
                    <div className="flex mt-6 space-x-3">

                    <Link
                      href={`/dashboard/templates/${template.id}`} // Ini benar
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View
                    </Link>
                      <Link
                        href={`/dashboard/campaigns/create?templateId=${template.id}`}
                        className="text-sm font-medium text-green-600 hover:text-green-500"
                      >
                        Use in Campaign
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}