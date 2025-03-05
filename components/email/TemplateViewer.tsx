// components/email/TemplateViewer.tsx
'use client';

import { useState, useRef } from 'react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface TemplateViewerProps {
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    parameters: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

export default function TemplateViewer({ template }: TemplateViewerProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  
  // Example values for preview
  const exampleValues = useRef({
    email: 'john.doe@example.com',
    name: 'John Doe',
    company: 'Acme Inc.'
  });
  
  // Handle template deletion
  const handleDelete = async () => {
    if (!template.id) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
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
      setShowDeleteConfirm(false);
    }
  };
  
  // Generate a preview of the template with example values
  const getPreviewHtml = () => {
    let preview = template.htmlContent;
    
    // Replace each parameter with an example value
    template.parameters.forEach(param => {
      const regex = new RegExp(`{{\\s*${param}\\s*}}`, 'g');
      
      // Choose example value based on parameter name
      let exampleValue: string;
      const paramLower = param.toLowerCase();
      
      if (paramLower.includes('email')) {
        exampleValue = exampleValues.current.email;
      } else if (paramLower.includes('name')) {
        exampleValue = exampleValues.current.name;
      } else if (paramLower.includes('company')) {
        exampleValue = exampleValues.current.company;
      } else {
        exampleValue = `[Example ${param}]`;
      }
      
      preview = preview.replace(regex, exampleValue);
    });
    
    return preview;
  };
  
  // Generate preview subject with example values
  const getPreviewSubject = () => {
    let previewSubject = template.subject;
    
    template.parameters.forEach(param => {
      const regex = new RegExp(`{{\\s*${param}\\s*}}`, 'g');
      
      // Choose example value based on parameter name
      let exampleValue: string;
      const paramLower = param.toLowerCase();
      
      if (paramLower.includes('email')) {
        exampleValue = exampleValues.current.email;
      } else if (paramLower.includes('name')) {
        exampleValue = exampleValues.current.name;
      } else if (paramLower.includes('company')) {
        exampleValue = exampleValues.current.company;
      } else {
        exampleValue = `[Example ${param}]`;
      }
      
      previewSubject = previewSubject.replace(regex, exampleValue);
    });
    
    return previewSubject;
  };
  
  const renderParameters = () => {
    if (template.parameters.length === 0) {
      return <p className="text-gray-500">No parameters detected in this template.</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {template.parameters.map((param, index) => (
          <div 
            key={`${param}-${index}`} 
            className="px-2 py-1 text-sm bg-blue-100 rounded-md text-blue-800"
          >
            <span>{`${param}`}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the template &quot;{template.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end mt-4 space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
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
      
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Template Details</h3>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-sm font-medium">{formatDate(template.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium">{formatDate(template.updatedAt)}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Subject</h3>
              <p className="mt-1 text-sm font-medium">{template.subject}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Parameters</h3>
              <div className="mt-2">
                {renderParameters()}
              </div>
            </div>
          </div>
          
          {/* Delete Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete Template
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        
        {showPreview && (
          <>
            <div className="p-3 mb-4 bg-gray-100 border border-gray-200 rounded">
              <p className="text-sm font-medium text-gray-700">
                Subject: {getPreviewSubject()}
              </p>
            </div>
            <div 
              className="prose prose-sm max-h-[500px] overflow-y-auto p-6 border border-gray-200 rounded bg-white"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </>
        )}
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">HTML Source</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words text-gray-800">
            {template.htmlContent}
          </pre>
        </div>
      </div>
    </div>
  );
}