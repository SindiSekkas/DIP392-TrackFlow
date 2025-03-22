// src/pages/Assemblies/BarcodeManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  CheckSquare,
  Square,
  BarChart4,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/formatters';
import BarcodeGenerator from '../../components/Assemblies/BarcodeGenerator';
import BarcodePrintView from '../../components/Assemblies/BarcodePrintView';

// Interface for Barcode data
interface Barcode {
  id: string;
  barcode: string;
  assemblyId: string;
  assemblyName: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  selected?: boolean;
}

// Interface for Assembly data
interface Assembly {
  id: string;
  name: string;
  project_id: string;
  projects: {
    name: string;
  };
}

// Define types for sorting
type SortColumn = 'barcode' | 'assemblyName' | 'projectName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const BarcodeManagementPage: React.FC = () => {
  // State for barcodes and assemblies
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [assembliesWithoutBarcodes, setAssembliesWithoutBarcodes] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // State for UI controls
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [selectedBarcodes, setSelectedBarcodes] = useState<Barcode[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);

  // Fetch barcodes and assemblies on component mount
  useEffect(() => {
    fetchData();
    fetchProjects();
  }, []);

  // Fetch all projects for filtering
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  };

  // Main data fetching function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch existing barcodes
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('assembly_barcodes')
        .select(`
          id,
          barcode,
          assembly_id,
          created_at,
          assemblies(
            id,
            name,
            project_id,
            projects(
              id,
              name
            )
          )
        `);
      
      if (barcodeError) throw barcodeError;
      
      // Format barcode data
      const formattedBarcodes: Barcode[] = (barcodeData || []).map((item: any) => ({
        id: item.id,
        barcode: item.barcode,
        assemblyId: item.assembly_id,
        assemblyName: item.assemblies?.name || 'Unknown Assembly',
        projectId: item.assemblies?.project_id || '',
        projectName: item.assemblies?.projects?.name || 'Unknown Project',
        createdAt: item.created_at,
        selected: false
      }));
      
      setBarcodes(formattedBarcodes);
      
      // Fetch assemblies without barcodes
      const { data: assembliesData, error: assembliesError } = await supabase
      .from('assemblies')
      .select(`
        id,
        name,
        project_id,
        projects(
          name
        )
      `)
      .not('id', 'in', `(${formattedBarcodes.map(b => `'${b.assemblyId}'`).join(',') || "''"})`)
      .order('name');
    
    if (assembliesError) throw assembliesError;
    

      // Convert to proper Assembly type
      if (assembliesData) {
        const formattedAssemblies: Assembly[] = [];
        
        for (const item of assembliesData as any[]) {
          formattedAssemblies.push({
            id: item.id,
            name: item.name,
            project_id: item.project_id,
            projects: {
              name: item.projects?.name || 'Unknown Project'
            }
          });
        }
        
        setAssembliesWithoutBarcodes(formattedAssemblies);
      } else {
        setAssembliesWithoutBarcodes([]);
      }

    } catch (err: any) {
      console.error('Error fetching barcode data:', err);
      setError(err.message || 'Failed to load barcode data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a barcode for an assembly
  const generateBarcode = async (assemblyId: string) => {
    try {
      const { data, error } = await supabase
        .from('assembly_barcodes')
        .insert({
          assembly_id: assemblyId,
          barcode: `ASM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
        })
        .select();
      
      if (error) throw error;
      
      // Refresh data after generation
      fetchData();
      
      return data;
    } catch (err: any) {
      console.error('Error generating barcode:', err);
      throw err;
    }
  };

  // Generate barcodes in bulk
  const generateBulkBarcodes = async (assemblyIds: string[]) => {
    try {
      setLoading(true);
      
      // Generate barcodes one by one
      for (const id of assemblyIds) {
        await generateBarcode(id);
      }
      
      setShowBarcodeGenerator(false);
    } catch (err: any) {
      console.error('Error generating bulk barcodes:', err);
      setError(err.message || 'Failed to generate barcodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter barcodes based on search term and project filter
  const filteredBarcodes = barcodes.filter(barcode => {
    const matchesSearch = 
      barcode.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barcode.assemblyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barcode.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter ? barcode.projectId === projectFilter : true;
    
    return matchesSearch && matchesProject;
  });

  // Handle selection of barcodes for printing
  const handleSelectBarcode = (id: string) => {
    setBarcodes(barcodes.map(barcode => 
      barcode.id === id ? { ...barcode, selected: !barcode.selected } : barcode
    ));
  };

  // Handle select all barcodes
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    setBarcodes(barcodes.map(barcode => ({
      ...barcode,
      selected: newSelectAll
    })));
  };

  // Prepare for printing
  const handlePrint = () => {
    const selectedForPrint = barcodes.filter(barcode => barcode.selected);
    if (selectedForPrint.length === 0) {
      setError('Please select at least one barcode to print');
      return;
    }
    
    setSelectedBarcodes(selectedForPrint);
    setShowPrintView(true);
  };

  // Sorting function
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

  // Get sorted barcodes
  const getSortedBarcodes = (): Barcode[] => {
    return [...filteredBarcodes].sort((a, b) => {
      let valueA: any = a[sortColumn];
      let valueB: any = b[sortColumn];
      
      // Special handling for dates
      if (sortColumn === 'createdAt') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      // Case insensitive comparison for strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Render column header with sort indicators
  const renderColumnHeader = (label: string, column: SortColumn) => {
    return (
      <th 
        className="text-left p-3 cursor-pointer hover:bg-gray-200"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center justify-between">
          <span className="select-none">{label}</span>
          <span className="w-4 inline-block">
            {sortColumn === column && (
              sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Close the print view
  const handleClosePrintView = () => {
    setShowPrintView(false);
    setSelectedBarcodes([]);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <BarChart4 size={24} className="mr-2 text-blue-600" />
          Barcode Management
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowBarcodeGenerator(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2 text-white" />
            <span className="text-white">Generate Barcodes</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={barcodes.filter(b => b.selected).length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Printer size={18} className="mr-2 text-white" />
            <span className="text-white">Print Selected</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search barcodes or assemblies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-md"
            />
            <Search 
              size={18} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter size={18} className="text-gray-500" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={fetchData}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={18} className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Barcodes table */}
      {loading && !barcodes.length ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading barcodes...</p>
        </div>
      ) : filteredBarcodes.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-md">
          <p className="text-gray-500">No barcodes found.</p>
          {searchTerm || projectFilter ? (
            <p className="text-gray-400 mt-1">Try adjusting your filters.</p>
          ) : (
            <button
              onClick={() => setShowBarcodeGenerator(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Generate your first barcode
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={handleSelectAll}
                  >
                    {selectAll ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
                </th>
                {renderColumnHeader('Barcode', 'barcode')}
                {renderColumnHeader('Assembly Name', 'assemblyName')}
                {renderColumnHeader('Project', 'projectName')}
                {renderColumnHeader('Generated On', 'createdAt')}
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedBarcodes().map((barcode) => (
                <tr key={barcode.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => handleSelectBarcode(barcode.id)}
                    >
                      {barcode.selected ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-mono">{barcode.barcode}</td>
                  <td className="p-3">{barcode.assemblyName}</td>
                  <td className="p-3">{barcode.projectName}</td>
                  <td className="p-3">{formatDate(barcode.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBarcodes([barcode]);
                          setShowPrintView(true);
                        }}
                        title="Print Barcode"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Printer size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await generateBarcode(barcode.assemblyId);
                          } catch (err: any) {
                            setError(err.message || 'Failed to regenerate barcode');
                          }
                        }}
                        title="Regenerate Barcode"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <RefreshCw size={16} className="text-yellow-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Barcode Generator Modal */}
      {showBarcodeGenerator && (
        <BarcodeGenerator
          assemblies={assembliesWithoutBarcodes}
          onClose={() => setShowBarcodeGenerator(false)}
          onGenerate={generateBulkBarcodes}
        />
      )}

      {/* Barcode Print View */}
      {showPrintView && (
        <BarcodePrintView
          barcodes={selectedBarcodes}
          onClose={handleClosePrintView}
        />
      )}
    </div>
  );
};

export default BarcodeManagementPage;