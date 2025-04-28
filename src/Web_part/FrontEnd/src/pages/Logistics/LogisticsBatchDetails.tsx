// src/Web_part/FrontEnd/src/pages/Logistics/LogisticsBatchDetails.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Package,
  Download,
  Eye,
  Plus,
  Truck,
  X,
  Clock,
  Box,
  Printer
} from 'lucide-react';
import { 
  LogisticsBatch, 
  BatchAssembly, 
  LogisticsDocument, 
  logisticsApi 
} from '../../lib/logisticsApi';
import { Assembly, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatWeight, formatFileSize } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import JsBarcode from 'jsbarcode';
import BarcodePrintView from '../../components/Assemblies/BarcodePrintView';

const LogisticsBatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Data state
  const [batch, setBatch] = useState<LogisticsBatch | null>(null);
  const [assemblies, setAssemblies] = useState<BatchAssembly[]>([]);
  const [documents, setDocuments] = useState<LogisticsDocument[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAssemblyModal, setShowAddAssemblyModal] = useState(false);
  
  // Add assembly modal state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Assembly[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAssemblies, setSelectedAssemblies] = useState<Assembly[]>([]);
  const [addingAssemblies, setAddingAssemblies] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Barcode print modal state
  const [barcodeData, setBarcodeData] = useState<{id: string, barcode: string} | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  
  // Load batch details
  useEffect(() => {
    const fetchBatchData = async () => {
      if (!id) {
        navigate('/dashboard/logistics');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch batch details
        const batchData = await logisticsApi.getBatch(id);
        setBatch(batchData);
        
        // Get batch barcode if exists
        const barcodeData = await logisticsApi.getBatchBarcode(id);
        setBarcodeData(barcodeData);
        
        // Fetch batch assemblies
        const assembliesData = await logisticsApi.getBatchAssemblies(id);
        setAssemblies(assembliesData);
        
        // Fetch batch documents
        const documentsData = await logisticsApi.getBatchDocuments(id);
        setDocuments(documentsData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching batch data:', err);
        setError('Failed to load batch details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchData();
  }, [id, navigate]);

  // Add this effect to render the barcode when barcodeData changes
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
            height: 50,
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

  // Add these handler functions
  const handleGenerateBarcode = async () => {
    if (!batch?.id) return;
    
    try {
      setLoading(true);
      const data = await logisticsApi.generateBatchBarcode(batch.id);
      setBarcodeData(data);
    } catch (err) {
      console.error('Error generating barcode:', err);
      setError('Failed to generate barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBarcode = () => {
    if (batch && barcodeData) {
      setShowPrintModal(true);
    }
  };

  // Calculate total weight from assemblies
  useEffect(() => {
    if (assemblies.length > 0) {
      const totalWeight = assemblies.reduce((sum, item) => {
        const assemblyWeight = item.assembly?.weight || 0;
        const quantity = item.assembly?.quantity || 1;
        return sum + (assemblyWeight * quantity);
      }, 0);
      
      // If the batch doesn't have a total weight or it's different, update it
      if (batch && (batch.total_weight === undefined || batch.total_weight !== totalWeight)) {
        logisticsApi.updateBatch(batch.id as string, { total_weight: totalWeight })
          .then(updatedBatch => {
            setBatch(updatedBatch);
          })
          .catch(err => {
            console.error('Error updating batch total weight:', err);
          });
      }
    }
  }, [assemblies, batch]);

  // Function to get file URL from Supabase storage
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Handle delete batch
  const handleDeleteBatch = async () => {
    if (!batch?.id || !window.confirm('Are you sure you want to delete this logistics batch?')) {
      return;
    }
    
    try {
      await logisticsApi.deleteBatch(batch.id);
      navigate('/dashboard/logistics');
    } catch (err) {
      console.error('Error deleting batch:', err);
      setError('Failed to delete batch. Please try again.');
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await logisticsApi.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  // Handle remove assembly from batch
  const handleRemoveAssembly = async (batchAssemblyId: string) => {
    if (!window.confirm('Are you sure you want to remove this assembly from the batch?')) {
      return;
    }
    
    try {
      await logisticsApi.removeAssemblyFromBatch(batchAssemblyId);
      setAssemblies(assemblies.filter(a => a.id !== batchAssemblyId));
    } catch (err) {
      console.error('Error removing assembly:', err);
      setError('Failed to remove assembly. Please try again.');
    }
  };

  // Handle search for assemblies - now with debounce
  const searchAssembliesDebounced = React.useCallback(
    async (term: string) => {
      if (!term || term.length < 2) {
        // Clear results if search term is too short
        setSearchResults([]);
        return;
      }
      
      try {
        setSearching(true);
        
        const projectId = batch?.project_id;
        if (!projectId) return;
        
        const allAssemblies = await assembliesApi.getAssembliesByProject(projectId);
        
        // Filter out assemblies already in this batch
        const batchAssemblyIds = assemblies.map(a => a.assembly_id);
        const availableAssemblies = allAssemblies.filter(
          a => !batchAssemblyIds.includes(a.id as string)
        );
        
        // Filter by search term (name or barcode)
        const filtered = availableAssemblies.filter(
          a => a.name.toLowerCase().includes(term.toLowerCase())
        );
        
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching assemblies:', err);
        setError('Failed to search assemblies. Please try again.');
      } finally {
        setSearching(false);
      }
    },
    [batch?.project_id, assemblies]
  );

  // Setup auto-search with debounce 
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchAssembliesDebounced(searchTerm);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchAssembliesDebounced]);

  // Manual search (as a fallback)
  const handleSearchAssemblies = () => {
    searchAssembliesDebounced(searchTerm);
  };

  // Handle barcode scan
  const handleBarcodeScan = async () => {
    if (!barcodeInput) return;
    
    try {
      setSearching(true);
      
      // Find assembly by barcode
      const assembly = await logisticsApi.findAssemblyByBarcode(barcodeInput);
      
      if (assembly) {
        // Check if assembly belongs to the same project
        if (assembly.project_id !== batch?.project_id) {
          setError('This assembly belongs to a different project and cannot be added to this batch.');
          setBarcodeInput('');
          return;
        }
        
        // Check if assembly is already in this batch
        const alreadyAdded = assemblies.some(a => a.assembly_id === assembly.id);
        if (alreadyAdded) {
          setError('This assembly is already added to this batch.');
          setBarcodeInput('');
          return;
        }
        
        // Add to selected assemblies
        setSelectedAssemblies(prev => {
          // Check if already selected
          if (prev.some(a => a.id === assembly.id)) {
            return prev;
          }
          return [...prev, assembly];
        });
      } else {
        setError('No assembly found with this barcode.');
      }
    } catch (err) {
      console.error('Error scanning barcode:', err);
      setError('Failed to scan barcode. Please try again.');
    } finally {
      setSearching(false);
      setBarcodeInput('');
    }
  };

  // Handle selection of an assembly
  const toggleAssemblySelection = (assembly: Assembly) => {
    setSelectedAssemblies(prev => {
      const isSelected = prev.some(a => a.id === assembly.id);
      if (isSelected) {
        return prev.filter(a => a.id !== assembly.id);
      } else {
        return [...prev, assembly];
      }
    });
  };

  // Add selected assemblies to batch
  const addSelectedAssemblies = async () => {
    if (selectedAssemblies.length === 0 || !batch?.id) return;
    
    try {
      setAddingAssemblies(true);
      
      // Add each assembly to the batch
      const addPromises = selectedAssemblies.map(assembly => 
        logisticsApi.addAssemblyToBatch({
          batch_id: batch.id as string,
          assembly_id: assembly.id as string,
          assembly_status: 'Completed' // When added to a shipment, assembly is marked as completed
        })
      );
      
      const newBatchAssemblies = await Promise.all(addPromises);
      
      // Update assemblies status in the main table
      const updatePromises = selectedAssemblies.map(assembly =>
        assembliesApi.updateAssembly(assembly.id as string, { status: 'Completed' })
      );
      
      await Promise.all(updatePromises);
      
      // Fetch full assembly data for each new batch assembly
      const fetchedBatchAssemblies = await logisticsApi.getBatchAssemblies(batch.id);
      
      // Update assemblies list
      setAssemblies(fetchedBatchAssemblies);
      
      // Clear selection and close modal
      setSelectedAssemblies([]);
      setShowAddAssemblyModal(false);
      setSearchResults([]);
      setSearchTerm('');
      
    } catch (err) {
      console.error('Error adding assemblies to batch:', err);
      setError('Failed to add assemblies to batch. Please try again.');
    } finally {
      setAddingAssemblies(false);
    }
  };

  // Focus search input when modal opens
  useEffect(() => {
    if (showAddAssemblyModal && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showAddAssemblyModal]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading batch details...</p>
      </div>
    );
  }

  // Error state
  if (error && !batch) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Batch not found'}</p>
          <button
            onClick={() => navigate('/dashboard/logistics')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <span className="text-white">Return to Logistics</span>
          </button>
        </div>
      </div>
    );
  }

  if (!batch) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md h-[calc(100vh-160px)] flex flex-col overflow-hidden">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard/logistics')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back to batches"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Truck size={20} className="mr-2 text-blue-600" />
                {batch.batch_number}
              </h2>
              <span
                className={`ml-3 px-2.5 py-1 rounded text-xs font-medium ${
                  batch.status === 'Pending'
                    ? 'bg-blue-100 text-blue-800'
                    : batch.status === 'In Transit'
                    ? 'bg-yellow-100 text-yellow-800'
                    : batch.status === 'Delivered'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {batch.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {batch.project?.internal_number && batch.client?.company_name 
                ? `${batch.project.internal_number} - ${batch.client.company_name}`
                : 'No project or client information'}
            </p>
          </div>
        </div>
        
        <div className="flex">
          <button
            onClick={() => navigate(`/dashboard/logistics/${batch.id}/edit`)}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Edit Batch"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={handleDeleteBatch}
            className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete Batch"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Main content - scrollable */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left column - Batch details */}
        <div className="md:w-1/3 p-4 border-r border-gray-200 overflow-y-auto overflow-x-hidden">
          <div className="space-y-6 max-w-full">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3">Shipment Details</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex items-start mb-3">
                  <Truck className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Shipping Company</p>
                    <p className="font-medium text-gray-800">{batch.shipping_company?.name || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start mb-3">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="font-medium text-gray-800 whitespace-pre-wrap">{batch.delivery_address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Total Weight</p>
                    <p className="font-medium text-gray-800">
                      {batch.total_weight ? formatWeight(batch.total_weight) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3">Timeline</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                {batch.shipment_date && (
                  <div className="flex items-start mb-3">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Shipment Date</p>
                      <p className="font-medium text-gray-800">{formatDate(batch.shipment_date)}</p>
                    </div>
                  </div>
                )}
                
                {batch.estimated_arrival && (
                  <div className="flex items-start mb-3">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Estimated Arrival</p>
                      <p className="font-medium text-gray-800">{formatDate(batch.estimated_arrival)}</p>
                    </div>
                  </div>
                )}
                
                {batch.actual_arrival && (
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Actual Arrival</p>
                      <p className="font-medium text-gray-800">{formatDate(batch.actual_arrival)}</p>
                    </div>
                  </div>
                )}
                
                {!batch.shipment_date && !batch.estimated_arrival && !batch.actual_arrival && (
                  <p className="text-gray-500 italic">No timeline information available</p>
                )}
              </div>
            </div>
            
            {batch.notes && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3">Notes</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-gray-800 whitespace-pre-line text-sm">{batch.notes}</p>
                </div>
              </div>
            )}
            
            {/* Barcode Section */}
            <div>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3">Batch Barcode</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                {barcodeData ? (
                  <div className="flex flex-col items-center">
                    <div id="barcode-container" ref={barcodeContainerRef} className="mb-2"></div>
                    <div className="text-xs text-gray-500">{barcodeData.barcode}</div>
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
                    <button
                      onClick={handleGenerateBarcode}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Generate Barcode
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3">Shipping Documents</h3>
              
              {documents.length === 0 ? (
                <div className="bg-gray-50 p-4 text-center rounded border border-gray-200">
                  <p className="text-gray-500 mb-2">No documents uploaded</p>
                  <Link
                    to={`/dashboard/logistics/${batch.id}/edit`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Upload documents
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div 
                      key={doc.id} 
                      className="bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center"
                    >
                      <div className="mr-2 overflow-hidden">
                        <p className="font-medium text-gray-800 truncate">{doc.file_name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <a
                          href={getFileUrl(doc.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <Eye size={16} />
                        </a>
                        <a
                          href={getFileUrl(doc.file_path)}
                          download={doc.file_name}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id as string)}
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
          </div>
        </div>
        
        {/* Right column - Assemblies */}
        <div className="md:w-2/3 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <Box size={20} className="mr-2 text-blue-600" />
              Assemblies in this Batch
            </h3>
            <button
              onClick={() => setShowAddAssemblyModal(true)}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} className="mr-1 text-white" />
              Add Assemblies
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {assemblies.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-md">
                <p className="text-gray-500 mb-4">No assemblies in this batch yet.</p>
                <button
                  onClick={() => setShowAddAssemblyModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} className="mr-2 text-white" />
                  <span className="text-white">Add First Assembly</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {assemblies.map(batchAssembly => (
                  <div 
                    key={batchAssembly.id} 
                    className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-lg">{batchAssembly.assembly?.name}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          <p>Weight: {formatWeight(batchAssembly.assembly?.weight || 0)}</p>
                          <p>Quantity: {batchAssembly.assembly?.quantity}</p>
                        </div>
                        
                        {/* Display dimensions if available */}
                        {(batchAssembly.assembly?.width || batchAssembly.assembly?.height || batchAssembly.assembly?.length) && (
                          <div className="mt-2 text-sm">
                            <p className="text-gray-500">Dimensions (mm):</p>
                            <div className="flex space-x-4">
                              {batchAssembly.assembly?.width && (
                                <span>W: {batchAssembly.assembly.width}</span>
                              )}
                              {batchAssembly.assembly?.height && (
                                <span>H: {batchAssembly.assembly.height}</span>
                              )}
                              {batchAssembly.assembly?.length && (
                                <span>L: {batchAssembly.assembly.length}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            batchAssembly.assembly_status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {batchAssembly.assembly_status}
                        </span>
                        
                        <button
                          onClick={() => handleRemoveAssembly(batchAssembly.id as string)}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Created/Updated timestamps */}
      <div className="px-6 py-2 text-xs text-gray-500 border-t border-gray-200">
        <div className="flex items-center">
          <Clock size={14} className="mr-1" />
          {batch.created_at && (
            <span>
              Created: {formatDate(batch.created_at)}
            </span>
          )}
          {batch.updated_at && batch.updated_at !== batch.created_at && (
            <span className="ml-2">
              Updated: {formatDate(batch.updated_at)}
            </span>
          )}
        </div>
      </div>
      
      {/* Add Assembly Modal */}
      {showAddAssemblyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">Add Assemblies to Batch</h3>
              <button 
                onClick={() => {
                  setShowAddAssemblyModal(false);
                  setSelectedAssemblies([]);
                  setSearchResults([]);
                  setSearchTerm('');
                  setBarcodeInput('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {/* Barcode Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scan or Enter Barcode
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeScan();
                      }
                    }}
                    placeholder="Scan barcode..."
                    className="flex-1 p-2 border border-gray-300 rounded-l-md"
                  />
                  <button
                    onClick={handleBarcodeScan}
                    disabled={searching || !barcodeInput}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Find'}
                  </button>
                </div>
              </div>
              
              {/* Or Text */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-sm text-gray-500">Or search by name</span>
                </div>
              </div>
              
              {/* Search Input - Now with auto-search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchAssemblies();
                      }
                    }}
                    placeholder="Search assemblies..."
                    className="w-full p-2 border border-gray-300 rounded-md pr-12"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {searchTerm.length < 2 
                    ? "Type at least 2 characters to search" 
                    : `Searching for assemblies from project: ${batch.project?.name || batch.project?.internal_number || 'Unknown'}`}
                </p>
              </div>
              
              {/* Search Results */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Available Assemblies</h4>
                  {searchResults.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {searchResults.length} assemblies found
                    </p>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm.length > 0 
                        ? 'No matching assemblies found'
                        : 'Use the search or scan a barcode to find assemblies'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {searchResults.map(assembly => (
                        <div 
                          key={assembly.id} 
                          className={`p-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer ${
                            selectedAssemblies.some(a => a.id === assembly.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggleAssemblySelection(assembly)}
                        >
                          <div>
                            <p className="font-medium">{assembly.name}</p>
                            <div className="text-sm text-gray-500">
                              <span>{formatWeight(assembly.weight)}</span>
                              <span className="mx-2">•</span>
                              <span>Qty: {assembly.quantity}</span>
                              <span className="mx-2">•</span>
                              <span>Status: {assembly.status}</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedAssemblies.some(a => a.id === assembly.id)}
                            onChange={() => {}} // Handled by div click
                            className="h-5 w-5 text-blue-600 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selected Assemblies */}
              {selectedAssemblies.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Selected Assemblies ({selectedAssemblies.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssemblies.map(assembly => (
                      <div 
                        key={assembly.id}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center"
                      >
                        <span className="mr-1">{assembly.name}</span>
                        <button
                          onClick={() => toggleAssemblySelection(assembly)}
                          className="text-blue-800 hover:text-blue-900"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-between">
              <button
                onClick={() => {
                  setShowAddAssemblyModal(false);
                  setSelectedAssemblies([]);
                  setSearchResults([]);
                  setSearchTerm('');
                  setBarcodeInput('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={addSelectedAssemblies}
                disabled={selectedAssemblies.length === 0 || addingAssemblies}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addingAssemblies 
                  ? 'Adding...' 
                  : `Add ${selectedAssemblies.length} ${selectedAssemblies.length === 1 ? 'Assembly' : 'Assemblies'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {showPrintModal && batch && barcodeData && (
        <BarcodePrintView 
          barcodes={[{
            id: batch.id || '',
            barcode: barcodeData.barcode,
            assemblyName: batch.batch_number, // Using batch number as the name
            projectName: batch.project?.name || batch.client?.company_name || 'Logistics Batch'
          }]}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

export default LogisticsBatchDetails;