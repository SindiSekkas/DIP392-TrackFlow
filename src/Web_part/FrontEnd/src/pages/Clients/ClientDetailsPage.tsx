// src/pages/Clients/ClientDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Building,
  Hash,
  Plus
} from 'lucide-react';
import { Client, clientsApi } from '../../lib/clientsApi';
import { Project, projectsApi } from '../../lib/projectsApi';

const ClientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) {
        navigate('/dashboard/clients');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch client
        const clientData = await clientsApi.getClient(id);
        setClient(clientData);
        
        // Fetch related projects
        const projectsData = await projectsApi.getProjects();
        // Filter projects related to this client
        // Note: Once the database schema is updated to use client_id, this should be changed
        const filteredProjects = projectsData.filter(
          project => project.client === clientData.company_name
        );
        setRelatedProjects(filteredProjects);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching client data:', err);
        setError('Failed to load client. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [id, navigate]);

  const handleDeleteClient = async () => {
    if (!client?.id || !window.confirm('Are you sure you want to delete this client?')) {
      return;
    }
    
    try {
      // Check if client has related projects
      if (relatedProjects.length > 0) {
        setError('Cannot delete client that is associated with projects');
        return;
      }
      
      await clientsApi.deleteClient(client.id);
      navigate('/dashboard/clients');
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError('Failed to delete client. Please try again.');
    }
  };

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-160px)]">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{client.company_name}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/dashboard/clients/${client.id}/edit`)}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Edit Client"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={handleDeleteClient}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete Client"
            disabled={relatedProjects.length > 0}
          >
            <Trash2 size={20} className={relatedProjects.length > 0 ? 'opacity-50' : ''} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* Company Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <Building size={18} className="mr-2 text-gray-500" />
            Company Information
          </h3>
          
          <div className="bg-gray-50 rounded border border-gray-200 p-4 space-y-4">
            <div className="flex items-start">
              <Hash className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Registration Code</p>
                <p className="font-medium text-gray-800">{client.registration_code}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Hash className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">VAT Code</p>
                <p className="font-medium text-gray-800">{client.vat_code || '—'}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="font-medium text-gray-800">{client.contact_person || '—'}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-800">{client.email || '—'}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-800">{client.phone || '—'}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-800">{client.address || '—'}</p>
              </div>
            </div>
            
            {client.notes && (
              <div className="flex items-start pt-2 border-t border-gray-200">
                <FileText className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="text-gray-800 whitespace-pre-line">{client.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Related Projects */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FileText size={18} className="mr-2 text-gray-500" />
            Related Projects
          </h3>
          
          <div className="bg-gray-50 rounded border border-gray-200 p-4">
            {relatedProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No projects associated with this client.</p>
                <Link
                  to={`/dashboard/projects/create`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} className="mr-2 text-white" />
                  <span className="text-white">Create New Project</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {relatedProjects.map(project => (
                  <Link
                    key={project.id}
                    to={`/dashboard/projects/${project.id}`}
                    className="block p-3 bg-white rounded border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-blue-600">{project.name}</p>
                        <p className="text-sm text-gray-500">#{project.internal_number}</p>
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            project.status === 'Planning'
                              ? 'bg-blue-100 text-blue-800'
                              : project.status === 'In Production'
                              ? 'bg-yellow-100 text-yellow-800'
                              : project.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsPage;