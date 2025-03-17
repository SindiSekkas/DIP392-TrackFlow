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
  Download
} from 'lucide-react';
import { Project, Assembly, projectsApi, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatWeight } from '../../utils/formatters';

const AssembliesPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State for projects and assemblies
  const [projects, setProjects] = useState<Project[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Loading and error states
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [assembliesLoading, setAssembliesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const fetchAssemblies = async () => {
      try {
        setAssembliesLoading(true);
        setError(null);
        const data = await assembliesApi.getAssembliesByProject(selectedProjectId);
        setAssemblies(data);
      } catch (err) {
        console.error('Error fetching assemblies:', err);
        setError('Failed to load assemblies. Please try again.');
      } finally {
        setAssembliesLoading(false);
      }
    };

    fetchAssemblies();
  }, [selectedProjectId]);

  // Filter assemblies based on search term and status filter
  const filteredAssemblies = assemblies.filter(assembly => {
    const matchesSearch = 
      assembly.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? assembly.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

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
    
    const headers = [
      'Name',
      'Weight (kg)',
      'Quantity',
      'Status',
      'Start Date',
      'End Date'
    ];
    
    const csvData = filteredAssemblies.map(assembly => [
      assembly.name,
      assembly.weight.toString(),
      assembly.quantity.toString(),
      assembly.status,
      assembly.start_date ? formatDate(assembly.start_date) : '',
      assembly.end_date ? formatDate(assembly.end_date) : ''
    ]);
    
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
            <Link
              to={`/dashboard/assemblies/create?projectId=${selectedProject.id}`}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} className="mr-2 text-white" />
              <span className="text-white">Add Assembly</span>
            </Link>
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
          </div>
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Weight</th>
                  <th className="text-left p-3 font-medium">Quantity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Start Date</th>
                  <th className="text-left p-3 font-medium">End Date</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssemblies.map((assembly) => (
                  <tr key={assembly.id} className="hover:bg-gray-50">
                    <td className="p-3">{assembly.name}</td>
                    <td className="p-3">{formatWeight(assembly.weight)}</td>
                    <td className="p-3">{assembly.quantity}</td>
                    <td className="p-3">
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
                    <td className="p-3">
                      {assembly.start_date ? formatDate(assembly.start_date as string) : '—'}
                    </td>
                    <td className="p-3">
                      {assembly.end_date ? formatDate(assembly.end_date as string) : '—'}
                    </td>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssembliesPage;