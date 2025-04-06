// src/pages/Clients/EditClientPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientForm from '../../components/Clients/ClientForm';
import { Client, clientsApi } from '../../lib/clientsApi';

const EditClientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        navigate('/dashboard/clients');
        return;
      }

      try {
        setLoading(true);
        const data = await clientsApi.getClient(id);
        setClient(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching client:', err);
        setError('Failed to load client. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading client...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Client not found'}</p>
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Clients
          </button>
        </div>
      </div>
    );
  }

  return <ClientForm initialData={client} isEditing={true} />;
};

export default EditClientPage;