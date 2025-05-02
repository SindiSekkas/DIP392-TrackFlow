import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Package,
  FileText,
  Download,
  Eye,
  Clock,
  Printer,
  InfoIcon, 
  AlertCircle,
  ImageIcon,
  Camera
} from 'lucide-react';
import { AssemblyWithProject, AssemblyDrawing, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatWeight, formatFileSize } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import JsBarcode from 'jsbarcode';
import BarcodePrintView from '../../components/Assemblies/BarcodePrintView';

const AssemblyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [assembly, setAssembly] = useState<AssemblyWithProject | null>(null);
  const [drawing, setDrawing] = useState<AssemblyDrawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barcodeData, setBarcodeData] = useState<{id: string, barcode: string} | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showParentWarning, setShowParentWarning] = useState(false);
  const [isEditingQcNote, setIsEditingQcNote] = useState(false);
  const [editQcNote, setEditQcNote] = useState('');
  const [editQcStatus, setEditQcStatus] = useState('');
  const [savingQcNote, setSavingQcNote] = useState(false);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  
  // New refs for measuring content height
  const specificationsRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<string | null>(null);

  // Handle back navigation
  const handleBackNavigation = () => {
    const fromSource = location.state?.from;
    
    if (assembly?.project_id) {
      // If we came from a project page, return to that project
      if (fromSource === 'project') {
        navigate(`/dashboard/projects/${assembly.project_id}`);
      } else {
        // If we came from assemblies page, save the current project ID
        // in sessionStorage before navigating back to assemblies
        sessionStorage.setItem('selectedProjectId', assembly.project_id);
        navigate('/dashboard/assemblies');
      }
    } else {
      // If there's no project ID, just go back to assemblies
      navigate('/dashboard/assemblies');
    }
  };

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
        
        // Fetch barcode if exists
        const barcodeData = await assembliesApi.getAssemblyBarcode(id);
        setBarcodeData(barcodeData);
        
        // Initialize QC note state with assembly values
        if (assemblyData.quality_control_notes) {
          setEditQcNote(assemblyData.quality_control_notes);
        }
        if (assemblyData.quality_control_status) {
          setEditQcStatus(assemblyData.quality_control_status);
        }
        
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
  
  // New useEffect to adjust container heights
  useEffect(() => {
    // Wait a bit for content to render before measuring
    const timer = setTimeout(() => {
      if (specificationsRef.current && drawingRef.current && !loading) {
        // Get the scroll height (total content height) of both containers
        const specsHeight = specificationsRef.current.scrollHeight;
        const drawingHeight = drawingRef.current.scrollHeight;
        
        // Use the larger of the two heights, with a minimum of 600px
        const maxHeight = Math.max(specsHeight, drawingHeight, 600);
        
        // Set the container height
        setContainerHeight(`${maxHeight}px`);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [assembly, drawing, loading]);

  // Render barcode when barcodeData changes
  useEffect(() => {
    if (barcodeData && barcodeContainerRef.current) {
      try {
        // Clear previous barcode
        barcodeContainerRef.current.innerHTML = '<svg class="barcode"></svg>';
        const barcodeSvg = barcodeContainerRef.current.querySelector('.barcode');
        
        if (barcodeSvg) {
          JsBarcode(barcodeSvg, barcodeData.barcode, {
            format: "CODE128",
            width: 2,
            height: 35, // Reduced from 50 to 35 to make the barcode shorter
            displayValue: true,
            fontSize: 14,
            margin: 10
          });
        }
      } catch (err) {
        console.error('Error rendering barcode:', err);
      }
    }
  }, [barcodeData]);

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

  // Generate barcode
  const handleGenerateBarcode = async () => {
    if (!assembly?.id) return;
    
    // If this is a parent assembly, show a warning first
    if (assembly.is_parent && !showParentWarning) {
      setShowParentWarning(true);
      return;
    }
    
    // Reset warning state if proceeding
    setShowParentWarning(false);
    
    try {
      setLoading(true);
      const data = await assembliesApi.generateAssemblyBarcode(assembly.id);
      setBarcodeData(data);
    } catch (err) {
      console.error('Error generating barcode:', err);
      setError('Failed to generate barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Print barcode
  const handlePrintBarcode = () => {
    if (assembly && barcodeData) {
      setShowPrintModal(true);
    }
  };

  // Add function to save QC notes
  const handleSaveQcNote = async () => {
    if (!assembly?.id) return;
    
    try {
      setSavingQcNote(true);
      
      const updatedData = {
        quality_control_notes: editQcNote,
        quality_control_status: editQcStatus
      };
      
      await assembliesApi.updateAssembly(assembly.id, updatedData);
      
      // Update local state
      setAssembly({
        ...assembly,
        quality_control_notes: editQcNote,
        quality_control_status: editQcStatus
      });
      
      setIsEditingQcNote(false);
    } catch (err) {
      console.error('Failed to update QC notes:', err);
      alert('Failed to save quality control notes. Please try again.');
    } finally {
      setSavingQcNote(false);
    }
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
    <div className="bg-white p-6 rounded-lg shadow-md h-[calc(100vh-120px)] overflow-y-auto">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={handleBackNavigation}
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
        {/* Left column - Assembly Details */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
            <Package size={18} className="mr-2 text-gray-500" />
            Assembly Specifications
          </h3>
          
          <div 
            ref={specificationsRef}
            className="bg-gray-50 rounded border border-gray-200 p-4"
            style={{ height: containerHeight || 'auto' }}
          > 
            {assembly.project && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Project</p>
                <Link 
                  to={`/dashboard/projects/${assembly.project_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {assembly.project.name} (#{assembly.project.internal_number})
                </Link>
              </div>
            )}
            
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Details</p>
              <p className="text-gray-700 mb-1">Weight: {formatWeight(assembly.weight)}</p>
              <p className="text-gray-700 mb-1">Quantity: {assembly.quantity}</p>
              {assembly.painting_spec && (
                <p className="text-gray-700">Painting: {assembly.painting_spec}</p>
              )}
              
              {(assembly.width || assembly.height || assembly.length) && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Dimensions (mm)</p>
                  <div className="grid grid-cols-3 gap-x-4 text-gray-700">
                    {assembly.width && (
                      <div>
                        <span className="text-xs text-gray-500">Width</span>
                        <p>{assembly.width.toLocaleString()}</p>
                      </div>
                    )}
                    {assembly.height && (
                      <div>
                        <span className="text-xs text-gray-500">Height</span>
                        <p>{assembly.height.toLocaleString()}</p>
                      </div>
                    )}
                    {assembly.length && (
                      <div>
                        <span className="text-xs text-gray-500">Length</span>
                        <p>{assembly.length.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Timeline</p>
              {assembly.start_date && (
                <p className="text-gray-700 mb-1">Start: {formatDate(assembly.start_date)}</p>
              )}
              {assembly.end_date && (
                <p className="text-gray-700">End: {formatDate(assembly.end_date)}</p>
              )}
              {!assembly.start_date && !assembly.end_date && (
                <p className="text-gray-400 italic">No timeline information available</p>
              )}
            </div>
            
            {/* Barcode Section within the layout */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Assembly Barcode</p>
              <div className="bg-white rounded p-2">
                {barcodeData ? (
                  <div className="flex flex-col items-center">
                    <div id="barcode-container" ref={barcodeContainerRef} className="mb-2"></div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={handlePrintBarcode}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Printer size={14} className="inline mr-1" /> Print
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-500 mb-2">No barcode generated yet</p>
                    
                    {/* Show warning if it's a parent assembly */}
                    {assembly.is_parent && showParentWarning ? (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                        <p className="mb-2">
                          <AlertCircle size={16} className="inline-block mr-1" />
                          Parent assemblies typically don't need barcodes since each child has its own.
                        </p>
                        <p className="text-sm mb-2">Do you still want to create a barcode?</p>
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => setShowParentWarning(false)}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGenerateBarcode}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Create Anyway
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateBarcode}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Generate Barcode
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Removed timestamp information from here */}
          </div>
        </div>
        
        {/* Right column - Drawing */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
            <FileText size={18} className="mr-2 text-gray-500" />
            Assembly Drawing
          </h3>
          
          {drawing ? (
            <div 
              ref={drawingRef}
              className="bg-gray-50 rounded border border-gray-200 p-4 mb-6"
              style={{ height: containerHeight || 'auto' }}
            >
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
                    className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded"
                    title="View"
                  >
                    <Eye size={20} className="text-white" />
                  </a>
                  <a
                    href={getFileUrl(drawing.file_path)}
                    download={drawing.file_name}
                    className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded"
                    title="Download"
                  >
                    <Download size={20} className="text-white" />
                  </a>
                </div>
              </div>
              
              {/* PDF Viewer with dynamic height based on container */}
              <div className="mt-3 border border-gray-300 rounded overflow-hidden">
                {/* Indicator for inherited drawings */}
                {drawing?.inherited_from_parent && (
                  <div className="bg-blue-50 text-blue-800 px-3 py-1 text-sm flex items-center">
                    <InfoIcon size={16} className="mr-2" />
                    <span>Drawing inherited from parent assembly</span>
                    {drawing.parent_id && (
                      <Link 
                        to={`/dashboard/assemblies/${drawing.parent_id}`}
                        className="ml-2 underline hover:text-blue-900"
                      >
                        View parent
                      </Link>
                    )}
                  </div>
                )}
                <iframe
                  src={`${getFileUrl(drawing.file_path)}#toolbar=0`}
                  width="100%"
                  height="520"
                  title="Assembly Drawing"
                  className="block"
                ></iframe>
              </div>
            </div>
          ) : (
            <div 
              ref={drawingRef}
              className="bg-gray-50 p-6 rounded-md text-center border border-gray-200 mb-6 flex flex-col justify-center items-center"
              style={{ height: containerHeight || 'auto' }}
            >
              <p className="text-gray-500 mb-4">No drawing available for this assembly.</p>
              <Link
                to={`/dashboard/assemblies/${assembly.id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <span className="text-white">Upload Drawing</span>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Quality Control Section - Redesigned */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Camera size={18} className="mr-2 text-gray-500" />
            Quality Control
          </h3>
          <Link
            to={`/dashboard/assemblies/${assembly.id}/qc-images`}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md flex items-center"
          >
            <ImageIcon size={14} className="mr-1" />
            Manage QC
          </Link>
        </div>
        
        <div className="p-4">
          {/* QC Status Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700">Status</p>
              {!isEditingQcNote && (
                <button
                  onClick={() => setIsEditingQcNote(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {assembly.quality_control_notes || assembly.quality_control_status ? 'Edit' : 'Add Details'}
                </button>
              )}
            </div>
            
            {isEditingQcNote ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    QC Status
                  </label>
                  <select
                    value={editQcStatus}
                    onChange={(e) => setEditQcStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Not specified</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Conditional Pass">Conditional Pass</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    QC Notes
                  </label>
                  <textarea
                    value={editQcNote}
                    onChange={(e) => setEditQcNote(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Enter quality control notes..."
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setIsEditingQcNote(false);
                      setEditQcNote(assembly.quality_control_notes || '');
                      setEditQcStatus(assembly.quality_control_status || '');
                    }}
                    className="px-3 py-1 border border-gray-300 text-xs text-gray-700 rounded-md hover:bg-gray-50"
                    disabled={savingQcNote}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveQcNote}
                    className="px-3 py-1 bg-blue-600 text-xs text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={savingQcNote}
                  >
                    {savingQcNote ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              assembly.quality_control_status ? (
                <div className="flex items-center">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    assembly.quality_control_status === 'Passed'
                      ? 'bg-green-100 text-green-800'
                      : assembly.quality_control_status === 'Failed'
                      ? 'bg-red-100 text-red-800'
                      : assembly.quality_control_status === 'Not Started'
                      ? 'bg-gray-100 text-gray-800'
                      : assembly.quality_control_status === 'In Progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {assembly.quality_control_status}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Not set
                </div>
              )
            )}
          </div>
          
          {/* QC Notes Section */}
          {!isEditingQcNote && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
              {assembly.quality_control_notes ? (
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-line">
                  {assembly.quality_control_notes}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  None
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Timestamp Information - Moved to bottom of main container */}
      <div className="text-xs text-gray-500 mt-2 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
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
      
      {/* Barcode Print Modal */}
      {showPrintModal && assembly && barcodeData && (
        <BarcodePrintView 
          barcodes={[{
            id: assembly.id || '',
            barcode: barcodeData.barcode,
            assemblyName: assembly.name,
            projectName: assembly.project?.name || ''
          }]}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

export default AssemblyDetailsPage;