// components/email/TemplateEditor.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CustomEditor from './CustomEditor';
import { extractTemplateParameters } from '@/lib/utils';

// Define proper error types
interface ApiError {
  message?: string;
  error?: string;
  status?: number;
}

interface TemplateEditorProps {
  template?: {
    id?: string;
    name: string;
    subject: string;
    htmlContent: string;
    parameters: string[];
  };
}

export default function TemplateEditor({ template }: Readonly<TemplateEditorProps>) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [parameters, setParameters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Add state for HTML code view
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const [htmlCodeInput, setHtmlCodeInput] = useState('');
  
  // Example values for preview
  const exampleValues = useRef({
    email: 'john.doe@example.com',
    name: 'John Doe',
    company: 'Acme Inc.'
  });
  
  useEffect(() => {
    if (template) {
      setName(template.name ?? '');
      setSubject(template.subject ?? '');
      setHtmlContent(template.htmlContent ?? '');
      setHtmlCodeInput(template.htmlContent ?? '');
      setParameters(template.parameters ?? []);
    }
  }, [template]);
  
  // Sync HTML content between visual editor and code editor
  useEffect(() => {
    if (!showHtmlCode) {
      setHtmlCodeInput(htmlContent);
    }
  }, [htmlContent, showHtmlCode]);
  
  // Update parameters when HTML content changes
  useEffect(() => {
    if (htmlContent || subject) {
      const extractedParams = extractTemplateParameters(htmlContent);
      // Also check subject for parameters
      const subjectParams = extractTemplateParameters(subject);
      
      // Combine parameters from both sources
      const allParams = [...new Set([...extractedParams, ...subjectParams])];
      setParameters(allParams);
    }
  }, [htmlContent, subject]);
  
  // Apply HTML code from the code editor to the visual editor
  const applyHtmlCode = () => {
    setHtmlContent(htmlCodeInput);
    setShowHtmlCode(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!name || !subject || !htmlContent) {
        throw new Error('Please fill in all required fields');
      }
      
      const response = await fetch('/api/email/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: template?.id, // Include ID if editing
          name,
          subject,
          htmlContent: showHtmlCode ? htmlCodeInput : htmlContent, // Use HTML code if in code view
          parameters,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to save template');
      }
      
      // Navigate directly
      router.push('/dashboard/templates');
      router.refresh();
    } catch (errorObj: unknown) {
      // Type-safe error handling
      const typedError = errorObj as Error | ApiError;
      const errorMessage = 
        typeof typedError === 'object' && typedError !== null
          ? typedError.message ?? 'An error occurred while saving the template'
          : 'An unknown error occurred';
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a preview of the template with example values
  const getPreviewHtml = () => {
    const content = showHtmlCode ? htmlCodeInput : htmlContent;
    let preview = content;
    
    // Replace each parameter with an example value
    parameters.forEach(param => {
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
    let previewSubject = subject;
    
    parameters.forEach(param => {
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
    if (parameters.length === 0) {
      return <p className="text-gray-500">No parameters detected. Use {'{{parameter}}'} syntax in your template.</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {parameters.map((param, index) => (
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
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Template Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Welcome Email"
            required
          />
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Email Subject *
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Welcome to {{company}}, {{name}}!"
            required
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="editor" className="block text-sm font-medium text-gray-700">
              Email Content *
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowHtmlCode(!showHtmlCode)}
                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                {showHtmlCode ? 'Visual Editor' : 'HTML Code'}
              </button>
              
              {showHtmlCode && (
                <button
                  type="button"
                  onClick={applyHtmlCode}
                  className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-md hover:bg-green-200"
                >
                  Apply HTML
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-1">
            {showHtmlCode ? (
              <div className="border border-gray-300 rounded-md">
                <textarea
                  value={htmlCodeInput}
                  onChange={(e) => setHtmlCodeInput(e.target.value)}
                  className="w-full h-64 p-3 font-mono text-sm border-0 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="<p>Enter your HTML code here...</p>"
                />
              </div>
            ) : (
              <CustomEditor
                value={htmlContent}
                onChange={setHtmlContent}
                className="bg-white rounded-md"
                placeholder="Write your email content here... Use {{parameter}} for dynamic content."
              />
            )}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700">Detected Parameters</h3>
          <div className="mt-2">
            {renderParameters()}
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Template Preview</h3>
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
              <div className="p-2 mb-4 bg-gray-100 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-700">
                  Subject: {getPreviewSubject()}
                </p>
              </div>
              <div 
                className="prose prose-sm max-h-96 overflow-y-auto p-4 border border-gray-200 rounded"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </form>
    </div>
  );
}