// components/smtp/SmtpList.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Define proper types for SMTP configurations
interface SmtpConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define error type for better error handling
interface ApiError {
  message?: string;
  error?: string;
  status?: number;
}

export default function SmtpList() {
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    fetchSmtpConfigs();
  }, []);
  
  const fetchSmtpConfigs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/smtp');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch SMTP configurations');
      }
      
      const data = await response.json();
      setSmtpConfigs(data);
    } catch (errorObj: unknown) {
      // Type-safe error handling
      const typedError = errorObj as Error | ApiError;
      const errorMessage = 
        typeof typedError === 'object' && typedError !== null
          ? typedError.message || 'An error occurred while fetching SMTP configurations'
          : 'An unknown error occurred';
      
      setError(errorMessage);
      console.error('Error fetching SMTP configs:', typedError);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/smtp/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete SMTP configuration');
      }
      
      // Remove the deleted config from the state
      setSmtpConfigs(prev => prev.filter(config => config.id !== id));
    } catch (errorObj: unknown) {
      // Type-safe error handling
      const typedError = errorObj as Error | ApiError;
      const errorMessage = 
        typeof typedError === 'object' && typedError !== null
          ? typedError.message || 'An error occurred while deleting the SMTP configuration'
          : 'An unknown error occurred';
      
      setError(errorMessage);
      console.error('Error deleting SMTP config:', typedError);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };
  
  // Extract the rendering logic for different states to improve readability
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Loading configurations...</span>
        </div>
      );
    }
    
    // Error state
    if (error) {
      return (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">
          <p>{error}</p>
          <button 
            onClick={fetchSmtpConfigs}
            className="px-4 py-2 mt-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    // Empty state
    if (smtpConfigs.length === 0) {
      return (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500">No SMTP configurations found.</p>
          <p className="mt-2 text-gray-500">
            Add your first SMTP configuration to start sending emails.
          </p>
          <Link
            href="/dashboard/smtp/create"
            className="inline-block px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add SMTP Configuration
          </Link>
        </div>
      );
    }
    
    // List state - showing the SMTP configurations
    return (
      <div className="overflow-hidden border border-gray-200 rounded-md shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Host
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                From Email
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {smtpConfigs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {config.name}
                    </div>
                    {config.isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 ml-2 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{config.host}:{config.port}</div>
                  <div className="text-sm text-gray-500">
                    {config.secure ? 'SSL/TLS' : 'Unencrypted'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{config.fromEmail}</div>
                  {config.fromName && (
                    <div className="text-sm text-gray-500">{config.fromName}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/smtp/edit/${config.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(config.id)}
                      disabled={isDeleting && deleteId === config.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {isDeleting && deleteId === config.id ? 'Deleting...' : 'Delete'}
                    </button>
                    <Link
                      href={`/dashboard/smtp/test/${config.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Test
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">SMTP Configurations</h2>
        <Link
          href="/dashboard/smtp/create"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Configuration
        </Link>
      </div>
      
      {renderContent()}
    </div>
  );
}