// components/email/CampaignForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiClock, FiUpload, FiUsers, FiUserPlus } from 'react-icons/fi';
import ExcelFileUploader from './ExcelFileUploader';

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

interface Contact {
  id: string;
  email: string;
  name: string | null;
}

interface ContactGroup {
  id: string;
  name: string;
  contactCount: number;
}

export default function CampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSmtp, setSelectedSmtp] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  // Recipient sources
  const [recipientSource, setRecipientSource] = useState<'file' | 'contacts' | 'groups'>('file');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Array<Record<string, unknown>>>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  
  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Automatic sending - default to true if not scheduled
  const [sendImmediately, setSendImmediately] = useState(true);
  
  useEffect(() => {
    // Fetch templates, SMTP configs, contacts, and groups
    const fetchData = async () => {
      try {
        const [templatesRes, smtpRes, contactsRes, groupsRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/smtp'),
          fetch('/api/contacts'),
          fetch('/api/contact-groups')
        ]);
        
        // Handle templates response
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData);
        }
        
        // Handle SMTP response
        if (smtpRes.ok) {
          const smtpData = await smtpRes.json();
          setSmtpConfigs(smtpData);
          
          // Set default SMTP
          const defaultSmtp = smtpData.find((config: SmtpConfig) => config.isDefault);
          if (defaultSmtp) {
            setSelectedSmtp(defaultSmtp.id);
          } else if (smtpData.length > 0) {
            setSelectedSmtp(smtpData[0].id);
          }
        }
        
        // Handle contacts response
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData.contacts || []);
        }
        
        // Handle groups response
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setContactGroups(groupsData || []);
        }
      } catch (error) {
        console.error('Failed to fetch required data:', error);
        setError('Failed to load required data');
      }
    };
    
    fetchData();
    
    // Check if templateId is provided in URL
    const templateId = searchParams?.get('templateId');
    if (templateId) {
      setSelectedTemplateId(templateId);
    }
    
    // Set default date and time for scheduling (tomorrow at current time)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
    setScheduledTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
  }, [searchParams]);
  
  // Update sendImmediately when isScheduled changes
  useEffect(() => {
    if (isScheduled) {
      // Can't send immediately if scheduled
      setSendImmediately(false);
    }
  }, [isScheduled]);
  
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
      
      // Validate based on recipient source
      if (recipientSource === 'file' && (!recipientFile || recipients.length === 0)) {
        throw new Error('Please upload a valid recipients file');
      }
      
      if (recipientSource === 'groups' && selectedGroups.length === 0) {
        throw new Error('Please select at least one contact group');
      }
      
      if (recipientSource === 'contacts' && selectedContacts.length === 0) {
        throw new Error('Please select at least one contact');
      }
      
      // Validate schedule if enabled
      if (isScheduled) {
        if (!scheduledDate || !scheduledTime) {
          throw new Error('Please set a complete schedule date and time');
        }
        
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
      }
      
      // Create FormData for submission
      const formData = new FormData();
      formData.append('name', campaignName);
      formData.append('templateId', selectedTemplateId);
      formData.append('smtpConfigId', selectedSmtp);
      
      // Add scheduling parameters
      formData.append('isScheduled', isScheduled.toString());
      if (isScheduled) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        formData.append('scheduledFor', scheduledDateTime.toISOString());
      }
      
      // Add automatic sending parameter
      formData.append('sendImmediately', sendImmediately.toString());
      
      // Add recipient data based on source
      if (recipientSource === 'file' && recipientFile) {
        formData.append('recipients', recipientFile);
        formData.append('recipientSource', 'file');
      } else if (recipientSource === 'groups') {
        formData.append('groupIds', JSON.stringify(selectedGroups));
        formData.append('recipientSource', 'groups');
      } else if (recipientSource === 'contacts') {
        formData.append('contactIds', JSON.stringify(selectedContacts));
        formData.append('recipientSource', 'contacts');
      }
      
      // Add parameter values
      formData.append('paramValues', JSON.stringify(paramValues));
      
      // Send request
      const response = await fetch('/api/email', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
      
      const result = await response.json();
      
      // Redirect to campaign detail page
      router.push(`/dashboard/campaigns/${result.campaign}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get selected template details
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            >
              Next: Recipients
            </button>
          </div>
        </div>
        
        {/* Step 2: Recipients */}
        <div className={`space-y-6 ${step !== 2 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold">Recipients</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Select Recipient Source</h3>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRecipientSource('file')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  recipientSource === 'file' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiUpload className="mr-2" /> Upload File
              </button>
              
              <button
                type="button"
                onClick={() => setRecipientSource('contacts')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  recipientSource === 'contacts' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiUserPlus className="mr-2" /> Select Contacts
              </button>
              
              <button
                type="button"
                onClick={() => setRecipientSource('groups')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  recipientSource === 'groups' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiUsers className="mr-2" /> Contact Groups
              </button>
            </div>
            
            {/* Recipient File Upload */}
            {recipientSource === 'file' && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Recipients File</h4>
                <ExcelFileUploader 
                  onUpload={handleRecipientsUpload}
                  parameters={templateDetails?.parameters || []}
                />
                
                {recipientFile && (
                  <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-md">
                    File selected: {recipientFile.name} ({recipients.length} recipients)
                  </div>
                )}
              </div>
            )}
            
            {/* Individual Contacts Selection */}
            {recipientSource === 'contacts' && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Individual Contacts</h4>
                {contacts.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`contact-${contact.id}`}
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => {
                            if (selectedContacts.includes(contact.id)) {
                              setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                            } else {
                              setSelectedContacts(prev => [...prev, contact.id]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`contact-${contact.id}`} className="ml-2 block text-sm text-gray-900">
                          {contact.name || contact.email} {contact.name ? `(${contact.email})` : ''}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No contacts available. Add contacts first.</p>
                )}
                
                {selectedContacts.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md">
                    {selectedContacts.length} contacts selected
                  </div>
                )}
              </div>
            )}
            
            {/* Contact Groups Selection */}
            {recipientSource === 'groups' && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Contact Groups</h4>
                {contactGroups.length > 0 ? (
                  <div className="space-y-2">
                    {contactGroups.map(group => (
                      <div key={group.id} className="flex items-center p-2 hover:bg-gray-50 border border-gray-100 rounded-md">
                        <input
                          type="checkbox"
                          id={`group-${group.id}`}
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => {
                            if (selectedGroups.includes(group.id)) {
                              setSelectedGroups(prev => prev.filter(id => id !== group.id));
                            } else {
                              setSelectedGroups(prev => [...prev, group.id]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-900">
                          {group.name} <span className="text-gray-500">({group.contactCount} contacts)</span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No contact groups available. Create groups first.</p>
                )}
                
                {selectedGroups.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md">
                    {selectedGroups.length} groups selected
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={
                (recipientSource === 'file' && !recipientFile) ||
                (recipientSource === 'contacts' && selectedContacts.length === 0) ||
                (recipientSource === 'groups' && selectedGroups.length === 0)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            >
              Next: Scheduling
            </button>
          </div>
        </div>
        
        {/* Step 3: Parameters and Scheduling */}
        <div className={`space-y-6 ${step !== 3 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold">Parameters & Scheduling</h2>
          
          {/* Parameters */}
          {templateDetails?.parameters && templateDetails.parameters.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Default Parameter Values</h3>
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
          )}
          
          {/* Scheduling */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Campaign Scheduling</h3>
            
            <div className="space-y-4">
              {/* Schedule Option */}
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="isScheduled"
                  checked={isScheduled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsScheduled(checked);
                    if (checked) {
                      // If scheduled, can't send immediately
                      setSendImmediately(false);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isScheduled" className="ml-2 block text-sm text-gray-900">
                  Schedule for later
                </label>
              </div>
              
              {/* Send Immediately Option - only show if not scheduled */}
              {!isScheduled && (
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="sendImmediately"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendImmediately" className="ml-2 block text-sm text-gray-900">
                    <span className="font-medium">Start sending immediately</span> after creation
                  </label>
                </div>
              )}
              
              {/* Schedule Date/Time Fields */}
              {isScheduled && (
                <div className="ml-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      id="scheduledDate"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      min={new Date().toISOString().split('T')[0]}
                      required={isScheduled}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                      Time
                    </label>
                    <input
                      type="time"
                      id="scheduledTime"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <FiClock className="mr-2" />
                {isScheduled ? (
                  <span>Campaign will be sent on {scheduledDate} at {scheduledTime}</span>
                ) : (
                  <span>
                    Campaign will be {sendImmediately ? 'processed immediately' : 'saved as draft'} after creation
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            >
              {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}