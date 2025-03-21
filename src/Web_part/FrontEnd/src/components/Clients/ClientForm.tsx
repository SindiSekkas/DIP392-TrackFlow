// src/components/Clients/ClientForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, clientsApi } from '../../lib/clientsApi';
import { AlertCircle } from 'lucide-react';

interface ClientFormProps {
  initialData?: Client;
  isEditing?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ 
  initialData, 
  isEditing = false 
}) => {
  const navigate = useNavigate();

  // Initialize form state
  const [formData, setFormData] = useState<Client>(
    initialData || {
      company_name: '',
      registration_code: '',
      vat_code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.company_name || !formData.registration_code) {
        setError('Company name and registration code are required.');
        setLoading(false);
        return;
      }
      
      // Create or update client
      if (isEditing && initialData?.id) {
        await clientsApi.updateClient(initialData.id, formData);
      } else {
        await clientsApi.createClient(formData);
      }
      
      // Navigate back to clients list
      navigate('/dashboard/clients');
      
    } catch (err: any) {
      console.error('Error saving client:', err);
      
      // Handle specific validation errors
      if (err.code === '23505') { // PostgreSQL unique constraint violation
        if (err.message.includes('company_name')) {
          setError('A client with this company name already exists.');
        } else if (err.message.includes('registration_code')) {
          setError('A client with this registration code already exists.');
        } else if (err.message.includes('vat_code')) {
          setError('A client with this VAT code already exists.');
        } else {
          setError('This client already exists in the system.');
        }
      } else {
        setError(err.message || 'Failed to save client. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Client' : 'Create New Client'}
      </h2>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded bg-red-50 text-red-700 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Registration Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Code *
            </label>
            <input
              type="text"
              name="registration_code"
              value={formData.registration_code}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* VAT Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT Code
            </label>
            <input
              type="text"
              name="vat_code"
              value={formData.vat_code || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Address */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/clients')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;