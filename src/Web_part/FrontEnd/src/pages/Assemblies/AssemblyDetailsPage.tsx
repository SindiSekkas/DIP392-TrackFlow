// src/pages/Assemblies/AssemblyDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Package,
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import { AssemblyWithProject, AssemblyDrawing, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatWeight, formatFileSize } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

const AssemblyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assembly, setAssembly] = useState<AssemblyWithProject | null>(null);
  const [drawing, setDrawing] = useState<AssemblyDrawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssemblyData = async () => {
      if (!id) {
        navigate('/dashboard/assemblies');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch assembly with project data
        const assemblyData = await assembliesApi.getAssemblyWithProject(id);
        setAssembly(assemblyData);
        
        // Fetch assembly drawing if exists
        const drawingData = await assembliesApi.getAssemblyDrawing(id);
        setDrawing(drawingData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching assembly data:', err);
        setError('Failed to load assembly. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssemblyData();
  }, [id, navigate]);

  const handleDeleteAssembly = async () => {
    if (!assembly?.id || !window.confirm('Are you sure you want to delete this assembly?')) {
      return;
    }
    
    try {
      await assembliesApi.deleteAssembly(assembly.id);
      if (assembly.project_id) {
        navigate(`/dashboard/projects/${assembly.project_id}`);
      } else {
        navigate('/dashboard/assemblies');
      }
    } catch (err) {
      console.error('Error deleting assembly:', err);
      setError('Failed to delete assembly. Please try again.');
    }
  };

  // Get file URL from Supabase storage
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading assembly...</p>
      </div>
    );
  }

  if (error || !assembly) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Assembly not found'}</p>
          <button
            onClick={() => navigate('/dashboard/assemblies')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Assemblies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(assembly.project_id ? `/dashboard/projects/${assembly.project_id}` : '/dashboard/assemblies')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{assembly.name}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/dashboard/assemblies/${assembly.id}/edit`)}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Edit Assembly"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={handleDeleteAssembly}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete Assembly"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6">
        <span
          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
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
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          {/* Assembly Details */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Assembly Details</h3>
            <div className="space-y-3">
              {assembly.project && (
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <Link 
                      to={`/dashboard/projects/${assembly.project_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {assembly.project.name} (#{assembly.project.internal_number})
                    </Link>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <Package className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Specifications</p>
                  <p className="text-gray-700">Weight: {formatWeight(assembly.weight)}</p>
                  <p className="text-gray-700">Quantity: {assembly.quantity}</p>
                  {assembly.painting_spec && (
                    <p className="text-gray-700">Painting: {assembly.painting_spec}</p>
                  )}
                </div>
              </div>
              
              {(assembly.start_date || assembly.end_date) && (
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Timeline</p>
                    {assembly.start_date && (
                      <p className="text-gray-700">Start: {formatDate(assembly.start_date)}</p>
                    )}
                    {assembly.end_date && (
                      <p className="text-gray-700">End: {formatDate(assembly.end_date)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Quality Control */}
          {(assembly.quality_control_status || assembly.quality_control_notes) && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                <CheckCircle size={18} className="mr-2 text-gray-500" />
                Quality Control
              </h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                {assembly.quality_control_status && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-gray-700">{assembly.quality_control_status}</p>
                  </div>
                )}
                {assembly.quality_control_notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-700 whitespace-pre-line">{assembly.quality_control_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div>
          {/* Drawing Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
              <FileText size={18} className="mr-2 text-gray-500" />
              Assembly Drawing
            </h3>
            
            {drawing ? (
              <div className="bg-gray-50 rounded border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-gray-700">{drawing.file_name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(drawing.file_size)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={getFileUrl(drawing.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye size={20} />
                    </a>
                    <a
                      href={getFileUrl(drawing.file_path)}
                      download={drawing.file_name}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="Download"
                    >
                      <Download size={20} />
                    </a>
                  </div>
                </div>
                
                {/* PDF Viewer (iframe) */}
                <div className="mt-3 border border-gray-300 rounded overflow-hidden">
                  <iframe
                    src={`${getFileUrl(drawing.file_path)}#toolbar=0`}
                    width="100%"
                    height="400"
                    title="Assembly Drawing"
                    className="block"
                  ></iframe>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-md text-center border border-gray-200">
                <p className="text-gray-500 mb-4">No drawing available for this assembly.</p>
                <Link
                  to={`/dashboard/assemblies/${assembly.id}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upload Drawing
                </Link>
              </div>
            )}
          </div>
          
          {/* Timestamp Information */}
          <div className="mt-6 text-xs text-gray-500">
            <div className="flex items-center justify-end gap-2">
              <Clock size={14} />
              <span>
                {assembly.created_at && `Created: ${formatDate(assembly.created_at)}`}
              </span>
              {assembly.updated_at && assembly.updated_at !== assembly.created_at && (
                <span className="ml-2">
                  {`Updated: ${formatDate(assembly.updated_at)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblyDetailsPage; 