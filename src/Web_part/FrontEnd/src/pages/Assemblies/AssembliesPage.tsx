// src/pages/Assemblies/AssembliesPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  Package,
  Filter,
  ChevronRight,
  LayoutGrid,
  Settings,
  Download,
  ArrowUp,
  ArrowDown,
  Barcode
} from 'lucide-react';
import { Project, Assembly, projectsApi, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatWeight, formatDimension } from '../../utils/formatters';
import { ColumnPreference, getDefaultAssemblyColumns } from '../../lib/preferencesApi';
import ColumnSettings from '../../components/ColumnSettings';
import { useColumnSettings } from '../../contexts/ColumnSettingsContext';
import BarcodePrintView from '../../components/Assemblies/BarcodePrintView';

// Define types for sorting
type SortColumn = 'name' | 'weight' | 'quantity' | 'status' | 'width' | 'height' | 'length' 
  | 'painting_spec' | 'start_date' | 'end_date' | 'quality_control_status';
type SortDirection = 'asc' | 'desc';

const AssembliesPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State for projects and assemblies
  const [projects, setProjects] = useState<Project[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Column preferences from context
  const { 
    assemblyColumns,
    saveAssemblyColumns 
  } = useColumnSettings();
  
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // State for barcode generation
  const [showPrintView, setShowPrintView] = useState(false);
  const [selectedBarcodes, setSelectedBarcodes] = useState<any[]>([]);
  
  // Loading and error states
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [assembliesLoading, setAssembliesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save column preferences
  const saveColumnPreferences = async (columns: ColumnPreference[]) => {
    try {
      await saveAssemblyColumns(columns);
      setShowColumnSettings(false);
    } catch (error) {
      console.error('Error saving column preferences:', error);
    }
  };

  // Get visible columns
  const visibleColumns = assemblyColumns.filter(col => col.visible);

  // Fetch all projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const data = await projectsApi.getProjects();
        setProjects(data);
        
        // Get previously selected projectId from sessionStorage
        const savedProjectId = sessionStorage.getItem('selectedProjectId');
        
        // Check if saved project exists in loaded projects
        const projectExists = savedProjectId && data.some(p => p.id === savedProjectId);
        
        if (projectExists) {
          setSelectedProjectId(savedProjectId);
        } else if (data.length > 0 && !selectedProjectId) {
          // If no saved project or it doesn't exist anymore, select first project
          setSelectedProjectId(data[0]?.id || null);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again.');
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Save selected project ID to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedProjectId) {
      sessionStorage.setItem('selectedProjectId', selectedProjectId);
    }
  }, [selectedProjectId]);

  // Fetch assemblies for the selected project when the project changes
  useEffect(() => {
    if (!selectedProjectId) return;

    fetchAssemblies();
  }, [selectedProjectId]);

  // Fetch assemblies function for refreshing data
  const fetchAssemblies = async () => {
    try {
      setAssembliesLoading(true);
      setError(null);
      
      if (selectedProjectId) {
        const data = await assembliesApi.getAssembliesByProject(selectedProjectId);
        setAssemblies(data);
      }
    } catch (err) {
      console.error('Error fetching assemblies:', err);
      setError('Failed to load assemblies. Please try again.');
    } finally {
      setAssembliesLoading(false);
    }
  };

  // Filter assemblies based on search term and status filter
  const filteredAssemblies = assemblies.filter(assembly => {
    const matchesSearch = 
      assembly.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? assembly.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Sort assemblies based on selected column and direction
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by this column in ascending order
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted assemblies based on sort column and direction
  const getSortedAssemblies = (): Assembly[] => {
    return [...filteredAssemblies].sort((a, b) => {
      let valueA: any = a[sortColumn];
      let valueB: any = b[sortColumn];
      
      // Special handling for dates
      if (sortColumn === 'start_date' || sortColumn === 'end_date') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // Special handling for numeric values that might be null
      if ((sortColumn === 'width' || sortColumn === 'height' || sortColumn === 'length') && 
          (valueA === null || valueB === null)) {
        if (valueA === null && valueB === null) return 0;
        if (valueA === null) return sortDirection === 'asc' ? 1 : -1;
        if (valueB === null) return sortDirection === 'asc' ? -1 : 1;
      }
      
      // Case insensitive comparison for strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle deleting an assembly
  const handleDeleteAssembly = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assembly?')) {
      return;
    }
    
    try {
      await assembliesApi.deleteAssembly(id);
      setAssemblies(assemblies.filter(assembly => assembly.id !== id));
    } catch (err) {
      console.error('Error deleting assembly:', err);
      setError('Failed to delete assembly. Please try again.');
    }
  };

  // Get the selected project
  const selectedProject = projects.find(project => project.id === selectedProjectId);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredAssemblies.length === 0) return;
    
    // Headers based on visible columns
    const headers = visibleColumns.map(col => col.label);
    
    // Prepare data rows based on visible columns
    const csvData = getSortedAssemblies().map(assembly => {
      return visibleColumns.map(column => {
        switch (column.id) {
          case 'name':
            return assembly.name;
          case 'weight':
            return assembly.weight.toString();
          case 'quantity':
            return assembly.quantity.toString();
          case 'status':
            return assembly.status;
          case 'width':
            return assembly.width ? assembly.width.toString() : '';
          case 'height':
            return assembly.height ? assembly.height.toString() : '';
          case 'length':
            return assembly.length ? assembly.length.toString() : '';
          case 'painting_spec':
            return assembly.painting_spec || '';
          case 'start_date':
            return assembly.start_date ? formatDate(assembly.start_date) : '';
          case 'end_date':
            return assembly.end_date ? formatDate(assembly.end_date) : '';
          case 'quality_control_status':
            return assembly.quality_control_status || '';
          default:
            return '';
        }
      });
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `assemblies_${selectedProject?.internal_number || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render column header with sort indicators
  const renderColumnHeader = (column: ColumnPreference) => {
    const id = column.id as SortColumn;
    return (
      <th 
        key={id}
        className="text-left p-3 cursor-pointer hover:bg-gray-200"
        onClick={() => handleSort(id)}
      >
        <div className="flex items-center justify-between">
          <span className="select-none">{column.label}</span>
          <span className="w-4 inline-block">
            {sortColumn === id && (
              sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Function to handle printing a single barcode
  const handlePrintSingleBarcode = async (assemblyId: string, assemblyName: string) => {
    try {
      setAssembliesLoading(true);
      
      // Get the barcode for this assembly
      const barcode = await assembliesApi.getAssemblyBarcode(assemblyId);
      
      if (barcode) {
        // Prepare barcode data for print view
        const barcodeData = [{
          id: barcode.id,
          barcode: barcode.barcode,
          assemblyName: assemblyName,
          projectName: selectedProject?.name || 'Unknown Project'
        }];
        
        // Show print view
        setSelectedBarcodes(barcodeData);
        setShowPrintView(true);
      } else {
        setError("No barcode found for this assembly");
      }
    } catch (err: any) {
      console.error('Error preparing barcode for printing:', err);
      setError(err.message || 'Failed to get barcode');
    } finally {
      setAssembliesLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md flex h-[calc(100vh-160px)] overflow-hidden">
      {/* Left sidebar with projects */}
      <div className="w-64 border-r border-gray-200 overflow-auto bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <h2 className="text-lg font-bold text-gray-700 flex items-center">
            <Package size={18} className="mr-2" />
            Projects
          </h2>
        </div>
        <div className="py-2">
          {projectsLoading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No projects found
            </div>
          ) : (
            <div>
              {projects.map(project => (
                <button
                  key={project.id}
                  className={`w-full text-left px-4 py-2 flex items-center ${
                    selectedProjectId === project.id 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedProjectId(project?.id || null)}
                >
                  <ChevronRight size={16} className="mr-2" />
                  <div>
                    <div className="font-medium">#{project.internal_number}</div>
                    <div className="text-sm text-gray-500 truncate">{project.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with selected project info */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            {selectedProject ? (
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  #{selectedProject.internal_number} — {selectedProject.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Client: {selectedProject.client} | Status: 
                  <span className={`inline-block ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                    selectedProject.status === 'Planning'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedProject.status === 'In Production'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedProject.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedProject.status}
                  </span>
                </p>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-gray-800">Assemblies</h2>
            )}
          </div>
          
          {selectedProject && (
            <div className="flex space-x-3">
              <Link
                to={`/dashboard/assemblies/upload?projectId=${selectedProject.id}`}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus size={18} className="mr-2 text-white" />
                <span className="text-white">Add Multiple</span>
              </Link>
              <Link
                to={`/dashboard/assemblies/create?projectId=${selectedProject.id}`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} className="mr-2 text-white" />
                <span className="text-white">Add Assembly</span>
              </Link>
            </div>
          )}
        </div>

        {/* Filters and search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4">
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
            
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="Waiting">Waiting</option>
                <option value="In Production">In Production</option>
                <option value="Welding">Welding</option>
                <option value="Painting">Painting</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <button
              onClick={exportToCSV}
              disabled={filteredAssemblies.length === 0}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Download size={18} className="mr-2" />
              Export
            </button>
            
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Settings size={18} className="mr-2" />
              Columns
            </button>
          </div>
          
          {/* Column settings modal */}
          {showColumnSettings && (
            <div className="absolute right-4 top-28 z-10">
              <ColumnSettings
                columns={assemblyColumns}
                onSave={saveColumnPreferences}
                onCancel={() => setShowColumnSettings(false)}
                getDefaultColumns={getDefaultAssemblyColumns}
              />
            </div>
          )}
        </div>

        {/* Assemblies table */}
        <div className="flex-1 overflow-auto">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <LayoutGrid size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Select a project</h3>
              <p className="text-gray-500 max-w-md">
                Choose a project from the sidebar to view its assemblies.
              </p>
            </div>
          ) : assembliesLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-500">Loading assemblies...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md">
                <p className="font-medium mb-2">Error</p>
                <p>{error}</p>
              </div>
            </div>
          ) : filteredAssemblies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Settings size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No assemblies found</h3>
              <p className="text-gray-500 mb-4 max-w-md">
                {searchTerm || statusFilter
                  ? "No assemblies match your search criteria. Try adjusting your filters."
                  : "This project doesn't have any assemblies yet."
                }
              </p>
              <Link
                to={`/dashboard/assemblies/create?projectId=${selectedProject.id}`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} className="mr-2 text-white" />
                <span className="text-white">Add First Assembly</span>
              </Link>
            </div>
          ) : (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {/* Dynamic column headers with sorting */}
                  {visibleColumns.map(column => renderColumnHeader(column))}
                  
                  {/* Always include actions column */}
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getSortedAssemblies().map((assembly) => (
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
                          onClick={() => navigate(`/dashboard/assemblies/${assembly.id}`, { state: { from: 'assemblies' } })}
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
                        <button
                          onClick={() => handlePrintSingleBarcode(assembly.id as string, assembly.name)}
                          title="Print Barcode"
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <Barcode size={16} className="text-green-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Barcode Print View */}
      {showPrintView && (
        <BarcodePrintView
          barcodes={selectedBarcodes}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </div>
  );
};

export default AssembliesPage;