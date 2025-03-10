// components/email/ExcelFileUploader.tsx
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { validateEmail, sanitizeEmail } from '@/lib/utils';

interface RecipientData {
  email: string;
  name?: string;
  [key: string]: string | number | boolean | undefined;
}

interface ExcelFileUploaderProps {
  onUpload: (recipients: Array<Record<string, unknown>>, file: File) => void;
  parameters?: string[];
}

export default function ExcelFileUploader({ onUpload, parameters = [] }: ExcelFileUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Excel file has no sheets');
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Validate each row has an email
      const validRecipients = jsonData
        .filter((row): row is RecipientData => {
          if (typeof row !== 'object' || row === null) return false;
          
          const typedRow = row as Record<string, unknown>;
          return (
            'email' in typedRow && 
            typeof typedRow.email === 'string' && 
            typedRow.email.trim() !== '' &&
            validateEmail(typedRow.email.trim())
          );
        })
        .map(recipient => {
          // Sanitize email
          if (recipient.email) {
            recipient.email = sanitizeEmail(recipient.email);
          }
          return recipient;
        });
      
      if (validRecipients.length === 0) {
        throw new Error('No valid recipients found. Ensure your file has an "email" column with valid emails.');
      }
      
      onUpload(validRecipients, file);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse the file');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-1"
      />
      
      {error && (
        <div className="mt-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={resetFile}
            className="mt-1 text-xs text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center mt-2">
          <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Processing file...</p>
        </div>
      )}
      
      <p className="mt-2 text-xs text-gray-500">
        Upload an Excel file (.xlsx, .xls) or CSV file with recipient data.
        Must include an &quot;email&quot; column{parameters.length > 0 && ` and can include columns for parameters: ${parameters.join(', ')}`}
      </p>
    </div>
  );
}