// src/Web_part/FrontEnd/src/pages/Logistics/LogisticsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Filter, 
  ArrowUp,
  ArrowDown,
  Truck
} from 'lucide-react';
import { LogisticsBatch, logisticsApi } from '../../lib/logisticsApi';
import { formatDate, formatWeight, naturalSort } from '../../utils/formatters';

// Define types for sorting
type SortColumn = 'batch_number' | 'status' | 'client_id' | 'project_id' | 'delivery_address' | 'total_weight' | 'shipment_date' | 'estimated_arrival';
type SortDirection = 'asc' | 'desc';

const LogisticsPage: React.FC = () => {
  const [batches, setBatches] = useState<LogisticsBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('shipment_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const navigate = useNavigate();

  // Load logistics batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const data = await logisticsApi.getBatches();
        setBatches(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching logistics batches:', err);
        setError('Failed to load logistics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // Filter batches based on search term and status
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.client?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.project?.internal_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.delivery_address || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter ? batch.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Sorting function
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by this column
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted batches
  const getSortedBatches = (): LogisticsBatch[] => {
    return [...filteredBatches].sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      // Handle special cases for joined fields
      if (sortColumn === 'client_id') {
        valueA = a.client?.company_name || '';
        valueB = b.client?.company_name || '';
      } else if (sortColumn === 'project_id') {
        valueA = a.project?.internal_number || '';
        valueB = b.project?.internal_number || '';
      } else {
        valueA = a[sortColumn];
        valueB = b[sortColumn];
      }
      
      // Handle dates
      if (sortColumn === 'shipment_date' || sortColumn === 'estimated_arrival') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // String comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? naturalSort(valueA, valueB) 
          : naturalSort(valueB, valueA);
      }
      
      // Number comparison
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredBatches.length === 0) return;
    
    const headers = [
      'Batch Number', 
      'Status', 
      'Client', 
      'Project', 
      'Delivery Address',
      'Total Weight',
      'Shipment Date',
      'Estimated Arrival'
    ];
    
    const csvData = filteredBatches.map(batch => [
      batch.batch_number,
      batch.status,
      batch.client?.company_name || '',
      batch.project?.internal_number ? `${batch.project.internal_number} - ${batch.project.name}` : '',
      batch.delivery_address || '',
      batch.total_weight ? `${batch.total_weight} kg` : '',
      batch.shipment_date ? formatDate(batch.shipment_date) : '',
      batch.estimated_arrival ? formatDate(batch.estimated_arrival) : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'logistics_batches.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete batch
  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this logistics batch?')) {
      return;
    }
    
    try {
      await logisticsApi.deleteBatch(id);
      setBatches(batches.filter(batch => batch.id !== id));
    } catch (err) {
      console.error('Error deleting logistics batch:', err);
      setError('Failed to delete logistics batch. Please try again.');
    }
  };

  // Render sort header
  const renderSortHeader = (label: string, column: SortColumn) => (
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Truck size={24} className="mr-2 text-blue-600" />
          Logistics
        </h2>
        <Link
          to="/dashboard/logistics/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2 text-white" />
          <span className="text-white">Create Batch</span>
        </Link>
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
              placeholder="Search batches, clients, projects..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        
        <button
          onClick={exportToCSV}
          disabled={filteredBatches.length === 0}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={18} className="mr-2" />
          Export
        </button>
      </div>

      {/* Batches table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading logistics batches...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-md">
          <p className="text-gray-500">No logistics batches found.</p>
          {searchTerm || statusFilter ? (
            <p className="text-gray-400 mt-1">Try adjusting your filters.</p>
          ) : (
            <Link
              to="/dashboard/logistics/create"
              className="mt-3 inline-block text-blue-600 hover:underline"
            >
              Create your first logistics batch
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto h-[calc(100vh-300px)] border border-gray-200 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {renderSortHeader('Batch #', 'batch_number')}
                {renderSortHeader('Status', 'status')}
                {renderSortHeader('Client', 'client_id')}
                {renderSortHeader('Project', 'project_id')}
                {renderSortHeader('Delivery Address', 'delivery_address')}
                {renderSortHeader('Total Weight', 'total_weight')}
                {renderSortHeader('Shipment Date', 'shipment_date')}
                {renderSortHeader('Est. Arrival', 'estimated_arrival')}
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedBatches().map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{batch.batch_number}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                  </td>
                  <td className="p-3">{batch.client?.company_name || '—'}</td>
                  <td className="p-3">
                    {batch.project?.internal_number ? (
                      <div>
                        <div className="font-medium">{batch.project.internal_number}</div>
                        <div className="text-xs text-gray-500">{batch.project.name}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3 max-w-[200px] truncate" title={batch.delivery_address}>
                    {batch.delivery_address}
                  </td>
                  <td className="p-3">{batch.total_weight ? formatWeight(batch.total_weight) : '—'}</td>
                  <td className="p-3">{batch.shipment_date ? formatDate(batch.shipment_date) : '—'}</td>
                  <td className="p-3">{batch.estimated_arrival ? formatDate(batch.estimated_arrival) : '—'}</td>
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/logistics/${batch.id}`)}
                        title="View"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/logistics/${batch.id}/edit`)}
                        title="Edit"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Edit size={16} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch.id as string)}
                        title="Delete"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogisticsPage;