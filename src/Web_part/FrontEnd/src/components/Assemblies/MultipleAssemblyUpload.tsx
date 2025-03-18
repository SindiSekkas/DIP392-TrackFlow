// src/components/Assemblies/MultipleAssemblyUpload.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  UploadCloud, 
  Download, 
  Plus, 
  Trash2, 
  AlertCircle, 
  FileSpreadsheet, 
  CheckCircle, 
  InfoIcon,
  Copy,
  Save,
  Settings
} from 'lucide-react';
import { Assembly, Project, assembliesApi, projectsApi } from '../../lib/projectsApi';
import * as XLSX from 'xlsx';

interface MultipleAssemblyUploadProps {
  projectId?: string;
}

interface AssemblyRow {
  id: string; // Temporary id for UI
  name: string;
  weight: number | null;
  quantity: number;
  width: number | null;
  height: number | null;
  length: number | null;
  status: 'Waiting' | 'In Production' | 'Welding' | 'Painting' | 'Completed';
  painting_spec: string;
  error?: string;
}

interface GlobalValues {
  status?: string;
  painting_spec?: string;
}

// Create a new row with default values and unique ID
function createNewRow(): AssemblyRow {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: '',
    weight: null,
    quantity: 1,
    width: null,
    height: null,
    length: null,
    status: 'Waiting',
    painting_spec: ''
  };
}

const MultipleAssemblyUpload: React.FC<MultipleAssemblyUploadProps> = ({ projectId: propProjectId }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  
  // Use projectId from props, URL param, or URL query parameter
  const effectiveProjectId = propProjectId || id || urlProjectId || '';
  
  // State management
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<AssemblyRow[]>([createNewRow()]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadedRows, setUploadedRows] = useState<AssemblyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  const [globalValues, setGlobalValues] = useState<GlobalValues>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show a notification with auto-dismiss
  const showNotification = (type: 'success' | 'error' | 'info', message: string, duration = 3000) => {
    setNotification({ type, message });
    if (duration > 0) {
      setTimeout(() => setNotification(null), duration);
    }
  };

  // Fetch project details when component mounts
  useEffect(() => {
    if (!effectiveProjectId) {
      navigate('/dashboard/projects');
      return;
    }

    const fetchProject = async () => {
      try {
        const data = await projectsApi.getProject(effectiveProjectId);
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        showNotification('error', 'Failed to load project details', 0);
      }
    };

    fetchProject();
  }, [effectiveProjectId, navigate]);

  // Generate Excel template
  const generateExcelTemplate = () => {
    // Create headers
    const headers = [
      'Name*', 'Weight (kg)*', 'Quantity*', 'Status*', 
      'Width (mm)', 'Height (mm)', 'Length (mm)', 
      'Painting Spec'
    ];
    
    // Sample data
    const sampleData = [
      [
        'Assembly 1', '450', '1', 'Waiting', 
        '1200', '800', '2400', 
        'RAL 9010'
      ],
      [
        'Assembly 2', '320', '2', 'Waiting',
        '900', '600', '1800',
        'RAL 7035'
      ]
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with headers and sample data
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    
    // Set column widths
    const wscols = headers.map(() => ({ wch: 15 }));
    ws['!cols'] = wscols;
    
    // Add instructions sheet
    const instructionsData = [
      ['Assembly Upload Template Instructions'],
      [''],
      ['1. Fields marked with * are required'],
      ['2. Weight must be a positive number'],
      ['3. Quantity must be a positive whole number'],
      ['4. Status must be one of: Waiting, In Production, Welding, Painting, Completed'],
      ['5. Dimensions (Width, Height, Length) should be in millimeters'],
      ['6. Leave fields blank if not applicable'],
      ['7. Do not modify or remove the header row'],
      ['8. Each row represents one assembly to be created'],
      ['']
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Assemblies');
    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
    
    // Generate filename with project info if available
    const filename = project 
      ? `assembly_template_${project.internal_number}.xlsx` 
      : 'assembly_template.xlsx';
    
    // Write and download
    XLSX.writeFile(wb, filename);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type (accept .xlsx, .xls)
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!validTypes.includes(file.type)) {
        showNotification('error', 'Please upload an Excel file (.xlsx or .xls)', 0);
        return;
      }
      
      setExcelFile(file);
      processExcelFile(file);
    }
  };
  
  // Reset the file input to allow uploading the same file again
  const resetFileInput = () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Process Excel file
  const processExcelFile = async (file: File) => {
    try {
      setLoading(true);
      setNotification(null);
      
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Get first sheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
      
      if (jsonData.length === 0) {
        showNotification('error', 'The uploaded file contains no data', 0);
        setUploadedRows([]);
        setLoading(false);
        return;
      }
      
      // Process and validate rows
      const processedRows: AssemblyRow[] = jsonData.map((row: any, index: number) => {
        // Extract values, handling different possible column names from the template
        const name = row['Name*'] || row['Name'] || '';
        
        // Parse weight value
        let weight: number | null = null;
        const weightValue = row['Weight (kg)*'] || row['Weight'] || row['Weight (kg)'];
        if (weightValue !== undefined && weightValue !== '') {
          const parsedWeight = parseFloat(weightValue);
          if (!isNaN(parsedWeight)) {
            weight = parsedWeight;
          }
        }
        
        // Parse quantity value
        let quantity = 1;
        const quantityValue = row['Quantity*'] || row['Quantity'];
        if (quantityValue !== undefined && quantityValue !== '') {
          const parsedQuantity = parseInt(quantityValue.toString());
          if (!isNaN(parsedQuantity)) {
            quantity = parsedQuantity;
          }
        }
        
        // Extract other fields
        const status = (row['Status*'] || row['Status'] || 'Waiting') as AssemblyRow['status'];
        
        // Parse dimensions
        let width: number | null = null;
        let height: number | null = null;
        let length: number | null = null;
        
        if (row['Width (mm)'] !== undefined && row['Width (mm)'] !== '') {
          const parsedWidth = parseFloat(row['Width (mm)']);
          if (!isNaN(parsedWidth)) {
            width = parsedWidth;
          }
        }
        
        if (row['Height (mm)'] !== undefined && row['Height (mm)'] !== '') {
          const parsedHeight = parseFloat(row['Height (mm)']);
          if (!isNaN(parsedHeight)) {
            height = parsedHeight;
          }
        }
        
        if (row['Length (mm)'] !== undefined && row['Length (mm)'] !== '') {
          const parsedLength = parseFloat(row['Length (mm)']);
          if (!isNaN(parsedLength)) {
            length = parsedLength;
          }
        }
        
        const painting_spec = row['Painting Spec'] || '';
        
        // Add basic validation
        let error = '';
        if (!name) {
          error = 'Name is required';
        } else if (weight === null) {
          error = 'Weight is required';
        } else if (weight !== null && weight <= 0) {
          error = 'Weight must be a positive number';
        } else if (quantity <= 0) {
          error = 'Quantity must be a positive integer';
        } else if (!['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'].includes(status)) {
          error = 'Invalid status';
        }
        
        return {
          id: `excel-${index}-${Date.now()}`,
          name,
          weight,
          quantity,
          status,
          width,
          height,
          length,
          painting_spec,
          error
        };
      });
      
      setUploadedRows(processedRows);
    } catch (err) {
      console.error('Error processing Excel file:', err);
      showNotification('error', 'Failed to process the Excel file. Please check the format.', 0);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type (accept .xlsx, .xls)
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!validTypes.includes(file.type)) {
        showNotification('error', 'Please upload an Excel file (.xlsx or .xls)', 0);
        return;
      }
      
      setExcelFile(file);
      processExcelFile(file);
    }
  };

  // Add a new row to manual entry
  const addRow = () => {
    const newRow = createNewRow();
    // Apply global values to the new row if they exist
    if (globalValues.status) {
      newRow.status = globalValues.status as AssemblyRow['status'];
    }
    if (globalValues.painting_spec) {
      newRow.painting_spec = globalValues.painting_spec;
    }
    setRows([...rows, newRow]);
  };

  // Remove a row from manual entry
  const removeRow = (id: string) => {
    if (rows.length === 1) {
      // If it's the last row, just reset it instead of removing
      const newRow = createNewRow();
      if (globalValues.status) {
        newRow.status = globalValues.status as AssemblyRow['status'];
      }
      if (globalValues.painting_spec) {
        newRow.painting_spec = globalValues.painting_spec;
      }
      setRows([newRow]);
    } else {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  // Duplicate a row
  const duplicateRow = (id: string) => {
    const rowToDuplicate = rows.find(row => row.id === id);
    if (!rowToDuplicate) return;
    
    const newRow = {
      ...rowToDuplicate,
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: `${rowToDuplicate.name} (Copy)`
    };
    
    setRows([...rows, newRow]);
  };

  // Apply a field value to all rows
  const applyToAll = (field: keyof GlobalValues, value: string) => {
    // Don't apply empty values
    if (!value.trim() && field === 'painting_spec') return;
    
    // Update global values for tracking what's been applied
    setGlobalValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Apply to all rows
    const updatedRows = rows.map(row => ({
      ...row,
      [field]: field === 'status' ? value as AssemblyRow['status'] : value
    }));
    
    setRows(updatedRows);
  };

  // Handle row changes in manual entry
  const handleRowChange = (id: string, field: keyof AssemblyRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Validate all rows
  const validateRows = (rowsToValidate: AssemblyRow[]): boolean => {
    let isValid = true;
    
    const validatedRows = rowsToValidate.map(row => {
      let error = '';
      if (!row.name) {
        error = 'Name is required';
        isValid = false;
      } else if (row.weight === null) {
        error = 'Weight is required';
        isValid = false;
      } else if (row.weight !== null && row.weight <= 0) {
        error = 'Weight must be positive';
        isValid = false;
      } else if (row.quantity <= 0) {
        error = 'Quantity must be positive';
        isValid = false;
      }
      
      return { ...row, error };
    });
    
    // Update rows with validation errors
    if (!isValid) {
      if (activeTab === 'manual') {
        setRows(validatedRows);
      } else {
        setUploadedRows(validatedRows);
      }
      showNotification('error', 'Please fix validation errors before submitting', 0);
    }
    
    return isValid;
  };

  // Submit Excel data
  const submitExcelData = async () => {
    if (!effectiveProjectId) {
      showNotification('error', 'Project ID is missing', 0);
      return;
    }
    
    if (!validateRows(uploadedRows)) {
      return;
    }
    
    try {
      setLoading(true);
      setNotification(null);
      
      // Create assemblies from uploaded rows
      const creationPromises = uploadedRows.map(row => {
        const assemblyData: Partial<Assembly> = {
          project_id: effectiveProjectId,
          name: row.name,
          weight: row.weight || 0,
          quantity: row.quantity,
          status: row.status,
          width: row.width,
          height: row.height,
          length: row.length,
          painting_spec: row.painting_spec
        };
        
        return assembliesApi.createAssembly(assemblyData as Assembly);
      });
      
      // Wait for all creations to complete
      await Promise.all(creationPromises);
      
      setUploadSuccess(true);
      setSuccessCount(uploadedRows.length);
      
      // Clear form after successful submission
      setExcelFile(null);
      setUploadedRows([]);
      resetFileInput();
      
      showNotification(
        'success',
        `Successfully created ${uploadedRows.length} assemblies. Redirecting...`,
        0
      );
      
      // Redirect after a brief delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${effectiveProjectId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating assemblies:', err);
      showNotification('error', 'Failed to create assemblies. Please try again.', 0);
    } finally {
      setLoading(false);
    }
  };

  // Submit manually entered data
  const submitManualData = async () => {
    if (!effectiveProjectId) {
      showNotification('error', 'Project ID is missing', 0);
      return;
    }
    
    if (!validateRows(rows)) {
      return;
    }
    
    try {
      setLoading(true);
      setNotification(null);
      
      // Create assemblies from manual rows
      const creationPromises = rows.map(row => {
        const assemblyData: Partial<Assembly> = {
          project_id: effectiveProjectId,
          name: row.name,
          weight: row.weight || 0,
          quantity: row.quantity,
          status: row.status,
          width: row.width,
          height: row.height,
          length: row.length,
          painting_spec: row.painting_spec
        };
        
        return assembliesApi.createAssembly(assemblyData as Assembly);
      });
      
      // Wait for all creations to complete
      await Promise.all(creationPromises);
      
      setUploadSuccess(true);
      setSuccessCount(rows.length);
      
      // Reset form after successful submission
      setRows([createNewRow()]);
      setGlobalValues({});
      
      showNotification(
        'success',
        `Successfully created ${rows.length} assemblies. Redirecting...`,
        0
      );
      
      // Redirect after a brief delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${effectiveProjectId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating assemblies:', err);
      showNotification('error', 'Failed to create assemblies. Please try again.', 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      {/* Project header */}
      {project && (
        <div className="flex items-center mb-6">
          <div className="flex items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {project.name}
              </h1>
              <p className="text-sm text-gray-500">Project #{project.internal_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <div className="mb-4 p-4 rounded bg-green-50 text-green-700 flex items-start">
          <CheckCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Success!</p>
            <p>{successCount} assemblies were created successfully. Redirecting...</p>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded flex items-start ${
          notification.type === 'success' ? 'bg-green-50 text-green-700' : 
          notification.type === 'error' ? 'bg-red-50 text-red-700' : 
          'bg-blue-50 text-blue-700'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          ) : notification.type === 'error' ? (
            <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          ) : (
            <InfoIcon size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          )}
          <p>{notification.message}</p>
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-1 font-medium text-sm ${
              activeTab === 'manual'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`py-2 px-1 font-medium text-sm ${
              activeTab === 'excel'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Excel Upload
          </button>
        </div>
      </div>
      
      {/* Excel Upload Tab */}
      {activeTab === 'excel' && (
        <div>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
            <FileSpreadsheet size={48} className="text-blue-500 mb-3" />
            <h3 className="text-lg font-medium mb-2">Excel Upload</h3>
            <p className="text-gray-500 text-center mb-4 max-w-md">
              Upload an Excel file with multiple assemblies. Each row will become a new assembly.
            </p>
            
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={generateExcelTemplate}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
              >
                <Download size={16} className="mr-2" />
                Download Template
              </button>
            </div>
            
            <div 
              className={`relative cursor-pointer w-full max-w-md ${
                dragActive ? "bg-blue-50 border-blue-400" : "bg-white border-gray-300"
              } border-2 border-dashed rounded-md hover:bg-gray-50 transition-colors`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <label 
                className="flex flex-col items-center justify-center p-6 text-center"
                htmlFor="file-upload"
              >
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <UploadCloud size={32} className={`mx-auto mb-2 ${dragActive ? "text-blue-600" : "text-blue-500"}`} />
                <span className="text-sm font-medium">
                  {excelFile ? (
                    <span className="text-green-600">{excelFile.name}</span>
                  ) : (
                    <span>
                      <span className="text-blue-600">Click to upload</span> or drag and drop
                    </span>
                  )}
                </span>
                <p className="text-xs text-gray-500 mt-1">XLSX or XLS files only</p>
              </label>
            </div>
          </div>
          
          {/* Preview uploaded data */}
          {uploadedRows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Preview ({uploadedRows.length} assemblies)</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Painting Spec</th>
                      {uploadedRows.some(row => row.error) && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedRows.map((row, index) => (
                      <tr key={row.id} className={row.error ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.weight}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.status}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.width || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.height || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.length || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.painting_spec || '—'}</td>
                        {uploadedRows.some(row => row.error) && (
                          <td className="px-3 py-2 whitespace-nowrap text-red-600">{row.error || ''}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Submit button */}
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setExcelFile(null);
                    setUploadedRows([]);
                    resetFileInput();
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitExcelData}
                  disabled={loading || uploadedRows.length === 0 || uploadedRows.some(row => !!row.error)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : `Create ${uploadedRows.length} Assemblies`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div>
          {/* Global settings card */}
          <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
              <Settings size={18} className="text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">Apply to all</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status *</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={globalValues.status || ""}
                    onChange={(e) => applyToAll('status', e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="Waiting">Waiting</option>
                    <option value="In Production">In Production</option>
                    <option value="Welding">Welding</option>
                    <option value="Painting">Painting</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {globalValues.status && (
                    <div className="mt-1 text-xs text-green-600">
                      Applied: {globalValues.status}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Painting Spec</label>
                  <div className="flex">
                    <input
                      type="text"
                      id="globalPaintingSpec"
                      placeholder="Enter to apply to all"
                      className="w-full p-2 border border-gray-300 rounded-l-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('globalPaintingSpec') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          applyToAll('painting_spec', input.value);
                          // Don't clear the input value
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-r-md border border-l-0 border-gray-300 hover:bg-gray-200 text-sm"
                    >
                      Apply
                    </button>
                  </div>
                  {globalValues.painting_spec && (
                    <div className="mt-1 text-xs text-green-600">
                      Applied: {globalValues.painting_spec}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assembly table card */}
          <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Assembly Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name *</th>
                    <th className="px-3 py-2 text-left font-medium">Weight (kg) *</th>
                    <th className="px-3 py-2 text-left font-medium">Qty *</th>
                    <th className="px-3 py-2 text-left font-medium">Width (mm)</th>
                    <th className="px-3 py-2 text-left font-medium">Height (mm)</th>
                    <th className="px-3 py-2 text-left font-medium">Length (mm)</th>
                    <th className="px-3 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                          className={`w-full p-1.5 border rounded-md ${row.error && !row.name ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Assembly name"
                          required
                        />
                        {row.error && !row.name && (
                          <div className="mt-1 text-xs text-red-600">
                            {row.error}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.weight === null ? '' : row.weight}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            handleRowChange(row.id, 'weight', val);
                          }}
                          className={`w-full p-1.5 border rounded-md ${
                            row.error && (row.weight === null || (row.weight !== null && row.weight <= 0)) 
                              ? 'border-red-500' 
                              : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          required
                        />
                        {row.error && (row.weight === null || (row.weight !== null && row.weight <= 0)) && (
                          <div className="mt-1 text-xs text-red-600">
                            Weight required
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                            handleRowChange(row.id, 'quantity', val);
                          }}
                          className={`w-24 p-1.5 border rounded-md ${
                            row.error && row.quantity <= 0 ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="1"
                          min="1"
                          step="1"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.width === null ? '' : row.width}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            handleRowChange(row.id, 'width', val);
                          }}
                          className="w-24 p-1.5 border border-gray-300 rounded-md"
                          placeholder="Width"
                          min="0.1"
                          step="0.1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.height === null ? '' : row.height}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            handleRowChange(row.id, 'height', val);
                          }}
                          className="w-24 p-1.5 border border-gray-300 rounded-md"
                          placeholder="Height"
                          min="0.1"
                          step="0.1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.length === null ? '' : row.length}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            handleRowChange(row.id, 'length', val);
                          }}
                          className="w-24 p-1.5 border border-gray-300 rounded-md"
                          placeholder="Length"
                          min="0.1"
                          step="0.1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => duplicateRow(row.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Add row button positioned properly */}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 mb-6"
          >
            <Plus size={16} className="mr-2" />
            Add Another Assembly
          </button>
          
          {/* Additional info card */}
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-sm flex items-start">
                <InfoIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  Need to set more properties? Use the <strong>Excel template</strong> for advanced fields like quality control.
                </span>
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/projects/${effectiveProjectId}`)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitManualData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {loading ? 'Creating...' : `Create ${rows.length} Assemblies`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleAssemblyUpload;