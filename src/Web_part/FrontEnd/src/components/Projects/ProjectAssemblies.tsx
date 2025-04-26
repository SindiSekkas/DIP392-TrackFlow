// Improved ProjectAssemblies.tsx with smooth group expansion
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Edit, Trash2, Settings, Barcode, ArrowUp, ArrowDown, ChevronDown, Package } from 'lucide-react';
import { Assembly, assembliesApi, projectsApi } from '../../lib/projectsApi';
import { formatWeight, formatDate, formatDimension, naturalSort } from '../../utils/formatters';
import { useColumnSettings } from '../../contexts/ColumnSettingsContext';
import ColumnSettings from '../../components/ColumnSettings';
import { getDefaultAssemblyColumns } from '../../lib/preferencesApi';
import BarcodePrintView from '../../components/Assemblies/BarcodePrintView';
import { supabase } from '../../lib/supabase';

// Define types for sorting
type SortColumn = 'name' | 'weight' | 'quantity' | 'status' | 'width' | 'height' | 'length' 
  | 'painting_spec' | 'start_date' | 'end_date' | 'quality_control_status';
type SortDirection = 'asc' | 'desc';

interface ProjectAssembliesProps {
  projectId: string;
}

const ProjectAssemblies: React.FC<ProjectAssembliesProps> = ({ projectId }) => {
  // Main state for assemblies and child assemblies
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [expandedAssemblies, setExpandedAssemblies] = useState<{[key: string]: boolean}>({});
  const [childAssemblies, setChildAssemblies] = useState<{[key: string]: Assembly[]}>({});
  // Track which assemblies are currently loading children to show loading indicators only for them
  const [loadingChildrenFor, setLoadingChildrenFor] = useState<{[key: string]: boolean}>({});
  
  const [projectName, setProjectName] = useState<string>('Project');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Add state for barcode printing
  const [showPrintView, setShowPrintView] = useState(false);
  const [selectedBarcodes, setSelectedBarcodes] = useState<any[]>([]);
  
  // Add sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Get column preferences from context
  const { assemblyColumns, saveAssemblyColumns } = useColumnSettings();
  
  // Get visible columns
  const visibleColumns = assemblyColumns.filter(col => col.visible);

  // Save column preferences
  const saveColumnPreferences = async (columns: any) => {
    try {
      await saveAssemblyColumns(columns);
      setShowColumnSettings(false);
    } catch (error) {
      console.error('Error saving column preferences:', error);
    }
  };

  // Toggle expansion of an assembly to show its children
  const toggleExpandAssembly = async (assemblyId: string) => {
    // If already expanded, just collapse
    if (expandedAssemblies[assemblyId]) {
      setExpandedAssemblies(prev => ({
        ...prev,
        [assemblyId]: false
      }));
      return;
    }
    
    // If we already have the children loaded, just expand without fetching
    if (childAssemblies[assemblyId] && childAssemblies[assemblyId].length > 0) {
      setExpandedAssemblies(prev => ({
        ...prev,
        [assemblyId]: true
      }));
      return;
    }
    
    // Otherwise, we need to fetch the children
    try {
      // Set loading state only for this assembly
      setLoadingChildrenFor(prev => ({
        ...prev,
        [assemblyId]: true
      }));
      
      // Mark as expanded immediately to start the animation
      setExpandedAssemblies(prev => ({
        ...prev,
        [assemblyId]: true
      }));
      
      // Load child assemblies using supabase
      const { data, error } = await supabase
        .from('assemblies')
        .select('*')
        .eq('parent_id', assemblyId)
        .order('child_number', { ascending: true });
      
      if (error) throw error;
      
      // Update the child assemblies in state
      setChildAssemblies(prev => ({
        ...prev,
        [assemblyId]: data as Assembly[]
      }));
      
    } catch (err) {
      console.error('Error fetching child assemblies:', err);
      setError('Failed to load child assemblies');
      // If error, collapse the assembly again
      setExpandedAssemblies(prev => ({
        ...prev,
        [assemblyId]: false
      }));
    } finally {
      // Clear loading state for this assembly
      setLoadingChildrenFor(prev => ({
        ...prev,
        [assemblyId]: false
      }));
    }
  };

  // Fetch project assemblies
  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        setLoading(true);
        
        // Fetch top-level assemblies (no parent_id) for this project
        const { data, error } = await supabase
          .from('assemblies')
          .select('*')
          .eq('project_id', projectId)
          .is('parent_id', null)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setAssemblies(data as Assembly[]);
        
        // Also fetch project name for barcodes
        const projectData = await projectsApi.getProject(projectId);
        if (projectData && projectData.name) {
          setProjectName(projectData.name);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching assemblies:', err);
        setError('Failed to load assemblies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchAssemblies();
    }
  }, [projectId]);

  // Sort handling function
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by this column in ascending order
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted assemblies
  const getSortedAssemblies = (): Assembly[] => {
    return [...assemblies].sort((a, b) => {
      let valueA: any = a[sortColumn];
      let valueB: any = b[sortColumn];
      
      // Special handling for dates
      if (sortColumn === 'start_date' || sortColumn === 'end_date') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // Special handling for numeric values that might be null
      if ((sortColumn === 'width' || sortColumn === 'height' || sortColumn === 'length') && 
          (valueA === null || valueB === null)) {
        if (valueA === null && valueB === null) return 0;
        if (valueA === null) return sortDirection === 'asc' ? 1 : -1;
        if (valueB === null) return sortDirection === 'asc' ? -1 : 1;
      }
      
      // Case insensitive and natural sorting for strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? naturalSort(valueA, valueB) 
          : naturalSort(valueB, valueA);
      }
      
      // For numbers and other types
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Delete an assembly
  const handleDeleteAssembly = async (assemblyId: string, isParent: boolean = false) => {
    const message = isParent 
      ? 'Are you sure you want to delete this assembly and all its child assemblies?'
      : 'Are you sure you want to delete this assembly?';
      
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      await assembliesApi.deleteAssembly(assemblyId);
      
      // If deleting a parent, also remove its children from state
      if (isParent) {
        // Remove from expandedAssemblies and childAssemblies states
        const newExpanded = { ...expandedAssemblies };
        delete newExpanded[assemblyId];
        setExpandedAssemblies(newExpanded);
        
        const newChildAssemblies = { ...childAssemblies };
        delete newChildAssemblies[assemblyId];
        setChildAssemblies(newChildAssemblies);
      }
      
      // Remove from main assemblies list if it's a top-level assembly
      setAssemblies(assemblies.filter(assembly => assembly.id !== assemblyId));
      
      // Check if it's a child assembly and remove from the appropriate parent's children
      Object.keys(childAssemblies).forEach(parentId => {
        if (childAssemblies[parentId].some(child => child.id === assemblyId)) {
          setChildAssemblies({
            ...childAssemblies,
            [parentId]: childAssemblies[parentId].filter(child => child.id !== assemblyId)
          });
        }
      });
      
    } catch (err) {
      console.error('Error deleting assembly:', err);
      setError('Failed to delete assembly. Please try again.');
    }
  };

  // Function to handle printing a single barcode
  const handlePrintSingleBarcode = async (assemblyId: string, assemblyName: string) => {
    try {
      setLoading(true);
      
      // Get the barcode for this assembly
      const barcode = await assembliesApi.getAssemblyBarcode(assemblyId);
      
      if (barcode) {
        // Prepare barcode data for print view
        const barcodeData = [{
          id: barcode.id,
          barcode: barcode.barcode,
          assemblyName: assemblyName,
          projectName: projectName
        }];
        
        // Show print view
        setSelectedBarcodes(barcodeData);
        setShowPrintView(true);
      } else {
        setError("No barcode found for this assembly");
      }
    } catch (err: any) {
      console.error('Error preparing barcode for printing:', err);
      setError(err.message || 'Failed to get barcode');
    } finally {
      setLoading(false);
    }
  };

  // Handle printing all barcodes for assemblies
  const handlePrintAllBarcodes = async () => {
    // Get all child assemblies that have barcodes (parent assemblies don't have barcodes)
    let assembliesList: Assembly[] = [];
    
    // First get all expanded assemblies' children
    Object.keys(childAssemblies).forEach(parentId => {
      if (childAssemblies[parentId] && childAssemblies[parentId].length > 0) {
        assembliesList = [...assembliesList, ...childAssemblies[parentId]];
      }
    });
    
    // Also add non-parent assemblies from the main list
    assembliesList = [
      ...assembliesList,
      ...assemblies.filter(a => !a.is_parent)
    ];
    
    if (assembliesList.length === 0) {
      setError("No assemblies with barcodes found");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare to collect all barcode data
      const allBarcodeData: any[] = [];
      
      // Process assemblies in batches to avoid too many concurrent requests
      const batchSize = 10;
      const batches = Math.ceil(assembliesList.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = assembliesList.slice(i * batchSize, (i + 1) * batchSize);
        
        // Process each assembly in the batch to get its barcode
        const batchPromises = batch.map(async (assembly) => {
          try {
            // Get existing barcode or generate a new one
            let barcode = await assembliesApi.getAssemblyBarcode(assembly.id as string);
            
            if (!barcode) {
              // Generate barcode if it doesn't exist
              barcode = await assembliesApi.generateAssemblyBarcode(assembly.id as string);
            }
            
            return {
              id: barcode.id,
              barcode: barcode.barcode,
              assemblyName: assembly.name,
              projectName: projectName
            };
          } catch (err) {
            console.error(`Error getting barcode for assembly ${assembly.id}:`, err);
            return null;
          }
        });
        
        // Wait for all assemblies in this batch to be processed
        const batchResults = await Promise.all(batchPromises);
        
        // Add valid results to the collection
        allBarcodeData.push(...batchResults.filter(Boolean));
      }
      
      if (allBarcodeData.length === 0) {
        setError("No barcodes could be generated");
        return;
      }
      
      // Set barcodes and show print view
      setSelectedBarcodes(allBarcodeData);
      setShowPrintView(true);
      
    } catch (err: any) {
      console.error('Error preparing barcodes for printing:', err);
      setError(err.message || 'Failed to generate barcodes');
    } finally {
      setLoading(false);
    }
  };

  // Render column header with sort indicators
  const renderColumnHeader = (column: any) => {
    const id = column.id as SortColumn;
    return (
      <th 
        key={id}
        className="text-left p-3 cursor-pointer hover:bg-gray-200"
        onClick={() => handleSort(id)}
      >
        <div className="flex items-center justify-between">
          <span className="select-none">{column.label}</span>
          <span className="w-4 inline-block">
            {sortColumn === id && (
              sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Render a child assembly row
  const renderChildAssemblyRow = (assembly: Assembly) => {
    return (
      <tr key={assembly.id} className="hover:bg-gray-50 bg-blue-50">
        {/* Render cells for all visible columns */}
        {visibleColumns.map(column => {
          switch (column.id) {
            case 'name':
              return (
                <td key={column.id} className="p-3 pl-10">
                  <div className="flex items-center">
                    <Package size={14} className="text-blue-400 mr-2" />
                    {assembly.name}
                  </div>
                </td>
              );
            case 'weight':
              return <td key={column.id} className="p-3">{formatWeight(assembly.weight)}</td>;
            case 'quantity':
              return <td key={column.id} className="p-3">1</td>; // Child assemblies always have quantity 1
            case 'status':
              return (
                <td key={column.id} className="p-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                </td>
              );
            case 'width':
              return <td key={column.id} className="p-3">{assembly.width ? formatDimension(assembly.width) : '—'}</td>;
            case 'height':
              return <td key={column.id} className="p-3">{assembly.height ? formatDimension(assembly.height) : '—'}</td>;
            case 'length':
              return <td key={column.id} className="p-3">{assembly.length ? formatDimension(assembly.length) : '—'}</td>;
            case 'painting_spec':
              return <td key={column.id} className="p-3">{assembly.painting_spec || '—'}</td>;
            case 'start_date':
              return <td key={column.id} className="p-3">{assembly.start_date ? formatDate(assembly.start_date as string) : '—'}</td>;
            case 'end_date':
              return <td key={column.id} className="p-3">{assembly.end_date ? formatDate(assembly.end_date as string) : '—'}</td>;
            case 'quality_control_status':
              return <td key={column.id} className="p-3">{assembly.quality_control_status || '—'}</td>;
            default:
              return <td key={column.id} className="p-3">—</td>;
          }
        })}
        
        {/* Actions for child assemblies - show barcode button */}
        <td className="p-3">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => navigate(`/dashboard/assemblies/${assembly.id}`, { state: { from: 'project' } })}
              title="View"
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <Eye size={16} className="text-blue-600" />
            </button>
            <button
              onClick={() => navigate(`/dashboard/assemblies/${assembly.id}/edit`)}
              title="Edit"
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <Edit size={16} className="text-yellow-600" />
            </button>
            <button
              onClick={() => handleDeleteAssembly(assembly.id as string)}
              title="Delete"
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <Trash2 size={16} className="text-red-600" />
            </button>
            <button
              onClick={() => handlePrintSingleBarcode(assembly.id as string, assembly.name)}
              title="Print Barcode"
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <Barcode size={16} className="text-green-600" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-gray-800">Assemblies</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrintAllBarcodes}
            disabled={assemblies.length === 0 || loading}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            <Barcode size={16} className="mr-1" />
            Barcodes
          </button>
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            <Settings size={16} className="mr-1" />
            Columns
          </button>
          <Link
            to={`/dashboard/assemblies/create-multiple?projectId=${projectId}`}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Plus size={16} className="mr-1 text-white" />
            <span className="text-white">Add Multiple</span>
          </Link>
          <Link
            to={`/dashboard/assemblies/create?projectId=${projectId}`}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} className="mr-1 text-white" />
            <span className="text-white">Add Assembly</span>
          </Link>
        </div>
      </div>
      
      {/* Column settings modal */}
      {showColumnSettings && (
        <div className="absolute right-4 z-10">
          <ColumnSettings
            columns={assemblyColumns}
            onSave={saveColumnPreferences}
            onCancel={() => setShowColumnSettings(false)}
            getDefaultColumns={getDefaultAssemblyColumns}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent mb-2"></div>
          <p className="text-gray-500">Loading assemblies...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : assemblies.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <p className="text-gray-500 mb-4">No assemblies added to this project yet.</p>
          <Link
            to={`/dashboard/assemblies/create?projectId=${projectId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2 text-white" />
            <span className="text-white">Add First Assembly</span>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden border border-gray-200">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {/* Dynamic column headers based on preferences - now with sorting */}
                {visibleColumns.map(column => renderColumnHeader(column))}
                
                {/* Always include actions column */}
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedAssemblies().map((assembly) => (
                <React.Fragment key={assembly.id}>
                  {/* Parent assembly row */}
                  <tr className={`hover:bg-gray-50 ${assembly.is_parent ? 'bg-gray-50' : ''}`}>
                    {/* Dynamic columns based on preferences */}
                    {visibleColumns.map(column => {
                      // Render different content based on column id
                      switch (column.id) {
                        case 'name':
                          return (
                            <td key={column.id} className="p-3">
                              <div className="flex items-center">
                                {assembly.is_parent ? (
                                  <button
                                    onClick={() => toggleExpandAssembly(assembly.id as string)}
                                    className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-transform duration-200"
                                    style={{ 
                                      transform: expandedAssemblies[assembly.id as string] ? 'rotate(0deg)' : 'rotate(-90deg)'
                                    }}
                                  >
                                    {loadingChildrenFor[assembly.id as string] ? (
                                      <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                      <ChevronDown size={18} />
                                    )}
                                  </button>
                                ) : (
                                  <span className="w-6"></span> // Spacing for alignment
                                )}
                                {assembly.name}
                                {assembly.is_parent && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Group ({assembly.quantity || assembly.original_quantity || 0})
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        case 'weight':
                          return <td key={column.id} className="p-3">{formatWeight(assembly.weight)}</td>;
                        case 'quantity':
                          return <td key={column.id} className="p-3">{assembly.quantity}</td>;
                        case 'status':
                          return (
                            <td key={column.id} className="p-3">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                            </td>
                          );
                        case 'width':
                          return <td key={column.id} className="p-3">{assembly.width ? formatDimension(assembly.width) : '—'}</td>;
                        case 'height':
                          return <td key={column.id} className="p-3">{assembly.height ? formatDimension(assembly.height) : '—'}</td>;
                        case 'length':
                          return <td key={column.id} className="p-3">{assembly.length ? formatDimension(assembly.length) : '—'}</td>;
                        case 'painting_spec':
                          return <td key={column.id} className="p-3">{assembly.painting_spec || '—'}</td>;
                        case 'start_date':
                          return <td key={column.id} className="p-3">{assembly.start_date ? formatDate(assembly.start_date as string) : '—'}</td>;
                        case 'end_date':
                          return <td key={column.id} className="p-3">{assembly.end_date ? formatDate(assembly.end_date as string) : '—'}</td>;
                        case 'quality_control_status':
                          return <td key={column.id} className="p-3">{assembly.quality_control_status || '—'}</td>;
                        default:
                          return <td key={column.id} className="p-3">—</td>;
                      }
                    })}
                    
                    <td className="p-3">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/dashboard/assemblies/${assembly.id}`, { state: { from: 'project' } })}
                          title="View"
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <Eye size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/assemblies/${assembly.id}/edit`)}
                          title="Edit"
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <Edit size={16} className="text-yellow-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssembly(assembly.id as string, assembly.is_parent)}
                          title="Delete"
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                        {/* Only show barcode button for non-parent assemblies */}
                        {!assembly.is_parent && (
                          <button
                            onClick={() => handlePrintSingleBarcode(assembly.id as string, assembly.name)}
                            title="Print Barcode"
                            className="p-1 rounded-full hover:bg-gray-200"
                          >
                            <Barcode size={16} className="text-green-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Child assemblies container with smooth height transition */}
                  {assembly.is_parent && (
                    <tr className="child-assemblies-container">
                      <td colSpan={visibleColumns.length + 1} className="p-0 border-0">
                        {/* We use CSS max-height transition for smooth animation */}
                        <div 
                          className="transition-all duration-300 ease-in-out overflow-hidden"
                          style={{ 
                            maxHeight: expandedAssemblies[assembly.id as string] 
                              ? `${(childAssemblies[assembly.id as string]?.length || 0) * 53}px` 
                              : '0',
                            opacity: expandedAssemblies[assembly.id as string] ? 1 : 0
                          }}
                        >
                          <table className="w-full">
                            <tbody>
                              {/* Child assemblies rows - only rendered when data is available */}
                              {childAssemblies[assembly.id as string]?.map(childAssembly => 
                                renderChildAssemblyRow(childAssembly)
                              )}
                              
                              {/* Show loading placeholder if we're still loading children */}
                              {loadingChildrenFor[assembly.id as string] && !childAssemblies[assembly.id as string] && (
                                <tr className="bg-gray-50">
                                  <td colSpan={visibleColumns.length + 1} className="p-3 text-center">
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                                    <span className="text-sm text-gray-500">Loading child assemblies...</span>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Barcode Print View */}
      {showPrintView && (
        <BarcodePrintView
          barcodes={selectedBarcodes}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </div>
  );
};

export default ProjectAssemblies;