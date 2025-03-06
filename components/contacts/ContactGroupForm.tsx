// components/contacts/ContactGroupForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContactGroupFormProps {
  groupId?: string;
}

export default function ContactGroupForm({ groupId }: ContactGroupFormProps = {}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (groupId) {
      setIsEditing(true);
      fetchGroupDetails(groupId);
    }
  }, [groupId]);
  
  const fetchGroupDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contact-groups/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group details');
      }
      
      const group = await response.json();
      
      setName(group.name);
      setDescription(group.description || '');
    } catch (error) {
      console.error('Error fetching group:', error);
      setError('Failed to load group details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!name) {
        throw new Error('Group name is required');
      }
      
      const groupData = {
        name,
        description: description || null,
      };
      
      const url = isEditing ? `/api/contact-groups/${groupId}` : '/api/contact-groups';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save contact group');
      }
      
      // Redirect back to groups list
      router.push('/dashboard/contact-groups');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading group details...</span>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {error && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Group Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard/contact-groups"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
}