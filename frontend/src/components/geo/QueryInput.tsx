import React from 'react';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  value,
  onChange,
  placeholder = "Enter your prompt here..."
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Prompt
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
};