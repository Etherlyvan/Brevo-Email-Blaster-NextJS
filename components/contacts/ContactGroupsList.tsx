// components/contacts/ContactGroupsList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

export default function ContactGroupsList() {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchGroups();
  }, []);
  
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/contact-groups');
      
      if (!response.ok) {
        throw new Error('Failed to fetch contact groups');
      }
      
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will not delete the contacts.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/contact-groups/${groupId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete group');
      }
      
      // Refresh the groups list
      fetchGroups();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error deleting group:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading groups...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-md">
        <p>{error}</p>
        <button 
          onClick={fetchGroups}
          className="px-4 py-2 mt-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (groups.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
        <p className="text-gray-500">No contact groups found.</p>
        <p className="mt-2 text-gray-500">
          Create your first contact group to organize your contacts.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/contact-groups/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Group
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {groups.map((group) => (
          <li key={group.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="flex items-center">
                    <p className="font-medium text-blue-600 truncate">{group.name}</p>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {group.contactCount} contacts
                    </span>
                  </div>
                  {group.description && (
                    <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                  )}
                </div>
                <div className="flex ml-2 space-x-2">
                  <Link
                    href={`/dashboard/contact-groups/edit/${group.id}`}
                    className="p-2 text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                    title="Edit Group"
                  >
                    <FiEdit2 className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                    title="Delete Group"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                  <Link
                    href={`/dashboard/contacts?groupId=${group.id}`}
                    className="p-2 text-green-600 bg-green-100 rounded-full hover:bg-green-200"
                    title="View Contacts"
                  >
                    <FiUsers className="w-5 h-5" />
                  </Link>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    Created on {new Date(group.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}