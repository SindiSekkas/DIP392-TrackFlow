// src/Web_part/FrontEnd/src/pages/Logistics/EditLogisticsBatchPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LogisticsBatchForm from '../../components/Logistics/LogisticsBatchForm';
import { LogisticsBatch, logisticsApi } from '../../lib/logisticsApi';

const EditLogisticsBatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<LogisticsBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatch = async () => {
      if (!id) {
        navigate('/dashboard/logistics');
        return;
      }

      try {
        setLoading(true);
        const data = await logisticsApi.getBatch(id);
        setBatch(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching logistics batch:', err);
        setError('Failed to load logistics batch. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading logistics batch...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Logistics batch not found'}</p>
          <button
            onClick={() => navigate('/dashboard/logistics')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Logistics
          </button>
        </div>
      </div>
    );
  }

  return <LogisticsBatchForm initialData={batch} isEditing={true} />;
};

export default EditLogisticsBatchPage;