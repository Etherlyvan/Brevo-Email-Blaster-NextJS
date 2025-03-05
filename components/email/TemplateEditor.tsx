// components/email/TemplateEditor.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CustomEditor from './CustomEditor';
import { extractTemplateParameters } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'visual' | 'html'>('visual');
  const [htmlSource, setHtmlSource] = useState('');
  
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
      setHtmlSource(template.htmlContent ?? '');
      setParameters(template.parameters ?? []);
    }
  }, [template]);
  
  // Sync visual editor content to HTML source when in visual mode
  useEffect(() => {
    if (activeTab === 'visual') {
      setHtmlSource(htmlContent);
    }
  }, [htmlContent, activeTab]);
  
  // Update parameters when HTML content or subject changes
  useEffect(() => {
    const content = activeTab === 'visual' ? htmlContent : htmlSource;
    
    if (content || subject) {
      const extractedParams = extractTemplateParameters(content);
      const subjectParams = extractTemplateParameters(subject);
      
      // Combine parameters from both sources
      const allParams = [...new Set([...extractedParams, ...subjectParams])];
      setParameters(allParams);
    }
  }, [htmlContent, htmlSource, subject, activeTab]);
  
  // Apply HTML source changes to visual editor when switching tabs
  const handleTabChange = (tab: 'visual' | 'html') => {
    if (tab === 'visual' && activeTab === 'html') {
      // Switching from HTML to Visual - update visual editor content
      setHtmlContent(htmlSource);
    }
    setActiveTab(tab);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // Get the final HTML content based on active tab
      const finalHtmlContent = activeTab === 'visual' ? htmlContent : htmlSource;
      
      if (!name || !subject || !finalHtmlContent) {
        throw new Error('Please fill in all required fields');
      }
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: template?.id,
          name,
          subject,
          htmlContent: finalHtmlContent,
          parameters,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to save template');
      }
      
      router.push('/dashboard/templates');
      router.refresh();
    } catch (errorObj: unknown) {
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
    // Use the appropriate HTML content based on the active tab
    const content = activeTab === 'visual' ? htmlContent : htmlSource;
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
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Welcome to {{company}}, {{name}}!"
            required
          />
        </div>
        
        <div>
          <label htmlFor="editor" className="block text-sm font-medium text-gray-700">
            Email Content *
          </label>
          
          {/* Editor Tabs */}
          <div className="flex border-b border-gray-200 mt-2">
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'visual' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => handleTabChange('visual')}
            >
              Visual Editor
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'html' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => handleTabChange('html')}
            >
              HTML Source
            </button>
          </div>
          
          <div className="mt-2">
            {activeTab === 'visual' ? (
              <CustomEditor
                value={htmlContent}
                onChange={setHtmlContent}
                className="bg-white rounded-md"
                placeholder="Write your email content here... Use {{parameter}} for dynamic content."
              />
            ) : (
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <textarea
                  value={htmlSource}
                  onChange={(e) => setHtmlSource(e.target.value)}
                  className="w-full min-h-[300px] p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter HTML code here... Use {{parameter}} for dynamic content."
                />
              </div>
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
            {isLoading ? 'Saving...' : template?.id ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}