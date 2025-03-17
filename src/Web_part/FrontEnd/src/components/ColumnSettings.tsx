// src/Web_part/FrontEnd/src/components/ColumnSettings.tsx
import React, { useState } from 'react';
import { X, Save, RotateCcw, Settings } from 'lucide-react';
import { ColumnPreference, getDefaultAssemblyColumns } from '../lib/preferencesApi';

interface ColumnSettingsProps {
  columns: ColumnPreference[];
  onSave: (columns: ColumnPreference[]) => void;
  onCancel: () => void;
}

const ColumnSettings: React.FC<ColumnSettingsProps> = ({ 
  columns: initialColumns,
  onSave,
  onCancel
}) => {
  const [columns, setColumns] = useState<ColumnPreference[]>([...initialColumns]);
  
  // Reset to initial state
  const handleReset = () => {
    setColumns([...initialColumns]);
  };
  
  // Reset to defaults
  const handleResetToDefaults = () => {
    setColumns(getDefaultAssemblyColumns());
  };
  
  // Toggle column visibility
  const toggleColumn = (id: string) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };
  
  // Submit changes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(columns);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-72">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          <Settings size={16} className="mr-2" />
          Column Settings
        </h3>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {columns.map((column) => (
              <div 
                key={column.id} 
                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
              >
                <input
                  type="checkbox"
                  id={`column-${column.id}`}
                  checked={column.visible}
                  onChange={() => toggleColumn(column.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label 
                  htmlFor={`column-${column.id}`}
                  className="ml-2 block text-sm text-gray-900 cursor-pointer select-none"
                >
                  {column.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-3 bg-gray-50 flex justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <RotateCcw size={12} className="mr-1" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <RotateCcw size={12} className="mr-1" />
              Defaults
            </button>
          </div>
          
          <button
            type="submit"
            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save size={14} className="mr-1" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default ColumnSettings;