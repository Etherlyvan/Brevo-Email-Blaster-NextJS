// components/contacts/ContactsList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiEdit2, FiTrash2, FiMail, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ContactGroup {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  email: string;
  name: string | null;
  groups: ContactGroup[];
  createdAt: string;
}

interface ContactsListProps {
  initialContacts: Contact[];
  totalContacts: number;
}

export default function ContactsList({ initialContacts, totalContacts }: ContactsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [pagination, setPagination] = useState({
    total: totalContacts,
    page: parseInt(searchParams?.get('page') || '1'),
    limit: 20,
    totalPages: Math.ceil(totalContacts / 20)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [selectedGroupId, setSelectedGroupId] = useState(searchParams?.get('groupId') || '');
  const [groups, setGroups] = useState<Array<{ id: string; name: string; contactCount: number }>>([]);
  
  // Fetch contacts when page, search, or group filter changes
  useEffect(() => {
    fetchGroups();
    // Only fetch if we're navigating away from the first page or applying filters
    if (pagination.page > 1 || search || selectedGroupId) {
      fetchContacts(pagination.page, search, selectedGroupId);
    }
  }, [pagination.page, searchParams]);
  
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/contact-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch contact groups');
      }
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };
  
  const fetchContacts = async (page: number, searchQuery = '', groupId = '') => {
    setLoading(true);
    setError(null);
    
    try {
      // Build URL with query parameters
      const url = new URL('/api/contacts', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }
      
      if (groupId) {
        url.searchParams.append('groupId', groupId);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard/contacts?search=${encodeURIComponent(search)}&page=1${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`);
  };
  
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    setSelectedGroupId(groupId);
    router.push(`/dashboard/contacts?page=1${search ? `&search=${encodeURIComponent(search)}` : ''}${groupId ? `&groupId=${groupId}` : ''}`);
  };
  
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }
      
      // Remove from local state
      setContacts(contacts.filter(c => c.id !== contactId));
      // Update total count
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
        totalPages: Math.ceil((prev.total - 1) / prev.limit)
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error deleting contact:', error);
    }
  };
  
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <Link
            href={`/dashboard/contacts?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            aria-disabled={pagination.page === 1}
            tabIndex={pagination.page === 1 ? -1 : 0}
          >
            Previous
          </Link>
          <Link
            href={`/dashboard/contacts?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`}
            className={`relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md ${pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            aria-disabled={pagination.page === pagination.totalPages}
            tabIndex={pagination.page === pagination.totalPages ? -1 : 0}
          >
            Next
          </Link>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> results
            </p>
          </div>
          <div>
            <nav className="inline-flex -space-x-px rounded-md shadow-sm isolate" aria-label="Pagination">
              <Link
                href={`/dashboard/contacts?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`}
                className={`relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md ring-1 ring-inset ring-gray-300 ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                aria-disabled={pagination.page === 1}
                tabIndex={pagination.page === 1 ? -1 : 0}
              >
                <span className="sr-only">Previous</span>
                <FiChevronLeft className="w-5 h-5" aria-hidden="true" />
              </Link>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                // Show pages around the current page
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <Link
                    key={pageNum}
                    href={`/dashboard/contacts?page=${pageNum}${search ? `&search=${encodeURIComponent(search)}` : ''}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      pagination.page === pageNum
                        ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
              
              <Link
                href={`/dashboard/contacts?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`}
                className={`relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md ring-1 ring-inset ring-gray-300 ${pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                aria-disabled={pagination.page === pagination.totalPages}
                tabIndex={pagination.page === pagination.totalPages ? -1 : 0}
              >
                <span className="sr-only">Next</span>
                <FiChevronRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading contacts...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-md">
        <p>{error}</p>
        <button 
          onClick={() => fetchContacts(pagination.page, search, selectedGroupId)}
          className="px-4 py-2 mt-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex flex-1 max-w-md">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FiSearch className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full py-2 pl-10 pr-3 text-sm leading-5 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search contacts..."
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 ml-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Search
          </button>
        </form>
        
        {/* Group filter */}
        <div className="flex-1 max-w-xs">
          <select
            value={selectedGroupId}
            onChange={handleGroupChange}
            className="block w-full py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Contacts</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.contactCount})
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {contacts.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500">No contacts found.</p>
          <p className="mt-2 text-gray-500">
            {search || selectedGroupId
              ? 'Try adjusting your search or filter criteria.'
              : 'Add your first contact to get started.'}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/contacts/create"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Contact
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="flex items-center">
                        <p className="font-medium text-blue-600 truncate">{contact.name || contact.email}</p>
                        {!contact.name && (
                          <span className="ml-2 text-xs font-medium text-gray-500">(No name)</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{contact.email}</p>
                    </div>
                    <div className="flex ml-2 space-x-2">
                      <Link
                        href={`/dashboard/contacts/edit/${contact.id}`}
                        className="p-2 text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                        title="Edit Contact"
                      >
                        <FiEdit2 className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                        title="Delete Contact"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                      <Link
                        href={`/dashboard/campaigns/create?contactId=${contact.id}`}
                        className="p-2 text-green-600 bg-green-100 rounded-full hover:bg-green-200"
                        title="Send Email"
                      >
                        <FiMail className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      {contact.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contact.groups.map((group) => (
                            <span
                              key={group.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {group.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="flex items-center mt-2 text-sm text-gray-500">
                          <span>No groups</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-gray-500 sm:mt-0">
                      <p>
                        Added on {new Date(contact.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {renderPagination()}
        </div>
      )}
    </div>
  );
}