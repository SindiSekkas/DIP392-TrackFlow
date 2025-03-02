// src/pages/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { userApi } from '../lib/apiClient';
import { validateInput, sanitizeEmail, sanitizeText } from '../utils/sanitization';
import { generateRandomPassword } from '../utils/passwordUtils';
import { X, Check, AlertCircle, UserPlus, Key, ArrowUp, ArrowDown } from 'lucide-react';

// Utility function for capitalizing the first letter of a string
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Define types for our component
interface User {
  id: string;
  profileId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'worker';
  workerType?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkerType {
  id: string;
  type_name: string;
}

// Types for sorting
type SortColumn = 'fullName' | 'email' | 'role' | 'workerType' | 'active';
type SortDirection = 'asc' | 'desc';

// User detail modal component
const UserDetailModal: React.FC<{
  user: User | null; 
  onClose: () => void;
  onToggleActive: (userId: string, currentActive: boolean) => void;
  onResetPassword: (userId: string, userName: string) => void;
  resetPasswordLoading: boolean;
  resetPasswordSuccess: {userId: string, password: string} | null;
  currentUserId: string; // Prop to check if viewing own profile
}> = ({ user, onClose, onToggleActive, onResetPassword, resetPasswordLoading, resetPasswordSuccess, currentUserId }) => {
  if (!user) return null;

  // Check if viewing own profile
  const isOwnProfile = user.id === currentUserId;

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-modal-appear">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">User Details</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 focus:outline-none"
          >
            <X 
              size={20} 
              strokeWidth={2}
              className="transition-colors duration-200" 
            />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          {/* User info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="text-gray-900 font-medium">{user.fullName}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="text-gray-900">{user.email}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div>
                <span 
                  className={`inline-block px-2 py-1 rounded text-xs font-medium 
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
            
            {user.workerType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
                <div className="text-gray-900">{capitalizeFirstLetter(user.workerType)}</div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div>
                <span 
                  className={`inline-block px-2 py-1 rounded text-xs font-medium 
                    ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Reset password success message */}
          {resetPasswordSuccess && resetPasswordSuccess.userId === user.id && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
              <div className="flex items-center mb-2">
                <Key size={16} className="mr-2" />
                <span>Password has been reset successfully!</span>
              </div>
              <div className="mt-2 font-medium">
                New temporary password: <span className="font-mono bg-white p-1 rounded border border-green-200">{resetPasswordSuccess.password}</span>
              </div>
              <p className="text-xs mt-1">
                Please securely share this with the user. They will need to change it on first login.
              </p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex space-x-3 pt-4 mt-4 border-t">
            <button
              onClick={() => onToggleActive(user.id, user.active)}
              disabled={user.active && isOwnProfile} // Disable deactivate for own account
              className={`flex-1 flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${user.active 
                  ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500' 
                  : 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-green-500'}
                ${user.active && isOwnProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {user.active ? 'Deactivate' : 'Activate'}
            </button>
            
            {/* Display warning message when trying to deactivate own account */}
            {user.active && isOwnProfile && (
              <div className="absolute -top-6 left-0 right-0 text-center">
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  You cannot deactivate your own account
                </span>
              </div>
            )}
            
            <button
              onClick={() => onResetPassword(user.id, user.fullName)}
              disabled={resetPasswordLoading}
              className="flex-1 flex justify-center items-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Key size={16} className="mr-2" />
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
const UserManagementPage: React.FC = () => {
  // State for users and form
  const [users, setUsers] = useState<User[]>([]);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('fullName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New state for password reset
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<{userId: string, password: string} | null>(null);

  // Form state for creating a new user
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [generatePasswordToggle, setGeneratePasswordToggle] = useState(true);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'worker'>('worker');
  const [workerType, setWorkerType] = useState('engineer');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState('');

  // Get auth context
  const { user, session } = useAuth();
  
  // Get current user role
  const currentUserRole = user?.user_metadata?.role || '';
  const isAdmin = currentUserRole === 'admin';
  const isManager = currentUserRole === 'manager';

  // Fetch users and worker types on component mount
  useEffect(() => {
    fetchUsers();
    fetchWorkerTypes();
  }, []);

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use our API client to get users
      const { data } = await userApi.getUsers(session?.access_token || '');
      
      if (data) {
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch worker types
  const fetchWorkerTypes = async () => {
    try {
      // Query worker_types table
      const { data, error } = await supabase
        .from('worker_types')
        .select('id, type_name');
      
      if (error) {
        console.error('Error fetching worker types:', error);
        throw error;
      }
      
      if (data) {
        setWorkerTypes(data);
      }
    } catch (err) {
      console.error('Error fetching worker types:', err);
      // Fallback to hardcoded types in case of error
      const fallbackTypes = [
        { id: 'engineer', type_name: 'Engineer' },
        { id: 'welder', type_name: 'Welder' },
        { id: 'assembler', type_name: 'Assembler' },
        { id: 'painter', type_name: 'Painter' },
        { id: 'logistics', type_name: 'Logistics' }
      ];
      setWorkerTypes(fallbackTypes);
    }
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

  // Get sorted users based on current sort settings
  const getSortedUsers = (): User[] => {
    return [...users].sort((a, b) => {
      let valueA: any = a[sortColumn];
      let valueB: any = b[sortColumn];
      
      // Special handling for workerType which might be undefined
      if (sortColumn === 'workerType') {
        valueA = valueA || '';
        valueB = valueB || '';
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

  // Validate the form before submission
  const validateForm = (): boolean => {
    if (!validateInput(email, 'email')) {
      setFormError('Please enter a valid email address');
      return false;
    }
    
    if (fullName.length < 2) {
      setFormError('Full name must be at least 2 characters');
      return false;
    }
    
    if (!generatePasswordToggle && password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return false;
    }
    
    if (role === 'worker' && !workerType) {
      setFormError('Please select a worker type');
      return false;
    }
    
    return true;
  };

  // Handle form submission to create a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormLoading(true);
      setFormError('');
      setTempPassword(null);
      
      // Sanitize inputs
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedFullName = sanitizeText(fullName);
      
      // Generate a password if toggle is on, otherwise use the entered password
      const userPassword = generatePasswordToggle 
        ? generateRandomPassword() 
        : sanitizeText(password);
      
      // Prepare user data
      const userData = {
        email: sanitizedEmail,
        fullName: sanitizedFullName,
        role: role,
        workerType: role === 'worker' ? workerType : undefined,
        password: generatePasswordToggle ? undefined : userPassword // Only send password if not auto-generating
      };
      
      // Create user using our API client
      const response = await userApi.createUser(userData, session?.access_token);
      
      // Set the temporary password if one was generated
      if (response.data.temporaryPassword) {
        setTempPassword(response.data.temporaryPassword);
        setNewUserFullName(sanitizedFullName); // Store the name for display
      } else {
        // Only show the main success message if we're not showing a temp password
        setSuccess(`User ${sanitizedFullName} created successfully!`);
      }
      
      // Wait a moment before refreshing to allow the server to process
      setTimeout(() => {
        fetchUsers(); // Refresh user list
      }, 1000);
      
      // Don't reset form if we need to show the temp password
      if (!response.data.temporaryPassword) {
        resetForm();
      }
      
    } catch (err: any) {
      console.error('Error creating user:', err);
      setFormError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle opening the user detail modal - UPDATED TO FETCH FULL USER DETAILS
  const handleUserClick = async (user: User) => {
    try {
      // Only proceed if user has admin or manager role
      if (!(isAdmin || isManager)) return;
      
      // Fetch complete user details including email
      const { data: completeUser } = await userApi.getUser(user.id, session?.access_token || '');
      
      setSelectedUser(completeUser);
      setResetPasswordSuccess(null); // Clear any previous password reset
    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setError(err.message || 'Failed to load user details. Please try again.');
      
      // Fall back to the user data we have
      setSelectedUser(user);
    }
  };

  // Function to handle password reset
  const handleResetPassword = async (userId: string, userName: string) => {
    try {
      setResetPasswordLoading(true);
      setError('');
      setSuccess('');
      
      // Call the API to reset the password
      const response = await userApi.resetPassword(userId, session?.access_token || '');
      
      if (response.data.temporaryPassword) {
        // Store the new password and user ID for display
        setResetPasswordSuccess({
          userId: userId,
          password: response.data.temporaryPassword
        });
      } else {
        setSuccess(`Password reset for ${userName}`);
      }
      
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Handle closing the user detail modal
  const handleCloseUserDetail = () => {
    setSelectedUser(null);
    setResetPasswordSuccess(null);
  };

  // Reset form state
  const handleCloseForm = () => {
    setIsFormClosing(true);
    
    // Use exact same timing as Tailwind transition will use
    setTimeout(() => {
      setShowForm(false);
      setIsFormClosing(false);
    }, 300); // 300ms matching the duration-300 class
  };

  const resetForm = () => {
    handleCloseForm();
    setGeneratePasswordToggle(true);
    setFormError('');
    setTempPassword(null);
  };

  // Toggle user active status
  const toggleUserActive = async (userId: string, currentActive: boolean) => {
    // Prevent deactivating your own account
    if (userId === user?.id && currentActive) {
      setError("You cannot deactivate your own account");
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
      
      return; // Stop execution here
    }
    
    try {
      // Update the user through our API
      await userApi.updateUser(
        userId, 
        { active: !currentActive }, 
        session?.access_token || ''
      );
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? {...user, active: !currentActive} : user
      ));
      
      // If the current user is the selected user, update that too
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({
          ...selectedUser,
          active: !currentActive
        });
      }
      
      setSuccess(`User status updated successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(err.message || 'Failed to update user status. Please try again.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  return (
    <Layout>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={18} className="mr-2" />
              Add User
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

        {/* New user form */}
        {showForm && (
          <div className="overflow-hidden">
            <div 
              className={`transform transition-all duration-300 ease-out
                ${isFormClosing 
                  ? "opacity-0 -translate-y-4 pointer-events-none" 
                  : "opacity-100 translate-y-0"}`}
            >
              <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Create new user</h3>
                
                {formError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    {formError}
                  </div>
                )}
                
                {tempPassword && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 flex flex-col">
                    <div className="flex items-center mb-2">
                      <Check size={16} className="mr-2" />
                      User&nbsp;<span className="font-semibold">{newUserFullName}</span>&nbsp;created successfully!
                    </div>
                    <div className="mt-2 font-medium">
                      Temporary password: <span className="font-mono bg-white p-1 rounded border border-green-200">{tempPassword}</span>
                    </div>
                    <p className="text-xs mt-1">
                      Please securely share this with the user. They will need to change it on first login.
                    </p>
                  </div>
                )}
                
                <form onSubmit={handleCreateUser}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Email - First row, left column */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    {/* Full Name - First row, right column */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    {/* Role - Second row, left column */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'worker')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="worker">Worker</option>
                        <option value="manager" disabled={!isAdmin}>Manager</option>
                        <option value="admin" disabled={!isAdmin}>Admin</option>
                      </select>
                      {!isAdmin && role !== 'worker' && (
                        <p className="text-xs text-red-600 mt-1">
                          Only admins can create managers or admins
                        </p>
                      )}
                    </div>
                    
                    {/* Worker Type - Second row, right column (only when role is worker) */}
                    {role === 'worker' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Worker Type
                        </label>
                        <select
                          value={workerType}
                          onChange={(e) => setWorkerType(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        >
                          {workerTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {capitalizeFirstLetter(type.type_name)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div></div> // Empty div to maintain grid layout
                    )}
                    
                    {/* Auto-generate password - Third row, left column */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="generatePassword"
                          checked={generatePasswordToggle}
                          onChange={() => setGeneratePasswordToggle(!generatePasswordToggle)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="generatePassword" className="ml-2 block text-sm text-gray-700 select-none">
                          Auto-generate password
                        </label>
                      </div>
                    </div>
                    
                    {/* Password field - Third row, right column (only when auto-generate is off) */}
                    {!generatePasswordToggle && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password (min 8 characters)
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required={!generatePasswordToggle}
                          minLength={8}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {formLoading ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th 
                  className="text-left p-3 cursor-pointer hover:bg-gray-200 w-1/5"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center justify-between">
                    <span className="select-none">Name</span>
                    <span className="w-4 inline-block">
                      {sortColumn === 'fullName' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left p-3 cursor-pointer hover:bg-gray-200 w-1/4"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center justify-between">
                    <span className="select-none">In development</span>
                    <span className="w-4 inline-block">
                      {sortColumn === 'email' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left p-3 cursor-pointer hover:bg-gray-200 w-1/6"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center justify-between">
                    <span className="select-none">Role</span>
                    <span className="w-4 inline-block">
                      {sortColumn === 'role' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left p-3 cursor-pointer hover:bg-gray-200 w-1/6"
                  onClick={() => handleSort('workerType')}
                >
                  <div className="flex items-center justify-between">
                    <span className="select-none">Worker Type</span>
                    <span className="w-4 inline-block">
                      {sortColumn === 'workerType' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="text-left p-3 cursor-pointer hover:bg-gray-200 w-1/6"
                  onClick={() => handleSort('active')}
                >
                  <div className="flex items-center justify-between">
                    <span className="select-none">Status</span>
                    <span className="w-4 inline-block">
                      {sortColumn === 'active' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                getSortedUsers().map(user => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => (isAdmin || isManager) && handleUserClick(user)}
                  >
                    <td className="p-3">{user.fullName}</td>
                    <td className="p-3">
                      <span className="text-gray-400"></span>
                    </td>
                    <td className="p-3">
                      <span 
                        className={`inline-block px-2 py-1 rounded text-xs font-medium 
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {user.workerType ? capitalizeFirstLetter(user.workerType) : 'N/A'}
                    </td>
                    <td className="p-3">
                      <span 
                        className={`inline-block px-2 py-1 rounded text-xs font-medium 
                          ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* User detail modal */}
        {selectedUser && (
          <UserDetailModal 
            user={selectedUser}
            onClose={handleCloseUserDetail}
            onToggleActive={toggleUserActive}
            onResetPassword={handleResetPassword}
            resetPasswordLoading={resetPasswordLoading}
            resetPasswordSuccess={resetPasswordSuccess}
            currentUserId={user?.id || ''} // Pass the current user ID
          />
        )}
      </div>
    </Layout>
  );
};

export default UserManagementPage;