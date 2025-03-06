// components/email/CampaignForm.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ContactGroupSelector from '../contacts/ContactGroupSelector';
import ExcelFileUploader from './ExcelFileUploader';

// Define proper types for templates
interface Template {
  id: string;
  name: string;
  parameters: string[];
}

interface SmtpConfig {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function CampaignForm() {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSmtp, setSelectedSmtp] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Array<Record<string, unknown>>>([]);
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  useEffect(() => {
    // Fetch templates and SMTP configs
    const fetchData = async () => {
      try {
        const [templatesRes, smtpRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/smtp'),
        ]);
        
        if (!templatesRes.ok || !smtpRes.ok) {
          throw new Error('Failed to fetch required data');
        }
        
        const templatesData = await templatesRes.json();
        const smtpData = await smtpRes.json();
        
        setTemplates(templatesData);
        setSmtpConfigs(smtpData);
        
        // Set default SMTP if available
        const defaultSmtp = smtpData.find((config: SmtpConfig) => config.isDefault);
        if (defaultSmtp) {
          setSelectedSmtp(defaultSmtp.id);
        } else if (smtpData.length > 0) {
          setSelectedSmtp(smtpData[0].id);
        }
      } catch (error) {
        setError('Failed to load templates or SMTP configurations');
        console.error(error);
      }
    };
    
    fetchData();
  }, []);
  
  const handleRecipientsUpload = (uploadedRecipients: Array<Record<string, unknown>>, file: File) => {
    setRecipients(uploadedRecipients);
    setRecipientFile(file);
  };
  
  const handleParamChange = (param: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [param]: value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate inputs
      if (!campaignName) {
        throw new Error('Campaign name is required');
      }
      
      if (!selectedTemplateId) {
        throw new Error('Please select an email template');
      }
      
      if (!selectedSmtp) {
        throw new Error('Please select an SMTP configuration');
      }
      
      if (recipients.length === 0 && selectedGroups.length === 0) {
        throw new Error('Please upload recipients or select contact groups');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', campaignName);
      formData.append('templateId', selectedTemplateId);
      formData.append('smtpConfigId', selectedSmtp);
      
      // Add recipient file if available
      if (recipientFile) {
        formData.append('recipients', recipientFile);
      }
      
      // Add parameter values
      formData.append('paramValues', JSON.stringify(paramValues));
      
      // Add selected groups
      if (selectedGroups.length > 0) {
        formData.append('groupIds', JSON.stringify(selectedGroups));
      }
      
      // Send the request
      const response = await fetch('/api/email', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }
      
      const result = await response.json();
      
      // Redirect to campaign status page
      router.push(`/dashboard/campaigns/${result.campaign}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get selected template details - fix the type issues
  const templateDetails = templates.find(t => t.id === selectedTemplateId);
  
  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Basic Details */}
        <div className={`space-y-6 ${step !== 1 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold">Campaign Details</h2>
          
          <div>
            <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
              Campaign Name*
            </label>
            <input
              id="campaignName"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700">
              Email Template*
            </label>
            <select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="smtp" className="block text-sm font-medium text-gray-700">
              SMTP Configuration*
            </label>
            <select
              id="smtp"
              value={selectedSmtp}
              onChange={(e) => setSelectedSmtp(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select SMTP configuration</option>
              {smtpConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!campaignName || !selectedTemplateId || !selectedSmtp}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              Next: Recipients
            </button>
          </div>
        </div>
        
        {/* Step 2: Recipients */}
        <div className={`space-y-6 ${step !== 2 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold">Recipients</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Upload Recipients</h3>
            <ExcelFileUploader
              onUpload={handleRecipientsUpload}
              parameters={templateDetails?.parameters || []}
            />
            
            {recipients.length > 0 && (
              <div className="mt-4 text-sm text-green-600">
                {recipients.length} recipients loaded from file
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Or Select Contact Groups</h3>
            <ContactGroupSelector
              selectedGroups={selectedGroups}
              onChange={setSelectedGroups}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={recipients.length === 0 && selectedGroups.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              Next: Parameters
            </button>
          </div>
        </div>
        
        {/* Step 3: Parameters */}
        <div className={`space-y-6 ${step !== 3 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold">Default Parameter Values</h2>
          
          {templateDetails?.parameters && templateDetails.parameters.length > 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                Set default values for parameters. These will be used when recipient data doesn&apos;t include the parameter.
              </p>
              
              <div className="space-y-4">
                {templateDetails.parameters.map((param) => (
                  <div key={param} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-sm font-medium text-gray-700">
                      {`{{${param}}}`}
                    </div>
                    <input
                      type="text"
                      value={paramValues[param] || ''}
                      onChange={(e) => handleParamChange(param, e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder={`Default value for ${param}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">
                No parameters found in the selected template.
              </p>
            </div>
          )}
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}