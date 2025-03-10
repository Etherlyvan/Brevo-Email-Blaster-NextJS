// components/contacts/ContactForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContactFormProps {
  contactId?: string;
}

interface ContactGroup {
  id: string;
  name: string;
}

export default function ContactForm({ contactId }: ContactFormProps = {}) {
  const router = useRouter();
  const isMounted = useRef(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<ContactGroup[]>([]);
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    // Set isMounted to true when component mounts
    isMounted.current = true;
    
    // Fetch groups when component mounts
    fetchGroups();
    
    // If contactId is provided, fetch contact details
    if (contactId) {
      setIsEditing(true);
      fetchContactDetails(contactId);
    }
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted.current = false;
    };
  }, [contactId]);
  
  const fetchGroups = async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/contact-groups');
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch contact groups: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if component is still mounted before updating state
      if (isMounted.current) {
        setAvailableGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Only update error state if component is still mounted
      if (isMounted.current) {
        setError('Failed to load contact groups. Please try refreshing the page.');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };
  
  const fetchContactDetails = async (id: string) => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/contacts/${id}`);
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch contact details: ${response.status}`);
      }
      
      const contact = await response.json();
      
      // Check if component is still mounted before updating state
      if (isMounted.current) {
        setEmail(contact.email);
        setName(contact.name || '');
        
        // Set selected groups
        if (contact.groups && contact.groups.length > 0) {
          setSelectedGroups(contact.groups.map((g: { id: string }) => g.id));
        }
        
        // Set custom fields from metadata
        if (contact.metadata && typeof contact.metadata === 'object') {
          const fields = Object.entries(contact.metadata)
            .filter(([key]) => key !== 'email' && key !== 'name')
            .map(([key, value]) => ({ key, value: String(value) }));
          
          if (fields.length > 0) {
            setCustomFields(fields);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      // Only update error state if component is still mounted
      if (isMounted.current) {
        setError('Failed to load contact details. Please try again.');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };
  
  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };
  
  const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
    
    // Add a new empty field if this is the last one and has data
    if (index === customFields.length - 1 && newFields[index].key && newFields[index].value) {
      setCustomFields([...newFields, { key: '', value: '' }]);
    }
  };
  
  const removeCustomField = (index: number) => {
    if (customFields.length > 1) {
      setCustomFields(customFields.filter((_, i) => i !== index));
    } else {
      // If it's the last field, just clear it
      setCustomFields([{ key: '', value: '' }]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      
      // Create metadata object from custom fields
      const metadata: Record<string, string> = {};
      customFields.forEach(field => {
        if (field.key && field.value) {
          metadata[field.key] = field.value;
        }
      });
      
      const contactData = {
        email,
        name: name || null,
        groupIds: selectedGroups,
        metadata,
      };
      
      const url = isEditing ? `/api/contacts/${contactId}` : '/api/contacts';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save contact');
      }
      
      // Redirect back to contacts list
      router.push('/dashboard/contacts');
      router.refresh();
    } catch (error) {
      console.error('Error saving contact:', error);
      // Only update error state if component is still mounted
      if (isMounted.current) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };
  
  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading contact details...</span>
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Groups</label>
          <div className="mt-2 space-y-2">
            {availableGroups.length > 0 ? (
              availableGroups.map((group) => (
                <div key={group.id} className="flex items-center">
                  <input
                    id={`group-${group.id}`}
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`group-${group.id}`} className="ml-2 text-sm text-gray-700">
                    {group.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No contact groups available.{' '}
                <Link href="/dashboard/contact-groups" className="text-blue-600 hover:text-blue-500">
                  Create a group
                </Link>
              </p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Custom Fields</label>
          <p className="mt-1 text-sm text-gray-500">
            Add any additional information you want to store for this contact.
          </p>
          
          <div className="mt-2 space-y-3">
            {customFields.map((field, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                  placeholder="Field name"
                  className="block w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                  aria-label="Remove field"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard/contacts"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Contact' : 'Add Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}