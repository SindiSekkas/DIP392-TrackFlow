// src/pages/Clients/ClientsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Settings, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';
import { Client, clientsApi } from '../../lib/clientsApi';
import { ColumnPreference } from '../../lib/preferencesApi';
import ColumnSettings from '../../components/ColumnSettings';
import { useColumnSettings } from '../../contexts/ColumnSettingsContext';

// Define types for sorting
type SortColumn = 'company_name' | 'registration_code' | 'vat_code' | 'contact_person' | 'email';
type SortDirection = 'asc' | 'desc';

// Default column settings
export const getDefaultClientColumns = (): ColumnPreference[] => [
  { id: 'company_name', label: 'Company Name', visible: true },
  { id: 'registration_code', label: 'Registration Code', visible: true },
  { id: 'vat_code', label: 'VAT Code', visible: true },
  { id: 'contact_person', label: 'Contact Person', visible: true },
  { id: 'email', label: 'Email', visible: false },
  { id: 'phone', label: 'Phone', visible: false },
  { id: 'address', label: 'Address', visible: false }
];

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('company_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const navigate = useNavigate();
  
  // Get column preferences from context
  const { clientColumns, saveClientColumns } = useColumnSettings();

  // Get visible columns
  const visibleColumns = clientColumns.filter((col: ColumnPreference) => col.visible);

  // Loading clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await clientsApi.getClients();
        setClients(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Filtering clients by search query
  const filteredClients = clients.filter(client => {
    return (
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.registration_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.vat_code && client.vat_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Deleting a client
  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }
    
    try {
      // Check if the client can be deleted safely
      const canDelete = await clientsApi.canDeleteClient(id);
      
      if (!canDelete) {
        setError('Cannot delete client that is associated with projects');
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      await clientsApi.deleteClient(id);
      setClients(clients.filter(client => client.id !== id));
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError('Failed to delete client. Please try again.');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredClients.length === 0) return;
    
    // Create headers based on visible columns
    const headers = visibleColumns.map((col: ColumnPreference) => col.label);
    
    // Create rows based on visible columns
    const csvData = filteredClients.map(client => {
      return visibleColumns.map((column: ColumnPreference) => {
        const value = client[column.id as keyof Client];
        return value ? value.toString() : '';
      });
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'clients.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Get sorted clients
  const getSortedClients = (): Client[] => {
    return [...filteredClients].sort((a, b) => {
      let valueA: any = a[sortColumn];
      let valueB: any = b[sortColumn];
      
      // Handle null values
      valueA = valueA || '';
      valueB = valueB || '';
      
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

  // Save column preferences
  const saveColumnPreferences = async (updatedColumns: ColumnPreference[]) => {
    try {
      await saveClientColumns(updatedColumns);
      setShowColumnSettings(false);
    } catch (error) {
      console.error('Error saving column preferences:', error);
    }
  };

  // Render column header with sort indicators
  const renderColumnHeader = (column: ColumnPreference) => {
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Clients</h2>
        <Link
          to="/dashboard/clients/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2 text-white" />
          <span className="text-white">Add Client</span>
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
              placeholder="Search clients..."
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
        
        <button
          onClick={exportToCSV}
          disabled={filteredClients.length === 0}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={18} className="mr-2" />
          Export
        </button>

        <div className="relative">
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Settings size={18} className="mr-2" />
            Columns
          </button>
          
          {/* Column settings */}
          {showColumnSettings && (
            <div className="absolute right-0 mt-2 z-50">
              <ColumnSettings
                columns={clientColumns}
                onSave={saveColumnPreferences}
                onCancel={() => setShowColumnSettings(false)}
                getDefaultColumns={getDefaultClientColumns}
              />
            </div>
          )}
        </div>
      </div>

      {/* Clients table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-md">
          <p className="text-gray-500">No clients found.</p>
          {searchTerm ? (
            <p className="text-gray-400 mt-1">Try adjusting your search.</p>
          ) : (
            <Link
              to="/dashboard/clients/create"
              className="mt-3 inline-block text-blue-600 hover:underline"
            >
              Create your first client
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto h-[calc(100vh-300px)] border border-gray-200 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {/* Dynamic column headers based on visible columns */}
                {visibleColumns.map((column: ColumnPreference) => renderColumnHeader(column))}
                
                {/* Always include actions column */}
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedClients().map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  {/* Dynamic columns based on visible columns */}
                  {visibleColumns.map((column: ColumnPreference) => (
                    <td key={column.id} className="p-3">
                      {client[column.id as keyof Client] || '—'}
                    </td>
                  ))}
                  
                  {/* Actions column */}
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/clients/${client.id}`)}
                        title="View"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/clients/${client.id}/edit`)}
                        title="Edit"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Edit size={16} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id as string)}
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

export default ClientsPage;