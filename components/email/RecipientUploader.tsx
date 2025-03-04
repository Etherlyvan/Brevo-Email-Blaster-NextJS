// components/email/RecipientUploader.tsx
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

// Define a more specific type instead of using any
interface Recipient {
  email: string;
  name?: string;
  [key: string]: string | number | boolean | undefined;
}

interface RecipientUploaderProps {
  onUploadAction: (recipients: Recipient[]) => void;
  parameters: string[];
}

export default function RecipientUploader({ onUploadAction, parameters }: Readonly<RecipientUploaderProps>) {
  // Removed the unused 'file' state
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    parseExcelFile(selectedFile);
  };
  
  const parseExcelFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json<Recipient>(worksheet);
      
      // Validate each row has at least an email
      const validRecipients = data.filter(row => row.email && typeof row.email === 'string');
      
      if (validRecipients.length === 0) {
        throw new Error('No valid recipients found. Ensure your Excel file has an "email" column.');
      }
      
      setRecipients(validRecipients);
      onUploadAction(validRecipients);
    } catch (error: unknown) {
      // Properly type the error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      setRecipients([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Separate the rendering logic for better readability
  const renderRecipientTable = () => {
    if (recipients.length === 0) return null;
    
    const headers = Object.keys(recipients[0]);
    
    return (
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          {recipients.length} Recipients Loaded
        </h3>
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header) => (
                  <th
                    key={`header-${header}`}
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recipients.slice(0, 5).map((recipient, recipientIndex) => (
                <tr key={`recipient-${recipient.email}-${recipientIndex}`}>
                  {headers.map((header, headerIndex) => (
                    <td 
                      key={`cell-${recipient.email}-${header}-${headerIndex}`} 
                      className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"
                    >
                      {recipient[header]?.toString() || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recipients.length > 5 && (
          <p className="mt-2 text-xs text-gray-500">
            Showing 5 of {recipients.length} recipients
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="mb-6 text-xl font-semibold">Upload Recipients</h2>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="recipient-file" className="block mb-2 text-sm font-medium text-gray-700">
          Excel File with Recipients
        </label>
        <input
          id="recipient-file"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          Upload an Excel file (.xlsx, .xls) or CSV file with recipient data. 
          Must include an &quot;email&quot; column and can include columns for parameters: {parameters.join(', ')}
        </p>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {!isLoading && recipients.length > 0 && renderRecipientTable()}
      
      {!isLoading && recipients.length === 0 && (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500">No recipients loaded yet.</p>
          <p className="mt-2 text-gray-500">
            Upload an Excel file to see recipient data.
          </p>
        </div>
      )}
    </div>
  );
}