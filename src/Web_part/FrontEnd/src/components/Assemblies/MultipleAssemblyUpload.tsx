// src/components/Assemblies/MultipleAssemblyUpload.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  UploadCloud, 
  Download, 
  Plus, 
  Trash2, 
  AlertCircle, 
  FileSpreadsheet, 
  CheckCircle, 
  InfoIcon
} from 'lucide-react';
import { Assembly, Project, assembliesApi, projectsApi } from '../../lib/projectsApi';
import * as XLSX from 'xlsx';

interface MultipleAssemblyUploadProps {
  projectId?: string;
}

interface AssemblyRow {
    name: string;
    weight: number | string | null;
    quantity: number | string;
    width?: number | string | null;
    height?: number | string | null;
    length?: number | string | null;
    painting_spec?: string;
    status: 'Waiting' | 'In Production' | 'Welding' | 'Painting' | 'Completed';
    start_date?: string | null;
    end_date?: string | null;
    quality_control_status?: string;
    quality_control_notes?: string;
    error?: string; // For validation errors
  }

// Default empty row
const DEFAULT_ROW: AssemblyRow = {
    name: '',
    weight: '', // строка для ввода
    quantity: '1',
    status: 'Waiting',
    painting_spec: '',
    width: null,
    height: null,
    length: null,
    start_date: null,
    end_date: null,
    quality_control_status: '',
    quality_control_notes: ''
  };

const MultipleAssemblyUpload: React.FC<MultipleAssemblyUploadProps> = ({ projectId: propProjectId }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  
  // Use projectId from props, URL param, or URL query parameter
  const projectId = propProjectId || id || urlProjectId;
  
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<AssemblyRow[]>([DEFAULT_ROW]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadedRows, setUploadedRows] = useState<AssemblyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');

  // Fetch project details when component mounts
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        navigate('/dashboard/projects');
        return;
      }

      try {
        const data = await projectsApi.getProject(projectId);
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project. Please try again.');
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  // Generate Excel template
  const generateExcelTemplate = () => {
    // Create headers
    const headers = [
      'Name*', 'Weight (kg)*', 'Quantity*', 'Status*', 
      'Width (mm)', 'Height (mm)', 'Length (mm)', 
      'Painting Spec', 'Start Date (YYYY-MM-DD)', 
      'End Date (YYYY-MM-DD)', 'QC Status', 'QC Notes'
    ];
    
    // Sample data
    const sampleData = [
      [
        'Assembly 1', '450', '1', 'Waiting', 
        '1200', '800', '2400', 
        'RAL 9010', '2023-04-15', 
        '2023-05-01', 'Not Started', 'Sample notes'
      ],
      [
        'Assembly 2', '320', '2', 'Waiting',
        '900', '600', '1800',
        'RAL 7035', '', 
        '', '', ''
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
      ['5. Dates should be in YYYY-MM-DD format'],
      ['6. Dimensions (Width, Height, Length) should be in millimeters'],
      ['7. Leave fields blank if not applicable'],
      ['8. Do not modify or remove the header row'],
      ['9. Each row represents one assembly to be created'],
      [''],
      ['After filling out the template, save it and upload it back to the system.']
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
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      
      setExcelFile(file);
      processExcelFile(file);
    }
  };
  
  // Reset the file input to allow uploading the same file again
  const resetFileInput = () => {
    // This is a workaround for the browser behavior that doesn't trigger onChange
    // when selecting the same file twice
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Process Excel file
  const processExcelFile = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Get first sheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
      
      if (jsonData.length === 0) {
        setError('The uploaded file contains no data');
        setUploadedRows([]);
        setLoading(false);
        return;
      }
      
      // Process and validate rows
      const processedRows: AssemblyRow[] = jsonData.map((row: any) => {
        // Extract values, handling different possible column names from the template
        const name = row['Name*'] || row['Name'] || '';
        
        // Handle weight - don't set 0 by default, only from file
        const weightValue = row['Weight (kg)*'] || row['Weight'] || row['Weight (kg)'];
        const weight = weightValue ? parseFloat(weightValue) : null;
        
        const quantity = parseInt(row['Quantity*'] || row['Quantity'] || 1);
        const status = row['Status*'] || row['Status'] || 'Waiting';
        const width = row['Width (mm)'] ? parseFloat(row['Width (mm)']) : null;
        const height = row['Height (mm)'] ? parseFloat(row['Height (mm)']) : null;
        const length = row['Length (mm)'] ? parseFloat(row['Length (mm)']) : null;
        const painting_spec = row['Painting Spec'] || '';
        const start_date = row['Start Date (YYYY-MM-DD)'] || row['Start Date'] || null;
        const end_date = row['End Date (YYYY-MM-DD)'] || row['End Date'] || null;
        const quality_control_status = row['QC Status'] || '';
        const quality_control_notes = row['QC Notes'] || '';
        
        // Add basic validation
        let error = '';
        if (!name) error = 'Name is required';
        else if (weight === null || isNaN(weight as number)) error = 'Weight is required';
        else if (weight !== null && weight <= 0) error = 'Weight must be a positive number';
        else if (isNaN(quantity) || quantity <= 0) error = 'Quantity must be a positive integer';
        else if (!['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'].includes(status)) 
          error = 'Invalid status';
        
        return {
          name,
          weight,
          quantity,
          status: status as any,
          width,
          height,
          length,
          painting_spec,
          start_date,
          end_date,
          quality_control_status,
          quality_control_notes,
          error
        };
      });
      
      setUploadedRows(processedRows);
    } catch (err) {
      console.error('Error processing Excel file:', err);
      setError('Failed to process the Excel file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new row to manual entry
  const addRow = () => {
    setRows([...rows, { ...DEFAULT_ROW }]);
  };

  // Remove a row from manual entry
  const removeRow = (index: number) => {
    if (rows.length === 1) {
      // If it's the last row, just reset it instead of removing
      setRows([{ ...DEFAULT_ROW }]);
    } else {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  // Handle changes to manual entry rows
  const handleRowChange = (index: number, field: keyof AssemblyRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  // Validate a single row
  const validateRow = (row: AssemblyRow): string | null => {
    if (!row.name) return 'Name is required';
    if (typeof row.weight === 'string') {
      if (!row.weight) return 'Weight is required';
      const parsedWeight = parseFloat(row.weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) return 'Weight must be a positive number';
    } else if (row.weight === null) {
      return 'Weight is required';
    } else if (row.weight <= 0) {
      return 'Weight must be a positive number';
    }
    
    if (typeof row.quantity === 'string') {
      if (!row.quantity) return 'Quantity is required';
      const parsedQuantity = parseInt(row.quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) return 'Quantity must be a positive integer';
    } else if (row.quantity <= 0) {
      return 'Quantity must be a positive integer';
    }
    
    return null;
  };

  // Submit uploaded Excel data
  const submitExcelData = async () => {
    if (!projectId) {
      setError('Project ID is missing');
      return;
    }
    
    // Check if there are any validation errors
    const hasErrors = uploadedRows.some(row => row.error);
    if (hasErrors) {
      setError('Please fix validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create assemblies from uploaded rows
      const creationPromises = uploadedRows.map(row => {
        const assemblyData: Assembly = {
            project_id: projectId,
            name: row.name,
            weight: typeof row.weight === 'string' ? parseFloat(row.weight) : (row.weight ?? 0), // Используем оператор ?? для замены null на 0
            quantity: typeof row.quantity === 'string' ? parseInt(row.quantity as string) : row.quantity,
            status: row.status,
            width: row.width ? (typeof row.width === 'string' ? parseFloat(row.width) : row.width) : null,
            height: row.height ? (typeof row.height === 'string' ? parseFloat(row.height) : row.height) : null,
            length: row.length ? (typeof row.length === 'string' ? parseFloat(row.length) : row.length) : null,
            painting_spec: row.painting_spec || '',
            start_date: row.start_date || null,
            end_date: row.end_date || null,
            quality_control_status: row.quality_control_status || '',
            quality_control_notes: row.quality_control_notes || ''
          };
        
        return assembliesApi.createAssembly(assemblyData);
      });
      
      // Wait for all creations to complete
      await Promise.all(creationPromises);
      
      setUploadSuccess(true);
      setSuccessCount(uploadedRows.length);
      
      // Clear form after successful submission
      setExcelFile(null);
      setUploadedRows([]);
      resetFileInput(); // Reset the file input
      
      // Redirect after a brief delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${projectId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating assemblies:', err);
      setError('Failed to create assemblies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit manually entered data
  const submitManualData = async () => {
    if (!projectId) {
      setError('Project ID is missing');
      return;
    }
    
    // Validate all rows
    const validationErrors = rows.map(validateRow);
    const hasErrors = validationErrors.some(error => error !== null);
    
    if (hasErrors) {
      // Update rows with errors
      setRows(rows.map((row, index) => ({ ...row, error: validationErrors[index] || undefined })));
      setError('Please fix validation errors before submitting');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create assemblies from manual rows
      const creationPromises = rows.map(row => {
        const assemblyData: Assembly = {
            project_id: projectId,
            name: row.name,
            weight: typeof row.weight === 'string' ? parseFloat(row.weight) : (row.weight ?? 0), // Используем оператор ?? для замены null на 0
            quantity: typeof row.quantity === 'string' ? parseInt(row.quantity as string) : row.quantity,
            status: row.status,
            width: row.width ? (typeof row.width === 'string' ? parseFloat(row.width) : row.width) : null,
            height: row.height ? (typeof row.height === 'string' ? parseFloat(row.height) : row.height) : null,
            length: row.length ? (typeof row.length === 'string' ? parseFloat(row.length) : row.length) : null,
            painting_spec: row.painting_spec || '',
            start_date: row.start_date || null,
            end_date: row.end_date || null,
            quality_control_status: row.quality_control_status || '',
            quality_control_notes: row.quality_control_notes || ''
          };
        
        return assembliesApi.createAssembly(assemblyData);
      });
      
      // Wait for all creations to complete
      await Promise.all(creationPromises);
      
      setUploadSuccess(true);
      setSuccessCount(rows.length);
      
      // Clear form after successful submission
      setRows([{ ...DEFAULT_ROW }]);
      
      // Redirect after a brief delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${projectId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating assemblies:', err);
      setError('Failed to create assemblies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Basic UI for project header
  const renderProjectHeader = () => {
    if (!project) return null;
    
    return (
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">
          Add Multiple Assemblies to Project:
        </h1>
        <div className="mt-2 text-lg">
          <span className="font-medium">#{project.internal_number}</span> — {project.name}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      {renderProjectHeader()}
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded bg-red-50 text-red-700 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
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
            
            <label className="relative cursor-pointer bg-white p-6 border border-gray-300 rounded-md hover:bg-gray-50 w-full max-w-md text-center">
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
              <UploadCloud size={32} className="mx-auto mb-2 text-blue-500" />
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Notes</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedRows.map((row, index) => (
                      <tr key={index} className={row.error ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.weight}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.status}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.width || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.height || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.length || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.painting_spec || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.start_date || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.end_date || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.quality_control_status || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.quality_control_notes || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-600">{row.error || ''}</td>
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
                    resetFileInput(); // Reset file input for reusing the same file
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
          <div className="mb-4 flex items-center">
            <h3 className="text-lg font-medium flex-1">Manual Entry</h3>
            <div className="flex space-x-2">
              <div className="flex items-center text-sm text-gray-600">
                <InfoIcon size={16} className="mr-1" />
                <span>{rows.length} assemblies</span>
              </div>
              <button
                onClick={addRow}
                className="px-3 py-1 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200 flex items-center"
              >
                <Plus size={14} className="mr-1" />
                Add Row
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name*</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)*</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty*</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status*</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={index} className={row.error ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                        placeholder="Assembly name"
                      />
                    </td>
                    <td className="px-3 py-2">
                    <input
                        type="number"
                        value={row.weight === null ? '' : row.weight} 
                        onChange={(e) => handleRowChange(index, 'weight', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                        placeholder="Weight"
                        min="0.01"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                        placeholder="Qty"
                        min="1"
                        step="1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status}
                        onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="In Production">In Production</option>
                        <option value="Welding">Welding</option>
                        <option value="Painting">Painting</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                      {row.error && (
                        <div className="mt-1 text-xs text-red-600">
                          {row.error}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Additional fields expandable section */}
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-700 text-sm">
                <InfoIcon size={16} className="inline mr-2" />
                Need to set more properties? Use the Excel template for advanced fields like dimensions, dates, and quality control.
              </p>
            </div>
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/projects/${projectId}`)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitManualData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${rows.length} Assemblies`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleAssemblyUpload;