// src/pages/Assemblies/EditAssemblyPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssemblyForm from '../../components/Assemblies/AssemblyForm';
import { Assembly, assembliesApi } from '../../lib/projectsApi';

const EditAssemblyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssembly = async () => {
      if (!id) {
        navigate('/dashboard/assemblies');
        return;
      }

      try {
        setLoading(true);
        const data = await assembliesApi.getAssembly(id);
        setAssembly(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assembly:', err);
        setError('Failed to load assembly. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssembly();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="ml-2 text-gray-600">Loading assembly...</p>
      </div>
    );
  }

  if (error || !assembly) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error || 'Assembly not found'}</p>
          <button
            onClick={() => navigate('/dashboard/assemblies')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Assemblies
          </button>
        </div>
      </div>
    );
  }

  return <AssemblyForm initialData={assembly} isEditing={true} />;
};

export default EditAssemblyPage;