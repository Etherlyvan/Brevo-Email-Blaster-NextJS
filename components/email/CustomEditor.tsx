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
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Update the editor content when the value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    
    // Update the onChange handler with the new content
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);
  
  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);
  
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
      
      <div
        ref={editorRef}
        contentEditable="true"
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
      />
      
      <style jsx>{`
        [contenteditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          cursor: text;
        }
      `}</style>
    </div>
  );
}