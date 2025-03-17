// src/components/Assemblies/AssemblyForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Assembly, Project, assembliesApi, projectsApi } from '../../lib/projectsApi';
import { Upload, X, AlertCircle } from 'lucide-react';

interface AssemblyFormProps {
  initialData?: Assembly;
  isEditing?: boolean;
}

const AssemblyForm: React.FC<AssemblyFormProps> = ({ 
  initialData, 
  isEditing = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get projectId from URL query params if available
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromUrl = queryParams.get('projectId');

  // Initialize form state
  const [formData, setFormData] = useState<Assembly>(
    initialData || {
      project_id: projectIdFromUrl || '',
      name: '',
      weight: 0,
      quantity: 1,
      painting_spec: '',
      status: 'Waiting',
      start_date: '',
      end_date: '',
      quality_control_status: '',
      quality_control_notes: ''
    }
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [hasExistingDrawing, setHasExistingDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects for dropdown and check for existing drawing
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects for dropdown
        const projectsData = await projectsApi.getProjects();
        setProjects(projectsData);
        
        // If editing, check if assembly has a drawing
        if (isEditing && initialData?.id) {
          const drawing = await assembliesApi.getAssemblyDrawing(initialData.id);
          setHasExistingDrawing(!!drawing);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load necessary data. Please try again.');
      }
    };
    
    fetchData();
  }, [isEditing, initialData]);

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
        [name]: value === '' ? 0 : parseFloat(value)
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
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setFile(null);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.project_id || !formData.name || 
          formData.weight <= 0 || formData.quantity <= 0) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }
      
      // If editing but no drawing was provided during creation, require one now
      if (!isEditing && !file && !hasExistingDrawing) {
        setError('Please upload a drawing.');
        setLoading(false);
        return;
      }
      
      // Ensure end date is after start date if both are provided
      if (formData.start_date && formData.end_date && 
          new Date(formData.end_date) < new Date(formData.start_date)) {
        setError('End date must be after start date.');
        setLoading(false);
        return;
      }
      
      // Create or update assembly
      let assembly;
      if (isEditing && initialData?.id) {
        // Clean date fields
        const cleanedData = {
          ...formData,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        };
        assembly = await assembliesApi.updateAssembly(initialData.id, cleanedData);
      } else {
        // Clean date fields
        const cleanedData = {
          ...formData,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        };
        assembly = await assembliesApi.createAssembly(cleanedData);
      }
      
      // Upload drawing if provided
      if (file && assembly.id) {
        try {
          await assembliesApi.uploadAssemblyDrawing(assembly.id, file);
        } catch (uploadErr: any) {
          console.error('Error uploading drawing:', uploadErr);
          setError(`Assembly saved but failed to upload drawing: ${uploadErr.message || 'Storage permission error'}`);
          
          // Give the user a chance to see the error before navigating
          setTimeout(() => {
            if (formData.project_id) {
              navigate(`/dashboard/projects/${formData.project_id}`);
            } else {
              navigate('/dashboard/assemblies');
            }
          }, 5000);
          
          setLoading(false);
          return;
        }
      }
      
      // Navigate back to project details or assemblies list
      if (formData.project_id) {
        navigate(`/dashboard/projects/${formData.project_id}`);
      } else {
        navigate('/dashboard/assemblies');
      }
      
    } catch (err: any) {
      console.error('Error saving assembly:', err);
      setError(err.message || 'Failed to save assembly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Assembly' : 'Create New Assembly'}
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
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              required
              disabled={isEditing || !!projectIdFromUrl} // Disable if editing or pre-selected
              className={`w-full p-2 border border-gray-300 rounded-md ${
                (isEditing || !!projectIdFromUrl) ? 'bg-gray-100' : ''
              }`}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} (#{project.internal_number})
                </option>
              ))}
            </select>
          </div>

          {/* Assembly Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assembly Name *
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

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg) *
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              step="1"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Painting Specification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Painting Specification
            </label>
            <input
              type="text"
              name="painting_spec"
              value={formData.painting_spec || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="e.g., RAL 9010, 80μm thickness"
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
              <option value="Waiting">Waiting</option>
              <option value="In Production">In Production</option>
              <option value="Welding">Welding</option>
              <option value="Painting">Painting</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date ? (
                typeof formData.start_date === 'string' 
                  ? formData.start_date.split('T')[0]
                  : formData.start_date.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date ? (
                typeof formData.end_date === 'string' 
                  ? formData.end_date.split('T')[0]
                  : formData.end_date.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Quality Control */}
        <div className="mb-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Quality Control</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QC Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Control Status
              </label>
              <select
                name="quality_control_status"
                value={formData.quality_control_status || ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Conditional Pass">Conditional Pass</option>
              </select>
            </div>

            {/* QC Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Control Notes
              </label>
              <textarea
                name="quality_control_notes"
                value={formData.quality_control_notes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter any quality control observations or requirements"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Drawing Upload */}
        <div className="mb-6 border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assembly Drawing (PDF only) {!isEditing && !hasExistingDrawing ? '*' : ''}
          </label>
          
          {hasExistingDrawing && (
            <div className="mb-3 p-2 bg-blue-50 rounded text-blue-800 text-sm">
              This assembly already has a drawing. Uploading a new one will replace the existing drawing.
            </div>
          )}
          
          <div className="mt-1 border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            {!file ? (
              <>
                <input
                  type="file"
                  id="file-upload"
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
                  <span className="text-gray-600">
                    {isEditing || hasExistingDrawing
                      ? 'Click to upload a new drawing (optional)' 
                      : 'Click to upload drawing (required)'}
                  </span>
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)} // Go back to previous page
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Assembly' : 'Create Assembly'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssemblyForm;