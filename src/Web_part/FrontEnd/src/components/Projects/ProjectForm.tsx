// src/components/Projects/ProjectForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, projectsApi } from '../../lib/projectsApi';
import { Upload, X, AlertCircle } from 'lucide-react';

interface ProjectFormProps {
  initialData?: Project;
  isEditing?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ 
  initialData, 
  isEditing = false 
}) => {
  const navigate = useNavigate();

  // Initialize form state
  const [formData, setFormData] = useState<Project>(
    initialData || {
      name: '',
      internal_number: '',
      client: '',
      client_representative: '',
      project_start: '',
      project_end: '',
      delivery_date: '',
      delivery_location: '',
      total_weight: undefined,
      status: 'Planning',
      responsible_manager: '',
      notes: ''
    }
  );

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Special handling for date fields
    if (type === 'date') {
      setFormData({
        ...formData,
        [name]: value || null // Use null instead of empty string if value is empty
      });
    }
    // Handle numeric inputs
    else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : parseFloat(value)
      });
    }
    // Handle other fields
    else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => 
        file.type === 'application/pdf'
      );
      
      if (newFiles.length !== Array.from(e.target.files).length) {
        setError('Only PDF files are allowed.');
        setTimeout(() => setError(null), 3000);
      }
      
      setFiles([...files, ...newFiles]);
    }
  };

  // Remove a file from the list
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.name || !formData.internal_number || !formData.client || 
          !formData.project_start || !formData.project_end || !formData.status || 
          !formData.responsible_manager) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }
      
      // Ensure project end date is after start date
      if (new Date(formData.project_start) > new Date(formData.project_end)) {
        setError('Project end date must be after start date.');
        setLoading(false);
        return;
      }

      // Prepare data for submission, handle empty dates
      const projectToSave = {
        ...formData,
        delivery_date: formData.delivery_date ? formData.delivery_date : null
      };
      
      // Create or update project
      let project;
      if (isEditing && initialData?.id) {
        project = await projectsApi.updateProject(initialData.id, projectToSave);
      } else {
        project = await projectsApi.createProject(projectToSave);
      }
      
      // Upload files if any
      if (files.length > 0 && project.id) {
        try {
          // Show loading message for files
          setLoading(true);
          
          // Upload each file
          const uploadPromises = files.map(file => 
            projectsApi.uploadProjectDrawing(project.id as string, file)
          );
          
          await Promise.all(uploadPromises);
        } catch (fileError: any) {
          console.error('Error uploading files:', fileError);
          setError(`Project saved but failed to upload files: ${fileError.message || 'Unknown error'}`);
          // Continue with navigation despite file error
        }
      }
      
      // Navigate back to projects list or to project details
      navigate(isEditing ? `/dashboard/projects/${project.id}` : '/dashboard/projects');
      
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Project' : 'Create New Project'}
      </h2>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded bg-red-50 text-red-700 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Internal Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Number *
            </label>
            <input
              type="text"
              name="internal_number"
              value={formData.internal_number}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <input
              type="text"
              name="client"
              value={formData.client}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Client Representative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Representative
            </label>
            <input
              type="text"
              name="client_representative"
              value={formData.client_representative || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Project Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Start Date *
            </label>
            <input
              type="date"
              name="project_start"
              value={formData.project_start ? (
                typeof formData.project_start === 'string' 
                  ? formData.project_start.split('T')[0]
                  : formData.project_start.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Project End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project End Date *
            </label>
            <input
              type="date"
              name="project_end"
              value={formData.project_end ? (
                typeof formData.project_end === 'string' 
                  ? formData.project_end.split('T')[0]
                  : formData.project_end.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date
            </label>
            <input
              type="date"
              name="delivery_date"
              value={formData.delivery_date ? (
                typeof formData.delivery_date === 'string' 
                  ? formData.delivery_date.split('T')[0]
                  : formData.delivery_date.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Delivery Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Location
            </label>
            <input
              type="text"
              name="delivery_location"
              value={formData.delivery_location || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Total Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Weight (kg)
            </label>
            <input
              type="number"
              name="total_weight"
              value={formData.total_weight !== undefined ? formData.total_weight : ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="Planning">Planning</option>
              <option value="In Production">In Production</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Responsible Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsible Manager *
            </label>
            <input
              type="text"
              name="responsible_manager"
              value={formData.responsible_manager}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Drawings (PDF only)
          </label>
          <div className="mt-1 border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label 
              htmlFor="file-upload" 
              className="cursor-pointer flex justify-center items-center"
            >
              <Upload 
                size={24} 
                className="text-gray-400 mr-2" 
              />
              <span className="text-gray-600">Click to upload files</span>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Files to Upload
              </h4>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/projects')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;