// components/contacts/ContactImporter.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiDownload, FiUpload } from 'react-icons/fi';

interface ContactGroup {
  id: string;
  name: string;
  contactCount: number;
}

export default function ContactImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    duplicates: number;
    total: number;
  } | null>(null);
  
  useEffect(() => {
    fetchGroups();
  }, []);
  
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/contact-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch contact groups');
      }
      const data = await response.json();
      setAvailableGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load contact groups. Please try refreshing the page.');
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          file.type !== 'application/vnd.ms-excel' &&
          file.type !== 'text/csv') {
        setError('Please upload an Excel (.xlsx, .xls) or CSV file');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };
  
  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('groupIds', JSON.stringify(selectedGroups));
      
      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import contacts');
      }
      
      const result = await response.json();
      setImportResult(result);
      
      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = () => {
    // Create a simple CSV template for contacts
    const header = 'email,name,company,phone,address';
    const example = 'john@example.com,John Doe,Acme Inc.,123-456-7890,123 Main St';
    const content = `${header}\n${example}`;
    
    // Create blob and download link
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">Import Contacts</h2>
      <p className="mt-2 text-gray-600">
        Upload an Excel or CSV file with contact information. The file must have an &quot;email&quot; column.
      </p>
      
      {error && (
        <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {importResult && (
        <div className="p-4 mt-4 text-sm text-green-700 bg-green-100 rounded-md">
          <p>Import completed successfully!</p>
          <ul className="mt-2 list-disc list-inside">
            <li>{importResult.imported} new contacts imported</li>
            <li>{importResult.duplicates} existing contacts updated</li>
            <li>{importResult.total} total contacts processed</li>
          </ul>
          <div className="flex mt-4 space-x-4">
            <button
              onClick={() => setImportResult(null)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Import More Contacts
            </button>
            <Link
              href="/dashboard/contacts"
              className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
            >
              View All Contacts
            </Link>
          </div>
        </div>
      )}
      
      {!importResult && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload File</label>
            <div className="flex items-center mt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center px-3 py-2 ml-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Template
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Accepted file formats: .xlsx, .xls, .csv
            </p>
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected file: {selectedFile.name}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Groups (Optional)</label>
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
                      {group.name} ({group.contactCount} contacts)
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
          
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/contacts"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <FiUpload className="w-4 h-4 mr-2" />
                  Import Contacts
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}