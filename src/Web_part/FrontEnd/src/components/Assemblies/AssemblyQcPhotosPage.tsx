// src/components/Assemblies/AssemblyQcPhotosPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Trash2, 
  Download, 
  Image as ImageIcon,
  X,
  Eye
} from 'lucide-react';
import { QCImage, assembliesApi } from '../../lib/projectsApi';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const AssemblyQcPhotosPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [images, setImages] = useState<QCImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<QCImage | null>(null);
  const [assemblyName, setAssemblyName] = useState<string>('');

  useEffect(() => {
    const fetchImages = async () => {
      if (!id) {
        navigate('/dashboard/assemblies');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch assembly details to get the name
        const assembly = await assembliesApi.getAssembly(id);
        setAssemblyName(assembly.name);
        
        // Fetch QC images
        const imagesData = await assembliesApi.getQCImages(id);
        setImages(imagesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching QC images:', err);
        setError('Failed to load QC images. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [id, navigate]);

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      await assembliesApi.deleteQCImage(imageId);
      setImages(images.filter(image => image.id !== imageId));
      
      // If the deleted image was the selected one, close the modal
      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error deleting QC image:', err);
      alert('Failed to delete image. Please try again.');
    }
  };

  // Check if user has admin or manager role for permission to delete
  const hasDeletePermission = () => {
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
    return userRole === 'admin' || userRole === 'manager';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[calc(100vh-120px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(`/dashboard/assemblies/${id}`)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Quality Control Images
            </h2>
            <p className="text-gray-500">
              {assemblyName ? `Assembly: ${assemblyName}` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="ml-2 text-gray-600">Loading images...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-red-50 rounded-md">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate(`/dashboard/assemblies/${id}`)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Assembly
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-10">
          <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No quality control images found for this assembly.</p>
          <Link
            to={`/dashboard/assemblies/${id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Assembly
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div 
                className="h-48 bg-gray-100 cursor-pointer relative group"
                onClick={() => setSelectedImage(image)}
              >
                <img 
                  src={image.image_url}
                  alt={`QC image ${image.file_name}`}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:blur-[3px]"
                />
                {image.qc_status && (
                  <div className="absolute top-2 right-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium shadow-sm ${
                      image.qc_status === 'Passed'
                        ? 'bg-green-100 text-green-800'
                        : image.qc_status === 'Failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {image.qc_status}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white p-2 rounded-full shadow-md">
                    <Eye size={20} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-700 truncate" title={image.file_name}>
                  {image.file_name}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(image.created_at as string)}
                  </div>
                  {hasDeletePermission() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id as string);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete image"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-800/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full max-w-4xl bg-white rounded-lg overflow-hidden shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium truncate">
                {selectedImage.file_name}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col md:flex-row">
              <div className="md:w-2/3">
                <img 
                  src={selectedImage.image_url}
                  alt={selectedImage.file_name}
                  className="w-full h-auto max-h-[70vh] object-contain bg-gray-100 rounded"
                />
              </div>
              <div className="md:w-1/3 md:pl-4 mt-4 md:mt-0">
                <div className="bg-gray-50 p-4 rounded">
                  {selectedImage.qc_status && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700">QC Status</p>
                      <p className="mt-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          selectedImage.qc_status === 'Passed'
                            ? 'bg-green-100 text-green-800'
                            : selectedImage.qc_status === 'Failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedImage.qc_status}
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {selectedImage.notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700">Notes</p>
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-line bg-white p-2 rounded border border-gray-200">
                        {selectedImage.notes}
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">File Details</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Size: {formatFileSize(selectedImage.file_size)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Type: {selectedImage.content_type}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">Created by</p>
                    <div className="mt-1 flex items-center">
                      <User size={16} className="mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {selectedImage.created_by_info?.name || 'Unknown User'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(selectedImage.created_at as string)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <a
                      href={selectedImage.image_url}
                      download={selectedImage.file_name}
                      className="flex items-center px-3 py-1 bg-blue-600 text-white rounded transition-none"
                    >
                      <Download size={16} className="mr-1 text-white" />
                      <span className="text-white">Download</span>
                    </a>
                    {hasDeletePermission() && (
                      <button
                        onClick={() => handleDeleteImage(selectedImage.id as string)}
                        className="flex items-center px-3 py-1 bg-red-600 text-white rounded transition-none"
                      >
                        <Trash2 size={16} className="mr-1 text-white" />
                        <span className="text-white">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssemblyQcPhotosPage;