// src/components/Projects/ProjectAssemblies.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { Assembly, assembliesApi } from '../../lib/projectsApi';
import { formatWeight, formatDate, formatDimension } from '../../utils/formatters';
import { useColumnSettings } from '../../contexts/ColumnSettingsContext';
import ColumnSettings from '../../components/ColumnSettings';
import { getDefaultAssemblyColumns } from '../../lib/preferencesApi';

interface ProjectAssembliesProps {
  projectId: string;
}

const ProjectAssemblies: React.FC<ProjectAssembliesProps> = ({ projectId }) => {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Get column preferences from context
  const { assemblyColumns, saveAssemblyColumns } = useColumnSettings();
  
  // Get visible columns
  const visibleColumns = assemblyColumns.filter(col => col.visible);

  // Save column preferences
  const saveColumnPreferences = async (columns: any) => {
    try {
      await saveAssemblyColumns(columns);
      setShowColumnSettings(false);
    } catch (error) {
      console.error('Error saving column preferences:', error);
    }
  };

  // Fetch project assemblies
  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        setLoading(true);
        const data = await assembliesApi.getAssembliesByProject(projectId);
        setAssemblies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assemblies:', err);
        setError('Failed to load assemblies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchAssemblies();
    }
  }, [projectId]);

  // Delete an assembly
  const handleDeleteAssembly = async (assemblyId: string) => {
    if (!window.confirm('Are you sure you want to delete this assembly?')) {
      return;
    }
    
    try {
      await assembliesApi.deleteAssembly(assemblyId);
      setAssemblies(assemblies.filter(assembly => assembly.id !== assemblyId));
    } catch (err) {
      console.error('Error deleting assembly:', err);
      setError('Failed to delete assembly. Please try again.');
    }
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle sort direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Add this near the top of the component
  const sortByDate = (dateA: string | null | undefined, dateB: string | null | undefined, direction: 'asc' | 'desc') => {
    if (!dateA && !dateB) return 0;
    if (!dateA) return direction === 'asc' ? -1 : 1;
    if (!dateB) return direction === 'asc' ? 1 : -1;
    
    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();
    
    return direction === 'asc' ? timeA - timeB : timeB - timeA;
  };

  // Then update the sorting function to handle dates properly
  const sortedAssemblies = [...assemblies].sort((a, b) => {
    if (sortField === 'start_date') {
      return sortByDate(a.start_date as string, b.start_date as string, sortDirection);
    }
    if (sortField === 'end_date') {
      return sortByDate(a.end_date as string, b.end_date as string, sortDirection);
    }
    
    const fieldA = a[sortField as keyof Assembly];
    const fieldB = b[sortField as keyof Assembly];
    
    // Handle null/undefined values
    if (fieldA === null || fieldA === undefined) return sortDirection === 'asc' ? -1 : 1;
    if (fieldB === null || fieldB === undefined) return sortDirection === 'asc' ? 1 : -1;
    
    // String comparison
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortDirection === 'asc' 
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    }
    
    // Number comparison
    return sortDirection === 'asc'
      ? Number(fieldA) - Number(fieldB)
      : Number(fieldB) - Number(fieldA);
  });

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-gray-800">Assemblies</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            <Settings size={16} className="mr-1" />
            Columns
          </button>
          <Link
            to={`/dashboard/assemblies/create-multiple?projectId=${projectId}`}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Plus size={16} className="mr-1 text-white" />
            <span className="text-white">Add Multiple</span>
          </Link>
          <Link
            to={`/dashboard/assemblies/create?projectId=${projectId}`}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} className="mr-1 text-white" />
            <span className="text-white">Add Assembly</span>
          </Link>
        </div>
      </div>
      
      {/* Column settings modal */}
      {showColumnSettings && (
        <div className="absolute right-4 z-10">
          <ColumnSettings
            columns={assemblyColumns}
            onSave={saveColumnPreferences}
            onCancel={() => setShowColumnSettings(false)}
            getDefaultColumns={getDefaultAssemblyColumns}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent mb-2"></div>
          <p className="text-gray-500">Loading assemblies...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : assemblies.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <p className="text-gray-500 mb-4">No assemblies added to this project yet.</p>
          <Link
            to={`/dashboard/assemblies/create?projectId=${projectId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2 text-white" />
            <span className="text-white">Add First Assembly</span>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden border border-gray-200">
            <thead className="bg-gray-100 text-gray-700 select-none">
              <tr>
                {/* Dynamic column headers based on preferences */}
                {visibleColumns.map(column => (
                  <th 
                    key={column.id} 
                    className="text-left p-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort(column.id)}
                  >
                    <div className="flex items-center">
                      <span>{column.label}</span>
                      {sortField === column.id && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                
                {/* Always include actions column */}
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAssemblies.map((assembly) => (
                <tr key={assembly.id} className="hover:bg-gray-50">
                  {/* Dynamic columns based on preferences */}
                  {visibleColumns.map(column => {
                    // Render different content based on column id
                    switch (column.id) {
                      case 'name':
                        return <td key={column.id} className="p-3">{assembly.name}</td>;
                      case 'weight':
                        return <td key={column.id} className="p-3">{formatWeight(assembly.weight)}</td>;
                      case 'quantity':
                        return <td key={column.id} className="p-3">{assembly.quantity}</td>;
                      case 'status':
                        return (
                          <td key={column.id} className="p-3">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                assembly.status === 'Waiting'
                                  ? 'bg-blue-100 text-blue-800'
                                  : assembly.status === 'In Production'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : assembly.status === 'Welding'
                                  ? 'bg-orange-100 text-orange-800'
                                  : assembly.status === 'Painting'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {assembly.status}
                            </span>
                          </td>
                        );
                      case 'width':
                        return <td key={column.id} className="p-3">{assembly.width ? formatDimension(assembly.width) : '—'}</td>;
                      case 'height':
                        return <td key={column.id} className="p-3">{assembly.height ? formatDimension(assembly.height) : '—'}</td>;
                      case 'length':
                        return <td key={column.id} className="p-3">{assembly.length ? formatDimension(assembly.length) : '—'}</td>;
                      case 'painting_spec':
                        return <td key={column.id} className="p-3">{assembly.painting_spec || '—'}</td>;
                      case 'start_date':
                        return <td key={column.id} className="p-3">{assembly.start_date ? formatDate(assembly.start_date as string) : '—'}</td>;
                      case 'end_date':
                        return <td key={column.id} className="p-3">{assembly.end_date ? formatDate(assembly.end_date as string) : '—'}</td>;
                      case 'quality_control_status':
                        return <td key={column.id} className="p-3">{assembly.quality_control_status || '—'}</td>;
                      default:
                        return <td key={column.id} className="p-3">—</td>;
                    }
                  })}
                  
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/assemblies/${assembly.id}`, { state: { from: 'project' } })}
                        title="View"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/assemblies/${assembly.id}/edit`)}
                        title="Edit"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Edit size={16} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssembly(assembly.id as string)}
                        title="Delete"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectAssemblies;