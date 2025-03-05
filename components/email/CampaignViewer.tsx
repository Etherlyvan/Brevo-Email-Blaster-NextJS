// components/email/CampaignViewer.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Recipient {
  id: string;
  email: string;
  name?: string | null;
  metadata?: Record<string, unknown> | null;  // Changed from any to unknown
  createdAt: Date | string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  parameters: string[];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  templateId: string;
  template: Template;
  smtpConfigId?: string | null;
  parameterValues?: Record<string, unknown> | null;  // Changed from any to unknown
  createdAt: Date | string;
  updatedAt: Date | string;
  recipients: Recipient[];
}

interface SmtpConfig {
  id: string;
  name: string;
  host: string;
  fromEmail: string;
  fromName: string;
}

interface CampaignViewerProps {
  campaign: Campaign;
  smtpConfig: SmtpConfig | null;
}

export default function CampaignViewer({ campaign, smtpConfig }: Readonly<CampaignViewerProps>) {
  const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'template'>('overview');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  
  // Format status for display
  const getStatusBadgeClass = () => {
    switch (campaign.status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Render campaign overview information
  const renderOverview = () => {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Recipients</p>
              <p className="mt-1 text-sm text-gray-900">{campaign.recipientCount}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(campaign.createdAt)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(campaign.updatedAt)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Email Template</p>
              <p className="mt-1 text-sm text-gray-900">{campaign.template.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">SMTP Configuration</p>
              <p className="mt-1 text-sm text-gray-900">
                {smtpConfig ? smtpConfig.name : 'Not specified'}
              </p>
            </div>
          </div>
        </div>
        
        {smtpConfig && (
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SMTP Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">SMTP Server</p>
                <p className="mt-1 text-sm text-gray-900">{smtpConfig.host}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">From Email</p>
                <p className="mt-1 text-sm text-gray-900">{smtpConfig.fromEmail}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">From Name</p>
                <p className="mt-1 text-sm text-gray-900">{smtpConfig.fromName}</p>
              </div>
            </div>
          </div>
        )}
        
        {campaign.parameterValues && Object.keys(campaign.parameterValues).length > 0 && (
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Default Parameter Values</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(campaign.parameterValues).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium text-gray-500">{key}</p>
                  <p className="mt-1 text-sm text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render recipients table
  const renderRecipients = () => {
    if (campaign.recipients.length === 0) {
      return (
        <div className="p-6 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-center">No recipients found for this campaign.</p>
        </div>
      );
    }
    
    // Get all unique metadata keys from recipients
    const metadataKeys = new Set<string>();
    campaign.recipients.forEach(recipient => {
      if (recipient.metadata) {
        Object.keys(recipient.metadata).forEach(key => metadataKeys.add(key));
      }
    });
    
    return (
      <div className="p-6 bg-white rounded-lg shadow overflow-hidden">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recipients</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                {Array.from(metadataKeys).map(key => (
                  <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.recipients.map(recipient => (
                <tr key={recipient.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recipient.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recipient.name ?? '-'}  {/* Changed from || to ?? */}
                  </td>
                  {Array.from(metadataKeys).map(key => (
                    <td key={`${recipient.id}-${key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipient.metadata?.[key] ? String(recipient.metadata[key]) : '-'}  {/* Changed to optional chaining */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {campaign.recipientCount > campaign.recipients.length && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            Showing {campaign.recipients.length} of {campaign.recipientCount} recipients.
          </p>
        )}
      </div>
    );
  };
  
  // Render template information
  const renderTemplate = () => {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Email Template: {campaign.template.name}</h3>
            <Link href={`/dashboard/templates/${campaign.template.id}`} className="text-sm text-blue-600 hover:text-blue-500">
              View Full Template
            </Link>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500">Subject</p>
            <p className="mt-1 text-sm text-gray-900">{campaign.template.subject}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Parameters</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {campaign.template.parameters.length > 0 ? (
                campaign.template.parameters.map(param => (
                  <div 
                    key={param} 
                    className="px-2 py-1 bg-blue-100 rounded-md text-xs text-blue-800"
                  >
                    {param}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No parameters</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
            <button
              type="button"
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {showTemplatePreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          {showTemplatePreview && (
            <div className="border border-gray-200 rounded-md p-4 mt-2">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: campaign.template.htmlContent }} />
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            className={`${
              activeTab === 'recipients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Recipients ({campaign.recipientCount})
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`${
              activeTab === 'template'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Template
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'recipients' && renderRecipients()}
      {activeTab === 'template' && renderTemplate()}
    </div>
  );
}