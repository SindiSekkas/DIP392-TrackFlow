// src/pages/NFCCards/NFCCardManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Plus, 
  Search, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  User, 
  AlertCircle, 
  Check, 
  CreditCard,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/formatters';

// Interface for NFC Card
interface NFCCard {
  id?: string;
  card_id: string;
  user_id: string;
  is_active: boolean;
  last_used?: string | null;
  created_at?: string;
  user?: {
    fullName: string;
    email: string;
  };
}

// Type for user data
interface UserData {
  auth_user_id: string;
  full_name: string;
  email?: string;
  role: string;
  worker_type_id?: string;
  worker_types?: {
    type_name: string;
  } | null;
}

// Define types for sorting
type SortColumn = 'card_id' | 'user' | 'is_active' | 'last_used';
type SortDirection = 'asc' | 'desc';

const NFCCardManagement: React.FC = () => {
  // State for cards and operations
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('card_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [newCardId, setNewCardId] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [isCardActive, setIsCardActive] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Deletion confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<NFCCard | null>(null);

  // Fetch NFC cards and users on component mount
  useEffect(() => {
    fetchCards();
    fetchUsers();
  }, []);

  // Function to fetch NFC cards
  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all NFC cards
      const { data: cards, error } = await supabase
        .from('nfc_cards')
        .select(`
          id,
          card_id,
          user_id,
          is_active,
          last_used,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch user details for each card
      const cardsWithUserInfo = await Promise.all(
        cards.map(async (card) => {
          // Get user profile data (only fields that exist in the schema)
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('auth_user_id', card.user_id)
            .single();
          
          // Don't try to fetch email directly from auth.users table
          // This is what was causing the errors
          
          return {
            ...card,
            user: {
              fullName: profile?.full_name || 'Unknown User',
              email: '' // We'll leave this empty for now
            }
          };
        })
      );
      
      setCards(cardsWithUserInfo);
    } catch (err: any) {
      console.error('Error fetching cards:', err);
      setError(err.message || 'Failed to load cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch users for the dropdown
  const fetchUsers = async () => {
    try {
      // Get all user profiles with worker types included for worker roles
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select(`
          auth_user_id, 
          full_name, 
          role,
          worker_type_id,
          worker_types(type_name)
        `)
        .order('full_name');
      
      if (error) throw error;
      
      // Manually convert each raw profile to a UserData object
      const processedProfiles: UserData[] = profiles.map(profile => {
        // Extract worker_types safely
        let workerType: { type_name: string } | null = null;
        
        if (profile.worker_types) {
          if (Array.isArray(profile.worker_types) && profile.worker_types.length > 0) {
            workerType = {
              type_name: profile.worker_types[0].type_name
            };
          } else if (typeof profile.worker_types === 'object') {
            workerType = {
              type_name: (profile.worker_types as any).type_name
            };
          }
        }

        return {
          auth_user_id: profile.auth_user_id,
          full_name: profile.full_name,
          role: profile.role,
          worker_type_id: profile.worker_type_id,
          worker_types: workerType
        };
      });
      
      setUsers(processedProfiles);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };
  
  // Helper function to format role display
  const formatRoleDisplay = (user: UserData): string => {
    if (user.role === 'admin') {
      return 'Admin';
    } else if (user.role === 'manager') {
      return 'Manager';
    } else if (user.role === 'worker' && user.worker_types?.type_name) {
      // Capitalize first letter of worker type
      const workerType = user.worker_types.type_name;
      return workerType.charAt(0).toUpperCase() + workerType.slice(1);
    }
    
    // Fallback to capitalize the role if nothing else matches
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  };

  // Filter cards based on search term
  const filteredCards = cards.filter(card => {
    const searchLower = searchTerm.toLowerCase();
    return (
      card.card_id.toLowerCase().includes(searchLower) ||
      (card.user?.fullName?.toLowerCase() || '').includes(searchLower)
    );
  });

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

  // Get sorted cards based on sort column and direction
  const getSortedCards = (): NFCCard[] => {
    return [...filteredCards].sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      // Special handling for user column which is an object
      if (sortColumn === 'user') {
        valueA = a.user?.fullName || '';
        valueB = b.user?.fullName || '';
      } else if (sortColumn === 'last_used') {
        valueA = a.last_used ? new Date(a.last_used).getTime() : 0;
        valueB = b.last_used ? new Date(b.last_used).getTime() : 0;
      } else {
        valueA = a[sortColumn];
        valueB = b[sortColumn];
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

  // Open form for assigning a new card or editing existing one
  const openForm = (card?: NFCCard) => {
    if (card) {
      setSelectedCardId(card.id || null);
      setNewCardId(card.card_id);
      setNewUserId(card.user_id);
      setIsCardActive(card.is_active);
    } else {
      setSelectedCardId(null);
      setNewCardId('');
      setNewUserId('');
      setIsCardActive(true);
    }
    setShowForm(true);
  };

  // Close form with animation
  const closeForm = () => {
    setIsFormClosing(true);
    setTimeout(() => {
      setShowForm(false);
      setIsFormClosing(false);
      setError(null);
    }, 300);
  };

  // Open delete confirmation
  const openDeleteConfirm = (card: NFCCard) => {
    setCardToDelete(card);
    setShowDeleteConfirm(true);
  };

  // Close delete confirmation
  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setCardToDelete(null);
  };

  // Handle form submission for assigning a card
  const handleAssignCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCardId.trim()) {
      setError('Card ID is required');
      return;
    }
    
    if (!newUserId) {
      setError('Please select a user');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (selectedCardId) {
        // Update existing card
        const { error } = await supabase
          .from('nfc_cards')
          .update({
            card_id: newCardId,
            user_id: newUserId,
            is_active: isCardActive
          })
          .eq('id', selectedCardId);
        
        if (error) throw error;
        setSuccess(`Card ${newCardId} updated successfully`);
      } else {
        // Check if card already exists
        const { data: existingCard } = await supabase
          .from('nfc_cards')
          .select('id')
          .eq('card_id', newCardId)
          .maybeSingle();
        
        if (existingCard) {
          // Update existing card
          const { error } = await supabase
            .from('nfc_cards')
            .update({
              user_id: newUserId,
              is_active: isCardActive
            })
            .eq('id', existingCard.id);
          
          if (error) throw error;
          setSuccess(`Card ${newCardId} updated successfully`);
        } else {
          // Create new card
          const { error } = await supabase
            .from('nfc_cards')
            .insert({
              card_id: newCardId,
              user_id: newUserId,
              is_active: isCardActive
            });
          
          if (error) throw error;
          setSuccess(`Card ${newCardId} assigned successfully`);
        }
      }
      
      // Close form and refresh data
      closeForm();
      fetchCards();
    } catch (err: any) {
      console.error('Error assigning card:', err);
      setError(err.message || 'Failed to assign card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle card activation toggle
  const handleToggleActive = async (card: NFCCard) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!card.id) return;
      
      const { error } = await supabase
        .from('nfc_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);
      
      if (error) throw error;
      
      // Update the local state
      setCards(cards.map(c => 
        c.id === card.id ? { ...c, is_active: !card.is_active } : c
      ));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error toggling card status:', err);
      setError(err.message || 'Failed to update card status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle card deletion
  const handleDeleteCard = async () => {
    if (!cardToDelete?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('nfc_cards')
        .delete()
        .eq('id', cardToDelete.id);
      
      if (error) throw error;
      
      // Update the local state
      setCards(cards.filter(card => card.id !== cardToDelete.id));
      setSuccess(`Card ${cardToDelete.card_id} deleted successfully`);
      
      closeDeleteConfirm();
    } catch (err: any) {
      console.error('Error deleting card:', err);
      setError(err.message || 'Failed to delete card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredCards.length === 0) return;
    
    // Headers for CSV
    const headers = [
      'Card ID', 
      'User Name', 
      'Status', 
      'Last Used', 
      'Created At'
    ];
    
    // Create rows
    const csvData = filteredCards.map(card => [
      card.card_id,
      card.user?.fullName || 'Unknown',
      card.is_active ? 'Active' : 'Inactive',
      card.last_used ? formatDate(card.last_used) : 'Never',
      formatDate(card.created_at || '')
    ]);
    
    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nfc_cards.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <Layout>
      <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[calc(100vh-160px)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <CreditCard size={24} className="mr-2 text-blue-600" />
            Card Management
          </h2>
          {!showForm && (
            <button
              onClick={() => openForm()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} className="mr-2 text-white" />
              <span className="text-white">Assign New Card</span>
            </button>
          )}
        </div>

        {/* Error and success messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 flex items-center">
            <AlertCircle size={18} className="mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 flex items-center">
            <Check size={18} className="mr-2" />
            {success}
          </div>
        )}

        {/* Inline form for adding/editing cards */}
        {showForm && (
          <div 
            className={`transform transition-all duration-300 ease-out mb-6
              ${isFormClosing 
                ? "opacity-0 -translate-y-4" 
                : "opacity-100 translate-y-0"}`}
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  {selectedCardId ? 'Edit Card Assignment' : 'Assign New Card'}
                </h3>
                <button 
                  onClick={closeForm} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAssignCard} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card ID *
                    </label>
                    <input
                      type="text"
                      value={newCardId}
                      onChange={(e) => setNewCardId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Enter card UID"
                      required
                    />
                  </div>
                  
                  {/* User Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To User *
                    </label>
                    <select
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select a user</option>
                      {users.map(user => (
                        <option key={user.auth_user_id} value={user.auth_user_id}>
                          {user.full_name} ({formatRoleDisplay(user)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Active Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isCardActive}
                        onChange={(e) => setIsCardActive(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    disabled={loading}
                  >
                    {loading
                      ? 'Saving...'
                      : selectedCardId
                      ? 'Update Assignment'
                      : 'Assign Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters and search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by card ID or user..."
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
            disabled={filteredCards.length === 0}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>

        {/* Cards table */}
        {loading && !cards.length ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-md">
            <p className="text-gray-500">No cards found.</p>
            {searchTerm ? (
              <p className="text-gray-400 mt-1">Try adjusting your search.</p>
            ) : (
              <button
                onClick={() => openForm()}
                className="mt-4 text-blue-600 hover:underline"
              >
                Assign your first card
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {renderColumnHeader('Card ID', 'card_id')}
                  {renderColumnHeader('Assigned To', 'user')}
                  {renderColumnHeader('Status', 'is_active')}
                  {renderColumnHeader('Last Used', 'last_used')}
                  <th className="text-center p-3 select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getSortedCards().map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{card.card_id}</td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <User size={16} className="text-gray-400 mr-2" />
                        <div>
                          <div>{card.user?.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          card.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <Clock size={16} className="text-gray-400 mr-2" />
                        <span>
                          {card.last_used ? formatDate(card.last_used) : 'Never used'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(card)}
                          title={card.is_active ? 'Deactivate' : 'Activate'}
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          {card.is_active ? (
                            <ToggleRight size={20} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={20} className="text-red-600" />
                          )}
                        </button>
                        <button
                          onClick={() => openForm(card)}
                          title="Edit Assignment"
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <User size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(card)}
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

        {/* Delete confirmation - uses a lightweight dialog approach */}
        {showDeleteConfirm && cardToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div 
              className="fixed inset-0 bg-black bg-opacity-30" 
              onClick={closeDeleteConfirm}
            ></div>
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full z-10 relative">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Delete Card</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-700">
                  Are you sure you want to delete the card <span className="font-mono font-medium">{cardToDelete.card_id}</span>?
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Card'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NFCCardManagement;