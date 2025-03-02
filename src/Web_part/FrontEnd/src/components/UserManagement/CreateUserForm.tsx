// src/components/UserManagement/CreateUserForm.tsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { generateRandomPassword } from '../../utils/passwordUtils';

const workerTypes = [
  { id: 'engineer', name: 'Engineer' },
  { id: 'welder', name: 'Welder' },
  { id: 'assembler', name: 'Assembler' },
  { id: 'painter', name: 'Painter' },
  { id: 'logistics', name: 'Logistics' }
];

interface CreateUserFormProps {
  onSuccess?: () => void;
}

const CreateUserForm = ({ onSuccess }: CreateUserFormProps) => {
  const { createUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'worker',
    workerType: 'engineer',
    generatePassword: true, // New option to toggle password generation
    password: '', // Field for custom password
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTempPassword(null);

    try {
      // Determine password to use (either auto-generated or user-provided)
      const password = formData.generatePassword 
        ? generateRandomPassword() 
        : formData.password;

      // Only validate password if user is providing one
      if (!formData.generatePassword && formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }

      // Prepare user metadata based on role
      const userMetadata: any = {
        full_name: formData.fullName,
        role: formData.role
      };

      // Add worker type only if role is worker
      if (formData.role === 'worker') {
        userMetadata.worker_type = formData.workerType;
      }

      // Create the user
      const result = await createUser(
        formData.email, 
        formData.generatePassword ? password : formData.password,
        userMetadata
      );
      
      setSuccess(`User ${formData.fullName} created successfully!`);
      
      // Show the temporary password only if it was auto-generated
      if (formData.generatePassword && result?.temporaryPassword) {
        setTempPassword(result.temporaryPassword);
      }
      
      // Reset form
      setFormData({
        email: '',
        fullName: '',
        role: 'worker',
        workerType: 'engineer',
        generatePassword: true,
        password: ''
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Create New User</h2>

      {error && (
        <div className="mb-4 p-4 rounded bg-red-50 text-red-700" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded bg-green-50 text-green-700" role="alert">
          <p className="font-bold">{success}</p>
          {tempPassword && (
            <div className="mt-2">
              <p>Temporary password: <span className="font-mono bg-gray-100 p-1 rounded">{tempPassword}</span></p>
              <p className="text-sm mt-1">
                Please securely share this with the user. They will need to change it on first login.
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="worker">Worker</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {formData.role === 'worker' && (
          <div>
            <label htmlFor="workerType" className="block text-sm font-medium text-gray-700">
              Worker Type
            </label>
            <select
              id="workerType"
              name="workerType"
              value={formData.workerType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {workerTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Password options */}
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="generatePassword"
              name="generatePassword"
              checked={formData.generatePassword}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="generatePassword" className="ml-2 block text-sm text-gray-700">
              Auto-generate secure password
            </label>
          </div>

          {!formData.generatePassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password (min 8 characters)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!formData.generatePassword}
                minLength={8}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="pt-2 flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: '',
                fullName: '',
                role: 'worker',
                workerType: 'engineer',
                generatePassword: true,
                password: ''
              });
              setError(null);
              setSuccess(null);
              setTempPassword(null);
              if (onSuccess) onSuccess();
            }}
            className="w-1/2 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;