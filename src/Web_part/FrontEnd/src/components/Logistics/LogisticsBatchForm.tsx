// src/components/Logistics/LogisticsBatchForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Upload, 
  X, 
  Truck,
  InfoIcon,
  Plus,
  Check
} from 'lucide-react';
import { LogisticsBatch, ShippingCompany, logisticsApi } from '../../lib/logisticsApi';
import { Project, projectsApi } from '../../lib/projectsApi';
import { Client, clientsApi } from '../../lib/clientsApi';

interface LogisticsBatchFormProps {
  initialData?: LogisticsBatch;
  isEditing?: boolean;
}

const LogisticsBatchForm: React.FC<LogisticsBatchFormProps> = ({ 
  initialData, 
  isEditing = false 
}) => {
  const navigate = useNavigate();

  // Form data state
  const [formData, setFormData] = useState<LogisticsBatch>(
    initialData || {
      batch_number: '',
      client_id: '',
      project_id: '',
      shipping_company_id: '',
      delivery_address: '',
      total_weight: undefined,
      status: 'Pending',
      shipment_date: '',
      estimated_arrival: '',
      actual_arrival: '',
      notes: ''
    }
  );

  // Options for dropdowns
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [selectedClientProjects, setSelectedClientProjects] = useState<Project[]>([]);
  
  // Shipping company autocomplete
  const [shippingCompanyInput, setShippingCompanyInput] = useState('');
  const [shippingCompanySuggestions, setShippingCompanySuggestions] = useState<ShippingCompany[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  
  // Document upload state
  const [files, setFiles] = useState<File[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data for form options
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoading(true);
        
        // Fetch clients
        const clientsData = await clientsApi.getClients();
        setClients(clientsData);
        
        // Fetch all projects
        const projectsData = await projectsApi.getProjects();
        setProjects(projectsData);
        
        // Fetch shipping companies
        const shippingCompaniesData = await logisticsApi.getShippingCompanies();
        setShippingCompanies(shippingCompaniesData);
        
        // If editing, filter projects for selected client
        if (isEditing && initialData?.client_id) {
          // Use clientsData directly instead of clients state which might not be updated yet
          const selectedClient = clientsData.find(c => c.id === initialData.client_id);
          const clientProjects = projectsData.filter(
            project => project.client === selectedClient?.company_name
          );
          setSelectedClientProjects(clientProjects);
          
          // Set shipping company input if editing
          if (initialData.shipping_company_id) {
            const company = shippingCompaniesData.find(c => c.id === initialData.shipping_company_id);
            if (company) {
              setShippingCompanyInput(company.name);
            }
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load necessary data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [isEditing, initialData]);

  // Update projects when client changes or when clients/projects lists are updated
  useEffect(() => {
    if (formData.client_id) {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const clientProjects = projects.filter(
        project => project.client === selectedClient?.company_name
      );
      setSelectedClientProjects(clientProjects);
      
      // Only reset project_id if the client has changed and the current project doesn't belong to this client
      // This prevents resetting the project when just loading the data
      if (formData.project_id && !clientProjects.some(p => p.id === formData.project_id) && !isEditing) {
        setFormData(prev => ({ ...prev, project_id: '' }));
      }
    }
  }, [formData.client_id, clients, projects, isEditing]);

  // Handler for shipping company input changes
  const handleShippingCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setShippingCompanyInput(value);
    
    // If input becomes empty or doesn't match the current selection, clear the selection
    if (!value || (formData.shipping_company_id && 
        shippingCompanies.find(c => c.id === formData.shipping_company_id)?.name !== value)) {
      setFormData({
        ...formData,
        shipping_company_id: ''
      });
    }
    
    // Search for suggestions
    searchShippingCompanies(value);
  };

  // Search shipping companies for autocomplete
  const searchShippingCompanies = async (query: string) => {
    if (query.length < 2) {
      setShippingCompanySuggestions([]);
      return;
    }
    
    try {
      const results = await logisticsApi.searchShippingCompanies(query);
      setShippingCompanySuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error searching shipping companies:', err);
      setShippingCompanySuggestions([]);
    }
  };

  // Select a shipping company from suggestions
  const selectShippingCompany = (company: ShippingCompany) => {
    setShippingCompanyInput(company.name);
    setFormData({
      ...formData,
      shipping_company_id: company.id as string
    });
    setShowSuggestions(false);
  };

  // Create a new shipping company
  const createShippingCompany = async () => {
    if (!shippingCompanyInput.trim()) return;
    
    try {
      setIsCreatingCompany(true);
      const newCompany = await logisticsApi.createShippingCompany(shippingCompanyInput);
      
      // Update the list and select the new company
      setShippingCompanies(prev => [...prev, newCompany]);
      setFormData({
        ...formData,
        shipping_company_id: newCompany.id as string
      });
      setShowSuggestions(false);
    } catch (err) {
      console.error('Error creating shipping company:', err);
      setError('Failed to create new shipping company. Please try again.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  // Remove a file from the list
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Generate unique batch number
  const generateBatchNumber = () => {
    const prefix = 'BATCH';
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${randomPart}`;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (!formData.client_id || !formData.project_id || !formData.delivery_address || !formData.status) {
        setError('Please fill in all required fields.');
        setSubmitting(false);
        return;
      }
      
      let finalFormData = { ...formData };
      
      // If shipping company input is filled but no ID is selected, create a new company
      if (shippingCompanyInput.trim() && !formData.shipping_company_id) {
        try {
          const newCompany = await logisticsApi.createShippingCompany(shippingCompanyInput);
          finalFormData.shipping_company_id = newCompany.id as string;
        } catch (err) {
          console.error('Error creating shipping company:', err);
          setError('Failed to create shipping company. Please try again.');
          setSubmitting(false);
          return;
        }
      }
      
      // Generate batch number if not provided
      if (!finalFormData.batch_number) {
        finalFormData.batch_number = generateBatchNumber();
      }
      
      // Clean up date fields - ensure empty strings are converted to null
      finalFormData = {
        ...finalFormData,
        shipment_date: finalFormData.shipment_date || null,
        estimated_arrival: finalFormData.estimated_arrival || null,
        actual_arrival: finalFormData.actual_arrival || null
      };
      
      // Create or update batch
      let batch: LogisticsBatch;
      if (isEditing && initialData?.id) {
        batch = await logisticsApi.updateBatch(initialData.id, finalFormData);
      } else {
        batch = await logisticsApi.createBatch(finalFormData);
      }
      
      // Upload files if any
      if (files.length > 0 && batch.id) {
        try {
          // Upload each file
          const uploadPromises = files.map(file => 
            logisticsApi.uploadBatchDocument(batch.id as string, file)
          );
          
          await Promise.all(uploadPromises);
        } catch (fileError: any) {
          console.error('Error uploading files:', fileError);
          setError(`Batch saved but failed to upload files: ${fileError.message || 'Unknown error'}`);
          // Continue with navigation despite file error
        }
      }
      
      // Navigate to batch details page
      navigate(`/dashboard/logistics/${batch.id}`);
      
    } catch (err: any) {
      console.error('Error saving logistics batch:', err);
      setError(err.message || 'Failed to save logistics batch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading form data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Truck size={24} className="mr-2 text-blue-600" />
        {isEditing ? 'Edit Logistics Batch' : 'Create New Logistics Batch'}
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
          {/* Batch Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Number {!isEditing && <span className="text-gray-400">(Auto-generated if empty)</span>}
            </label>
            <input
              type="text"
              name="batch_number"
              value={formData.batch_number}
              onChange={handleChange}
              disabled={isEditing}
              className={`w-full p-2 border border-gray-300 rounded-md ${isEditing ? 'bg-gray-100' : ''}`}
              placeholder="e.g., BATCH-123ABC"
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
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              required
              disabled={!formData.client_id}
              className={`w-full p-2 border border-gray-300 rounded-md ${!formData.client_id ? 'bg-gray-100' : ''}`}
            >
              <option value="">Select Project</option>
              {selectedClientProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.internal_number} - {project.name}
                </option>
              ))}
            </select>
            {!formData.client_id && (
              <p className="text-sm text-gray-500 mt-1">Please select a client first</p>
            )}
          </div>

          {/* Shipping Company - New Autocomplete Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping Company *
            </label>
            <div className="relative" ref={suggestionRef}>
              <input
                type="text"
                value={shippingCompanyInput}
                onChange={handleShippingCompanyInputChange}
                onFocus={() => {
                  if (shippingCompanyInput.length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Enter shipping company name"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
              
              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                  {shippingCompanySuggestions.length > 0 ? (
                    <>
                      {shippingCompanySuggestions.map(company => (
                        <div 
                          key={company.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                          onClick={() => selectShippingCompany(company)}
                        >
                          <span>{company.name}</span>
                          {formData.shipping_company_id === company.id && (
                            <Check size={16} className="text-green-500" />
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-gray-500 mb-2">No matching companies found</p>
                      {shippingCompanyInput.length >= 2 && (
                        <button
                          type="button"
                          onClick={createShippingCompany}
                          disabled={isCreatingCompany}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center mx-auto"
                        >
                          <Plus size={14} className="mr-1" />
                          {isCreatingCompany ? 'Creating...' : `Create "${shippingCompanyInput}"`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.shipping_company_id && (
              <p className="text-xs text-green-600 mt-1">
                Selected shipping company: {shippingCompanies.find(c => c.id === formData.shipping_company_id)?.name}
              </p>
            )}
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Address *
            </label>
            <input
              type="text"
              name="delivery_address"
              value={formData.delivery_address}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter full delivery address"
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
              placeholder="Auto-calculated from assemblies"
            />
          </div>

          {/* Shipment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipment Date
            </label>
            <input
              type="date"
              name="shipment_date"
              value={formData.shipment_date ? (
                typeof formData.shipment_date === 'string' 
                  ? formData.shipment_date.split('T')[0]
                  : formData.shipment_date.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Estimated Arrival */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Arrival
            </label>
            <input
              type="date"
              name="estimated_arrival"
              value={formData.estimated_arrival ? (
                typeof formData.estimated_arrival === 'string' 
                  ? formData.estimated_arrival.split('T')[0]
                  : formData.estimated_arrival.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Actual Arrival */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Arrival
            </label>
            <input
              type="date"
              name="actual_arrival"
              value={formData.actual_arrival ? (
                typeof formData.actual_arrival === 'string' 
                  ? formData.actual_arrival.split('T')[0]
                  : formData.actual_arrival.toISOString().split('T')[0]
              ) : ''}
              onChange={handleChange}
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
            placeholder="Enter any additional information about this shipment"
          ></textarea>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shipping Documents
          </label>
          <div className="mt-1 border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <label 
              htmlFor="file-upload" 
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload 
                size={36} 
                className="text-gray-400 mb-2" 
              />
              <span className="text-gray-600 mb-1">Click to upload shipping documents</span>
              <span className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG accepted</span>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Files to Upload ({files.length})
              </h4>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <li 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-sm text-gray-700 truncate max-w-[300px]">{file.name}</span>
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

        {/* Note about assemblies */}
        {!isEditing && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-md flex items-start">
            <InfoIcon size={20} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Adding Assemblies</p>
              <p className="text-sm mt-1">
                After creating the batch, you'll be able to add assemblies to it. The total weight will be automatically calculated
                based on the assemblies you add.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/logistics')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Batch' : 'Create Batch'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LogisticsBatchForm;