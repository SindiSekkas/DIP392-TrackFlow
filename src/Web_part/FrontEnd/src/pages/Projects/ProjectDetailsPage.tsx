// src/pages/Projects/ProjectDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  Package,
} from 'lucide-react';
import { Project, projectsApi } from '../../lib/projectsApi';
import { formatDate, formatWeight } from '../../utils/formatters';
import ProjectDrawings from '../../components/Projects/ProjectDrawings';
import ProjectAssemblies from '../../components/Projects/ProjectAssemblies';

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) {
        navigate('/dashboard/projects');
        return;
      }

      try {
        setLoading(true);
        const data = await projectsApi.getProject(id);
        setProject(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, navigate]);

  const handleDeleteProject = async () => {
    if (!project?.id || !window.confirm('Are you sure you want to delete this project?')) {
      return;
    }
    
    try {
      await projectsApi.deleteProject(project.id);
      navigate('/dashboard/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <span className="text-white">Return to Projects</span>
          </button>
        </div>
      </div>
    );
  }

  return (  
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back to projects"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
          <span className="ml-4 px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
            #{project.internal_number}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/dashboard/projects/${project.id}/edit`)}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Edit Project"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={handleDeleteProject}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete Project"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Project status */}
      <div className="mb-6">
        <span
          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
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
      </div>

      {/* Project details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Project Details</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="text-gray-700">{project.client}</p>
                {project.client_representative && (
                  <p className="text-sm text-gray-500 mt-1">
                    Representative: {project.client_representative}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Timeframe</p>
                <p className="text-gray-700">
                  {formatDate(project.project_start)} - {formatDate(project.project_end)}
                </p>
              </div>
            </div>
            
            {project.delivery_date && (
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="text-gray-700">{formatDate(project.delivery_date)}</p>
                </div>
              </div>
            )}
            
            {project.delivery_location && (
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Delivery Location</p>
                  <p className="text-gray-700">{project.delivery_location}</p>
                </div>
              </div>
            )}
            
            {project.total_weight !== undefined && (
              <div className="flex items-start">
                <Package className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Total Weight</p>
                  <p className="text-gray-700">{formatWeight(project.total_weight)}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Responsible Manager</p>
                <p className="text-gray-700">{project.responsible_manager}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {project.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Notes</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-gray-700 whitespace-pre-line">{project.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Drawings */}
      <div className="mt-8">
        <ProjectDrawings projectId={project.id as string} />
      </div>

      {/* Assemblies Section */}
      <ProjectAssemblies projectId={project.id as string} />
    </div>
  );
};

export default ProjectDetailsPage;