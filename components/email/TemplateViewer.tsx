// components/email/TemplateViewer.tsx
'use client';

import { useState, useRef } from 'react';
import { formatDate } from '@/lib/utils';

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
  
  // Example values for preview
  const exampleValues = useRef({
    email: 'john.doe@example.com',
    name: 'John Doe',
    company: 'Acme Inc.'
  });
  
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
      <div className="p-6 bg-white rounded-lg shadow">
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