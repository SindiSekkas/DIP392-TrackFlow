// src/components/Projects/ProjectDrawings.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Eye, Trash2, FileText } from 'lucide-react';
import { projectsApi, ProjectDrawing } from '../../lib/projectsApi';
import { formatFileSize } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

interface ProjectDrawingsProps {
  projectId: string;
}

const ProjectDrawings: React.FC<ProjectDrawingsProps> = ({ projectId }) => {
  const [drawings, setDrawings] = useState<ProjectDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project drawings
  useEffect(() => {
    const fetchDrawings = async () => {
      try {
        setLoading(true);
        const data = await projectsApi.getProjectDrawings(projectId);
        setDrawings(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching drawings:', err);
        setError('Failed to load drawings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchDrawings();
    }
  }, [projectId]);

  // Delete a drawing
  const handleDeleteDrawing = async (drawingId: string) => {
    if (!window.confirm('Are you sure you want to delete this drawing?')) {
      return;
    }
    
    try {
      await projectsApi.deleteProjectDrawing(drawingId);
      setDrawings(drawings.filter(drawing => drawing.id !== drawingId));
    } catch (err) {
      console.error('Error deleting drawing:', err);
      setError('Failed to delete drawing. Please try again.');
    }
  };

  // Function to get file URL from Supabase storage
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium">Drawings</h3>
        <Link
          to={`/dashboard/projects/${projectId}/edit`}
          className="text-blue-600 hover:underline text-sm flex items-center whitespace-nowrap"
        >
          <Plus size={16} className="mr-1" />
          Add Drawing
        </Link>
      </div>
      
      {loading ? (
        <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent mb-2"></div>
          <p className="text-gray-500">Loading drawings...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded border border-red-200 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : drawings.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
          <p className="text-gray-500">No drawings available</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded border border-gray-200 divide-y divide-gray-200">
          {drawings.map((drawing) => (
            <div key={drawing.id} className="p-3 flex items-center">
              {/* Document info with text wrap */}
              <div className="flex items-start flex-auto min-w-0 mr-2">
                <FileText className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" />
                <div className="min-w-0 overflow-hidden">
                  <p className="text-gray-700 break-words">{drawing.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(drawing.file_size)}
                  </p>
                </div>
              </div>
              
              {/* Actions - fixed width */}
              <div className="flex space-x-1 flex-shrink-0">
                <a
                  href={getFileUrl(drawing.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="View"
                >
                  <Eye size={16} />
                </a>
                <a
                  href={getFileUrl(drawing.file_path)}
                  download={drawing.file_name}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => handleDeleteDrawing(drawing.id as string)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDrawings;