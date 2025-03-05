// components/smtp/SmtpDeleteButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiTrash2 } from 'react-icons/fi';

interface SmtpDeleteButtonProps {
  smtpId: string;
  smtpName: string;
  onDelete?: () => void;
  iconSize?: number;
}

export default function SmtpDeleteButton({ 
  smtpId, 
  smtpName, 
  onDelete,
  iconSize = 5
}: Readonly<SmtpDeleteButtonProps>) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/smtp/${smtpId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete SMTP configuration');
      }
      
      if (onDelete) {
        onDelete();
      } else {
        router.push('/dashboard/smtp');
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting SMTP config:', error);
      alert('Failed to delete SMTP configuration. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };
  
  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
        title="Delete Configuration"
      >
        <FiTrash2 className={`w-${iconSize} h-${iconSize}`} />
      </button>
      
      {/* Improved Modal with Text Overflow Handling */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-gray-500 overflow-hidden overflow-wrap-anywhere">
                Are you sure you want to delete the SMTP configuration &quot;<span className="font-medium text-gray-700 break-all">{smtpName}</span>&quot;? This action cannot be undone.
              </p>
            </div>
            
            <div className="px-5 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}