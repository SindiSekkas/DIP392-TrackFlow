// src/pages/Projects/ProjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Download, Trash2, Edit, Eye } from 'lucide-react';
import { Project, projectsApi } from '../../lib/projectsApi';
import { formatDate } from '../../utils/formatters';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const navigate = useNavigate();

  // Loading projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await projectsApi.getProjects();
        setProjects(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Filtering projects by search query and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.internal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter ? project.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Deleting a project
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }
    
    try {
      await projectsApi.deleteProject(id);
      setProjects(projects.filter(project => project.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredProjects.length === 0) return;
    
    const headers = [
      'Name',
      'Internal Number',
      'Client',
      'Start Date',
      'End Date',
      'Status',
      'Manager'
    ];
    
    const csvData = filteredProjects.map(project => [
      project.name,
      project.internal_number,
      project.client,
      formatDate(project.project_start as string),
      formatDate(project.project_end as string),
      project.status,
      project.responsible_manager
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'projects.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <Link
          to="/dashboard/projects/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2 text-white" />
          <span className="text-white">Add Project</span>
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
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
            <option value="Planning">Planning</option>
            <option value="In Production">In Production</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        
        <button
          onClick={exportToCSV}
          disabled={filteredProjects.length === 0}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={18} className="mr-2" />
          Export
        </button>
      </div>

      {/* Projects table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-md">
          <p className="text-gray-500">No projects found.</p>
          {searchTerm || statusFilter ? (
            <p className="text-gray-400 mt-1">Try adjusting your filters.</p>
          ) : (
            <Link
              to="/dashboard/projects/create"
              className="mt-3 inline-block text-blue-600 hover:underline"
            >
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Internal #</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Start Date</th>
                <th className="text-left p-3">End Date</th>
                <th className="text-left p-3">Status</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="p-3">{project.name}</td>
                  <td className="p-3">{project.internal_number}</td>
                  <td className="p-3">{project.client}</td>
                  <td className="p-3">{formatDate(project.project_start as string)}</td>
                  <td className="p-3">{formatDate(project.project_end as string)}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'Planning'
                          ? 'bg-blue-100 text-blue-800'
                          : project.status === 'In Production'
                          ? 'bg-yellow-100 text-yellow-800'
                          : project.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                        title="View"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/projects/${project.id}/edit`)}
                        title="Edit"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Edit size={16} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id as string)}
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

export default ProjectsPage;