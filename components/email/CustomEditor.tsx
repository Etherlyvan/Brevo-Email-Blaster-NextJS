// components/email/CustomEditor.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface CustomEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomEditor({ 
  value, 
  onChange, 
  placeholder = 'Write your content here...',
  className = ''
}: CustomEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize the editor once mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Initialize iframe after it's mounted
  useEffect(() => {
    if (isMounted && iframeRef.current && !isInitialized) {
      // Wait a bit to ensure iframe is fully loaded
      const timer = setTimeout(() => {
        initializeIframeEditor();
        setIsInitialized(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMounted, isInitialized]);
  
  // Update iframe content when value changes
  useEffect(() => {
    if (!isInitialized || !iframeRef.current) return;
    
    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc || !doc.body) return;
      
      // Only update if content is different and we're not editing
      const currentContent = doc.body.innerHTML;
      if (currentContent !== value) {
        doc.body.innerHTML = value || '';
      }
    } catch (err) {
      console.error('Error updating iframe content:', err);
    }
  }, [value, isInitialized]);
  
  // Initialize the iframe editor with necessary styles and content
  const initializeIframeEditor = useCallback(() => {
    if (!iframeRef.current) return;
    
    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (!doc) {
        console.error('Could not access iframe document');
        return;
      }
      
      // Set up the document
      doc.designMode = 'on';
      
      // Write the initial HTML
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              direction: ltr;
              text-align: left;
            }
            body {
              padding: 16px;
              min-height: 200px;
              font-size: 0.875rem;
              line-height: 1.5;
              box-sizing: border-box;
              outline: none;
            }
            body * {
              direction: ltr !important;
              text-align: left !important;
            }
            body:empty:before {
              content: "${placeholder}";
              color: #9ca3af;
              position: absolute;
              pointer-events: none;
            }
          </style>
        </head>
        <body>${value || ''}</body>
        </html>
      `);
      doc.close();
      
      // Add event listener for content changes
      doc.body.addEventListener('input', () => {
        handleContentChange();
      });
      
      // Focus the editor
      doc.body.focus();
      
      console.log('Editor initialized successfully');
    } catch (err) {
      console.error('Error initializing iframe editor:', err);
    }
  }, [value, placeholder]);
  
  // Handle content changes from the iframe
  const handleContentChange = useCallback(() => {
    if (!iframeRef.current) return;
    
    try {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!doc || !doc.body) return;
      
      const newContent = doc.body.innerHTML;
      onChange(newContent);
    } catch (err) {
      console.error('Error handling content change:', err);
    }
  }, [onChange]);
  
  // Execute commands in the iframe
  const executeCommand = useCallback((command: string, value?: string) => {
    if (!iframeRef.current) return;
    
    try {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!doc) return;
      
      // Focus the document first
      doc.body.focus();
      
      // Execute command
      doc.execCommand(command, false, value);
      
      // Update content
      handleContentChange();
    } catch (err) {
      console.error(`Error executing command ${command}:`, err);
    }
  }, [handleContentChange]);
  
  // Focus the editor
  const focusEditor = useCallback(() => {
    if (!iframeRef.current) return;
    
    try {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc && doc.body) {
        doc.body.focus();
      }
    } catch (err) {
      console.error('Error focusing editor:', err);
    }
  }, []);
  
  if (!isMounted) {
    return (
      <div className={`${className} bg-gray-100 animate-pulse rounded-md`}>
        <div className="h-64"></div>
      </div>
    );
  }
  
  return (
    <div className={`${className} border border-gray-300 rounded-md overflow-hidden`}>
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Underline"
        >
          <u>U</u>
        </button>
        
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter the URL:');
            if (url) {
              executeCommand('createLink', url);
            }
          }}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Insert Link"
        >
          Link
        </button>
        
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h1>')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Heading 1"
        >
          H1
        </button>
        
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Heading 2"
        >
          H2
        </button>
        
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Ordered List"
        >
          1. List
        </button>
        
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Unordered List"
        >
          • List
        </button>
      </div>
      
      {/* Editor iframe with click handler to focus */}
      <div className="relative">
        <iframe 
          ref={iframeRef}
          className="w-full min-h-[200px] border-0"
          title="Rich Text Editor"
          onClick={focusEditor}
        />
        
        {/* Overlay to handle clicks and focus the iframe */}
        <div 
          className="absolute inset-0 pointer-events-none"
          onClick={focusEditor}
        />
      </div>
    </div>
  );
}