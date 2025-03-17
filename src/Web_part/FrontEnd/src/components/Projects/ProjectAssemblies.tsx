// src/components/Projects/ProjectAssemblies.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Assembly, assembliesApi } from '../../lib/projectsApi';
import { formatWeight } from '../../utils/formatters';

interface ProjectAssembliesProps {
  projectId: string;
}

const ProjectAssemblies: React.FC<ProjectAssembliesProps> = ({ projectId }) => {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch project assemblies
  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        setLoading(true);
        const data = await assembliesApi.getAssembliesByProject(projectId);
        setAssemblies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assemblies:', err);
        setError('Failed to load assemblies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchAssemblies();
    }
  }, [projectId]);

  // Delete an assembly
  const handleDeleteAssembly = async (assemblyId: string) => {
    if (!window.confirm('Are you sure you want to delete this assembly?')) {
      return;
    }
    
    try {
      await assembliesApi.deleteAssembly(assemblyId);
      setAssemblies(assemblies.filter(assembly => assembly.id !== assemblyId));
    } catch (err) {
      console.error('Error deleting assembly:', err);
      setError('Failed to delete assembly. Please try again.');
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-gray-800">Assemblies</h3>
        <Link
          to={`/dashboard/assemblies/create?projectId=${projectId}`}
          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={16} className="mr-1 text-white" />
          <span className="text-white">Add Assembly</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent mb-2"></div>
          <p className="text-gray-500">Loading assemblies...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : assemblies.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-md text-center">
          <p className="text-gray-500 mb-4">No assemblies added to this project yet.</p>
          <Link
            to={`/dashboard/assemblies/create?projectId=${projectId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2 text-white" />
            <span className="text-white">Add First Assembly</span>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden border border-gray-200">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Weight</th>
                <th className="text-left p-3">Quantity</th>
                <th className="text-left p-3">Status</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assemblies.map((assembly) => (
                <tr key={assembly.id} className="hover:bg-gray-50">
                  <td className="p-3">{assembly.name}</td>
                  <td className="p-3">{formatWeight(assembly.weight)}</td>
                  <td className="p-3">{assembly.quantity}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        assembly.status === 'Waiting'
                          ? 'bg-blue-100 text-blue-800'
                          : assembly.status === 'In Production'
                          ? 'bg-yellow-100 text-yellow-800'
                          : assembly.status === 'Welding'
                          ? 'bg-orange-100 text-orange-800'
                          : assembly.status === 'Painting'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {assembly.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/assemblies/${assembly.id}`, { state: { from: 'project' } })}
                        title="View"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/assemblies/${assembly.id}/edit`)}
                        title="Edit"
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Edit size={16} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssembly(assembly.id as string)}
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

export default ProjectAssemblies;