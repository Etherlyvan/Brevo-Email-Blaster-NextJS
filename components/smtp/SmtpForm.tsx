// components/smtp/SmtpForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';;

interface SmtpFormProps {
  smtpConfig?: {
    id?: string;
    name: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    fromEmail: string;
    fromName: string;
    isDefault: boolean;
  };
  onSuccess?: () => void;
}

export default function SmtpForm({ smtpConfig, onSuccess }: Readonly<SmtpFormProps>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    isDefault: false,
  });
  
  useEffect(() => {
    if (smtpConfig?.id) {
      setIsEditMode(true);
      setFormData({
        id: smtpConfig.id,
        name: smtpConfig.name || '',
        host: smtpConfig.host || '',
        port: smtpConfig.port || 587,
        secure: smtpConfig.secure || false,
        username: smtpConfig.username || '',
        password: '', // Password is not returned from API for security
        fromEmail: smtpConfig.fromEmail || '',
        fromName: smtpConfig.fromName || '',
        isDefault: smtpConfig.isDefault || false,
      });
    }
  }, [smtpConfig]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let newValue;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = parseInt(value, 10);
    } else {
      newValue = value;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };
  
  const handleTestConnection = async () => {
    setError(null);
    setTestResult(null);
    setIsTesting(true);
    
    try {
      if (!validateEmail(formData.fromEmail)) {
        throw new Error('Please enter a valid email address for From Email');
      }
      
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            host: formData.host,
            port: formData.port,
            secure: formData.secure,
            username: formData.username,
            password: formData.password,
            fromEmail: formData.fromEmail,
            fromName: formData.fromName,
          },
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to test SMTP connection');
      }
      
      setTestResult({
        success: true,
        message: 'Connection successful! Test email sent.',
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!formData.name || !formData.host || !formData.port || !formData.username || !formData.fromEmail) {
        throw new Error('Please fill in all required fields');
      }
      
      if (!validateEmail(formData.fromEmail)) {
        throw new Error('Please enter a valid email address for From Email');
      }
      
      if (!isEditMode && !formData.password) {
        throw new Error('Password is required');
      }
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        ...(formData.password ? { password: formData.password } : {}),
      };
      
      console.log(`Sending ${method} request with ID: ${payload.id}`);
      
      const response = await fetch('/api/smtp', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save SMTP configuration');
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/smtp');
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {error && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {testResult && (
        <div className={`p-4 mb-6 text-sm rounded-md ${
          testResult.success 
            ? 'text-green-700 bg-green-100' 
            : 'text-red-700 bg-red-100'
        }`}>
          {testResult.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {isEditMode && (
          <input type="hidden" name="id" value={formData.id} />
        )}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Configuration Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., My Brevo SMTP"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700">
              SMTP Host *
            </label>
            <input
              id="host"
              name="host"
              type="text"
              value={formData.host}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., smtp-relay.brevo.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700">
              SMTP Port *
            </label>
            <input
              id="port"
              name="port"
              type="number"
              value={formData.port}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              SMTP Username *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              SMTP Password {!isEditMode && '*'}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required={!isEditMode}
              placeholder={isEditMode ? '(unchanged)' : ''}
            />
          </div>
          
          <div>
            <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700">
              From Email *
            </label>
            <input
              id="fromEmail"
              name="fromEmail"
              type="email"
              value={formData.fromEmail}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">
              From Name
            </label>
            <input
              id="fromName"
              name="fromName"
              type="text"
              value={formData.fromName}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            id="secure"
            name="secure"
            type="checkbox"
            checked={formData.secure}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="secure" className="block ml-2 text-sm font-medium text-gray-700">
            Use Secure Connection (SSL/TLS)
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            id="isDefault"
            name="isDefault"
            type="checkbox"
            checked={formData.isDefault}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="block ml-2 text-sm font-medium text-gray-700">
            Set as Default SMTP Configuration
          </label>
        </div>
        
        <div className="flex flex-col gap-4 pt-4 mt-6 border-t border-gray-200 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (isEditMode ? 'Update Configuration' : 'Save Configuration')}
          </button>
          
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !formData.host || !formData.port || !formData.username || (!formData.password && !isEditMode) || !formData.fromEmail}
            className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-transparent rounded-md shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}