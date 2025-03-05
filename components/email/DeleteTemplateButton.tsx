// components/email/DeleteTemplateButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteTemplateButtonProps {
  templateId: string;
  templateName: string;
  className?: string;
}

export default function DeleteTemplateButton({ 
  templateId, 
  templateName,
  className = ''
}: DeleteTemplateButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }
      
      // Navigate back to templates list after successful deletion
      router.push('/dashboard/templates');
      router.refresh();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
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
        className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
      >
        Delete
      </button>
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the template &quot;{templateName}&quot;? This action cannot be undone.
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}