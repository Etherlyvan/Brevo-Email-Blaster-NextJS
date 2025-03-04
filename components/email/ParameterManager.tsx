// components/email/ParameterManager.tsx
'use client';

import { useState } from 'react';

// Remove the unused Parameter interface
interface ParameterManagerProps {
  parameters: string[];
  onChangeAction: (paramValues: Record<string, string>) => void;
}

export default function ParameterManager({ parameters, onChangeAction }: Readonly<ParameterManagerProps>) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    parameters.reduce((acc, param) => ({ ...acc, [param]: '' }), {})
  );
  
  const handleParamChange = (param: string, value: string) => {
    const newValues = { ...paramValues, [param]: value };
    setParamValues(newValues);
    onChangeAction(newValues);
  };
  
  if (parameters.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-500">
          No parameters detected in the template. Use {'{{'} parameter {'}}'}  syntax in your template to add dynamic content.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="mb-4 text-lg font-semibold">Default Parameter Values</h2>
      <p className="mb-4 text-sm text-gray-500">
        Set default values for parameters. These will be used when recipient data doesn&apos;t include the parameter.
      </p>
      
      <div className="space-y-4">
        {parameters.map((param) => (
          <div key={param} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="text-sm font-medium text-gray-700">
              {'{{'} {param} {'}}'}
            </div>
            <input
              type="text"
              value={paramValues[param] || ''}
              onChange={(e) => handleParamChange(param, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
              placeholder={`Default value for ${param}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}