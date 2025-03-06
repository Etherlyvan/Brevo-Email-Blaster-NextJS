// components/contacts/ContactGroupSelector.tsx
import { useState, useEffect } from 'react';

interface ContactGroup {
  id: string;
  name: string;
  contactCount: number;
}

interface ContactGroupSelectorProps {
  selectedGroups: string[];
  onChange: (groupIds: string[]) => void;
}

export default function ContactGroupSelector({ 
  selectedGroups, 
  onChange 
}: ContactGroupSelectorProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/contact-groups');
        if (!response.ok) {
          throw new Error('Failed to fetch contact groups');
        }
        
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);
  
  const handleGroupToggle = (groupId: string) => {
    const newSelection = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];
    
    onChange(newSelection);
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading contact groups...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (groups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No contact groups found. Create some groups first.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">
        Select contact groups to include in this campaign
      </div>
      
      <div className="space-y-2">
        {groups.map(group => (
          <div key={group.id} className="flex items-center">
            <input
              type="checkbox"
              id={`group-${group.id}`}
              checked={selectedGroups.includes(group.id)}
              onChange={() => handleGroupToggle(group.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label 
              htmlFor={`group-${group.id}`} 
              className="ml-2 block text-sm text-gray-900"
            >
              {group.name} <span className="text-gray-500">({group.contactCount} contacts)</span>
            </label>
          </div>
        ))}
      </div>
      
      {selectedGroups.length > 0 && (
        <div className="text-sm text-blue-600">
          {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}