// src/components/Assemblies/BarcodeGenerator.tsx
import React, { useState, useEffect } from 'react';
import { X, Check, Search, CheckSquare, Square } from 'lucide-react';

// Interface for Assembly data matching the parent component
interface Assembly {
  id: string;
  name: string;
  project_id: string;
  projects: {
    name: string;
  };
}

interface BarcodeGeneratorProps {
  assemblies: Assembly[];
  onClose: () => void;
  onGenerate: (assemblyIds: string[]) => Promise<void>;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  assemblies,
  onClose,
  onGenerate
}) => {
  const [selectedAssemblies, setSelectedAssemblies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Extract unique projects for filter dropdown
  const projects = React.useMemo(() => {
    const uniqueProjects = new Map<string, { id: string; name: string }>();
    assemblies.forEach(assembly => {
      if (assembly.project_id && assembly.projects?.name) {
        uniqueProjects.set(assembly.project_id, {
          id: assembly.project_id,
          name: assembly.projects.name
        });
      }
    });
    return Array.from(uniqueProjects.values());
  }, [assemblies]);

  // Filter assemblies based on search term and project filter
  const filteredAssemblies = assemblies.filter(assembly => {
    const matchesSearch = 
      assembly.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assembly.projects?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter ? assembly.project_id === projectFilter : true;
    
    return matchesSearch && matchesProject;
  });

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setSelectedAssemblies(filteredAssemblies.map(a => a.id));
    } else if (selectedAssemblies.length === filteredAssemblies.length) {
      // If all are selected but selectAll is false, deselect all
      setSelectedAssemblies([]);
    }
  }, [selectAll, filteredAssemblies]);

  // Check if all filtered assemblies are selected
  useEffect(() => {
    if (filteredAssemblies.length > 0 && 
        selectedAssemblies.length === filteredAssemblies.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedAssemblies, filteredAssemblies]);

  // Toggle selection of an assembly
  const toggleAssembly = (id: string) => {
    if (selectedAssemblies.includes(id)) {
      setSelectedAssemblies(selectedAssemblies.filter(asmId => asmId !== id));
    } else {
      setSelectedAssemblies([...selectedAssemblies, id]);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
  };

  // Handle generate button click
  const handleGenerate = async () => {
    if (selectedAssemblies.length === 0) {
      setError('Please select at least one assembly');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onGenerate(selectedAssemblies);
    } catch (err: any) {
      setError(err.message || 'Failed to generate barcodes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Generate Barcodes</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {/* Search and filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search assemblies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                />
                <Search 
                  size={18} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
              </div>
            </div>
            
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* Assembly list */}
          <div className="flex-1 overflow-auto border border-gray-200 rounded-md">
            {filteredAssemblies.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {assemblies.length === 0 
                  ? 'No assemblies without barcodes found'
                  : 'No assemblies match your search criteria'
                }
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">
                      <div 
                        className="flex items-center cursor-pointer"
                        onClick={toggleSelectAll}
                      >
                        {selectAll ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Assembly Name</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Project</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAssemblies.map((assembly) => (
                    <tr 
                      key={assembly.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleAssembly(assembly.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center">
                          {selectedAssemblies.includes(assembly.id) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">{assembly.name}</td>
                      <td className="p-3">{assembly.projects?.name || 'Unknown Project'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Selected count */}
          <div className="mt-3 text-sm text-gray-500">
            Selected {selectedAssemblies.length} of {filteredAssemblies.length} assemblies
          </div>
        </div>
        
        {/* Footer with buttons */}
        <div className="border-t p-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedAssemblies.length === 0 || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Generating...
              </>
            ) : (
              <>
                <Check size={18} className="mr-2" />
                Generate {selectedAssemblies.length} Barcode{selectedAssemblies.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;