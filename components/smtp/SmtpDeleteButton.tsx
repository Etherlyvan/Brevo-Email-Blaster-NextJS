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
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the SMTP configuration &quot;{smtpName}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end mt-4 space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
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