// components/smtp/SmtpTestForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SmtpConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
}

interface SmtpTestFormProps {
  smtpConfig: SmtpConfig;
}

export default function SmtpTestForm({ smtpConfig }: Readonly<SmtpTestFormProps>) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState(smtpConfig.fromEmail);
  
  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Validate email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(testEmail)) {
        throw new Error('Please enter a valid email address');
      }
      
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtpId: smtpConfig.id,
          testEmail: testEmail,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to test SMTP connection');
      }
      
      setTestResult({
        success: true,
        message: `Connection successful! Test email sent to ${testEmail}.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setTestResult({
        success: false,
        message: `Connection failed: ${errorMessage}`,
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Test SMTP Configuration</h2>
        <p className="mt-2 text-gray-600">
          Send a test email to verify your SMTP configuration is working correctly.
        </p>
      </div>
      
      {testResult && (
        <div className={`p-4 mb-6 text-sm rounded-md ${
          testResult.success 
            ? 'text-green-700 bg-green-100' 
            : 'text-red-700 bg-red-100'
        }`}>
          {testResult.message}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-medium">SMTP Configuration Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Server</p>
            <p className="text-sm">{smtpConfig.host}:{smtpConfig.port}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Security</p>
            <p className="text-sm">{smtpConfig.secure ? 'SSL/TLS' : 'None'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Username</p>
            <p className="text-sm">{smtpConfig.username}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">From Email</p>
            <p className="text-sm">{smtpConfig.fromEmail}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">From Name</p>
            <p className="text-sm">{smtpConfig.fromName || smtpConfig.fromEmail}</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleTestConnection} className="space-y-4">
        <div>
          <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700">
            Send Test Email To
          </label>
          <input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter email address"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the email address where you want to receive the test email.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Link
            href="/dashboard/smtp"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to SMTP Configurations
          </Link>
          <button
            type="submit"
            disabled={isTesting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isTesting ? 'Sending Test Email...' : 'Send Test Email'}
          </button>
        </div>
      </form>
    </div>
  );
}