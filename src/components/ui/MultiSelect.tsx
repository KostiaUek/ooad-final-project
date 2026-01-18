import { useState } from 'react';

interface MultiSelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select items...',
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(search.toLowerCase()) &&
      !selectedValues.includes(option.value)
  );

  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value)
  );

  const handleSelect = (value: string) => {
    onChange([...selectedValues, value]);
    setSearch('');
  };

  const handleRemove = (value: string) => {
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className={`min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-sm"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.value);
                  }}
                  className="hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options available
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
