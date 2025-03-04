// app/dashboard/campaigns/create/page.tsx (update)
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/dashboard/Header';
import ExcelFileUploader from '@/components/email/ExcelFileUploader';

interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  parameters: string[];
}

interface SmtpConfig {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface Recipient {
  email: string;
  name?: string;
  [key: string]: string | number | boolean | undefined;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get('templateId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [selectedSmtpId, setSelectedSmtpId] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Fetch templates and SMTP configs
    const fetchData = async () => {
      try {
        const [templatesRes, smtpRes] = await Promise.all([
          fetch('/api/email/template'),
          fetch('/api/smtp'),
        ]);
        
        if (!templatesRes.ok || !smtpRes.ok) {
          throw new Error('Failed to fetch required data');
        }
        
        const templatesData = await templatesRes.json();
        const smtpData = await smtpRes.json();
        
        setTemplates(templatesData);
        setSmtpConfigs(smtpData);
        
        // If templateId is provided in URL, select it
        if (templateIdParam) {
          const template = templatesData.find((t: Template) => t.id === templateIdParam);
          if (template) {
            setSelectedTemplate(template);
            setCampaignName(`Campaign using ${template.name}`);
          }
        }
        
        // Select default SMTP config if available
        const defaultConfig = smtpData.find((s: SmtpConfig) => s.isDefault);
        if (defaultConfig) {
          setSelectedSmtpId(defaultConfig.id);
        } else if (smtpData.length > 0) {
          setSelectedSmtpId(smtpData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load required data. Please try again.');
      }
    };
    
    fetchData();
  }, [templateIdParam]);
  
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    const template = templates.find(t => t.id === templateId) || null;
    setSelectedTemplate(template);
    
    if (template) {
      setCampaignName(`Campaign using ${template.name}`);
    }
  };
  
  const handleRecipientsUpload = (uploadedRecipients: Recipient[], file: File) => {
    setRecipients(uploadedRecipients);
    setRecipientFile(file);
    setError(null);  // Clear any previous errors
  };
  
  const handleParamValuesChange = (param: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!selectedTemplate) {
        throw new Error('Please select an email template');
      }
      
      if (!selectedSmtpId) {
        throw new Error('Please select an SMTP configuration');
      }
      
      if (!campaignName) {
        throw new Error('Please enter a campaign name');
      }
      
      if (recipients.length === 0 || !recipientFile) {
        throw new Error('Please upload a recipients file');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', campaignName);
      formData.append('templateId', selectedTemplate.id);
      formData.append('smtpConfigId', selectedSmtpId);
      
      // Add the actual file
      formData.append('recipients', recipientFile);
      
      // Add parameter values
      formData.append('paramValues', JSON.stringify(paramValues));
      
      console.log('Sending campaign with:', {
        name: campaignName,
        templateId: selectedTemplate.id,
        smtpConfigId: selectedSmtpId,
        recipientCount: recipients.length,
        paramKeys: Object.keys(paramValues)
      });
      
      const response = await fetch('/api/email', {
        method: 'POST',
        body: formData,
      });
      
      // Check for non-JSON responses
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create campaign');
      }
      
      setSuccess(true);
      router.push('/dashboard/campaigns');
    } catch (error: unknown) {
      const typedError = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
      setError(typedError);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <Header title="Create Campaign" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && (
            <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 mb-6 text-sm text-green-700 bg-green-100 rounded-md">
              Campaign created successfully!
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="mb-6 text-lg font-medium text-gray-900">Campaign Details</h2>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
                    Campaign Name
                  </label>
                  <input
                    id="campaignName"
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                    placeholder="Enter campaign name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="smtpConfig" className="block text-sm font-medium text-gray-700">
                    SMTP Configuration
                  </label>
                  <select
                    id="smtpConfig"
                    value={selectedSmtpId}
                    onChange={(e) => setSelectedSmtpId(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select SMTP Configuration</option>
                    {smtpConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                    Email Template
                  </label>
                  <select
                    id="template"
                    value={selectedTemplate?.id ?? ''}
                    onChange={handleTemplateChange}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Email Template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {selectedTemplate && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700">Template Preview</h3>
                  <p className="mt-1 text-sm text-gray-500">Subject: {selectedTemplate.subject}</p>
                  <div className="mt-2 p-3 border border-gray-200 rounded bg-white">
                    <div className="prose prose-sm max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }} />
                  </div>
                </div>
              )}
            </div>
            
            {selectedTemplate && (
              <>
                <div className="p-6 bg-white rounded-lg shadow">
                  <h2 className="mb-6 text-lg font-medium text-gray-900">Recipients</h2>
                  
                  <ExcelFileUploader 
                    onUpload={handleRecipientsUpload}
                    parameters={selectedTemplate.parameters}
                  />
                  
                  {recipients.length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-2 text-sm font-medium text-gray-700">
                        {recipients.length} Recipients Loaded
                      </h3>
                      
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(recipients[0]).map((header) => (
                                <th
                                  key={header}
                                  scope="col"
                                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {recipients.slice(0, 5).map((recipient, index) => (
                              <tr key={index}>
                                {Object.keys(recipients[0]).map((header) => (
                                  <td
                                    key={`${index}-${header}`}
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
                  )}
                </div>
                
                {selectedTemplate.parameters.length > 0 && (
                  <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="mb-6 text-lg font-medium text-gray-900">Default Parameter Values</h2>
                    <p className="mb-4 text-sm text-gray-500">
                      Set default values for parameters. These will be used when recipient data doesn&apos;t include the parameter.
                    </p>
                    
                    <div className="space-y-4">
                      {selectedTemplate.parameters.map((param) => (
                        <div key={param} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className="text-sm font-medium text-gray-700">
                            {'{{'} {param} {'}}'}
                          </div>
                          <input
                            type="text"
                            value={paramValues[param] || ''}
                            onChange={(e) => handleParamValuesChange(param, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={`Default value for ${param}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
                        <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 mr-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedTemplate || !selectedSmtpId || recipients.length === 0 || !recipientFile}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}