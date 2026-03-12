import React from 'react';

interface EngineSelectorProps {
  selected: string[];
  onChange: (engines: string[]) => void;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  selected,
  onChange
}) => {
  const engines = ['ChatGPT', 'Gemini', 'Claude'];

  const toggleEngine = (engine: string) => {
    if (selected.includes(engine)) {
      onChange(selected.filter(e => e !== engine));
    } else {
      onChange([...selected, engine]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        AI Engines
      </label>
      <div className="flex space-x-4">
        {engines.map(engine => (
          <button
            key={engine}
            type="button"
            onClick={() => toggleEngine(engine)}
            className={`px-4 py-2 rounded-md ${
              selected.includes(engine)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {engine}
          </button>
        ))}
      </div>
    </div>
  );
};