// src/components/Assemblies/QualityControlImages.tsx
import React, { useState, useEffect } from 'react';
import { Trash2, Download, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatFileSize } from '../../utils/formatters';

interface QCImage {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  image_url: string;
  notes?: string;
  qc_status?: string;
  created_by_info: {
    name: string;
    email: string;
  };
}

interface QualityControlImagesProps {
  assemblyId: string;
}

const QualityControlImages: React.FC<QualityControlImagesProps> = ({ assemblyId }) => {
  const [images, setImages] = useState<QCImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<QCImage | null>(null);
  const { user } = useAuth();
  const isAdminOrManager = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'manager';

  useEffect(() => {
    const fetchQCImages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assemblies/${assemblyId}/qc-images`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch QC images');
        }

        const data = await response.json();
        setImages(data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching QC images:', err);
        setError('Failed to load quality control images');
      } finally {
        setLoading(false);
      }
    };

    if (assemblyId) {
      fetchQCImages();
    }
  }, [assemblyId]);

  const handleDeleteImage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/assemblies/qc-images/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Remove the deleted image from state
      setImages(images.filter(img => img.id !== id));
      
      // Close image preview if the deleted image was selected
      if (selectedImage?.id === id) {
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error deleting QC image:', err);
      setError('Failed to delete image');
    }
  };

  const handleImageClick = (image: QCImage) => {
    setSelectedImage(image);
  };

  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
        <Info size={18} className="mr-2 text-gray-500" />
        Quality Control Images
      </h3>
      
      {images.length === 0 ? (
        <div className="bg-gray-50 rounded-md p-6 text-center">
          <p className="text-gray-500">No quality control images available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map(image => (
            <div key={image.id} className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
              <div 
                className="h-24 bg-gray-100 cursor-pointer overflow-hidden" 
                onClick={() => handleImageClick(image)}
              >
                <img 
                  src={image.image_url} 
                  alt={image.file_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-500 truncate" title={image.file_name}>
                  {image.file_name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(image.created_at)}
                </p>
                {image.qc_status && (
                  <p className="text-xs bg-blue-50 text-blue-700 rounded px-1 py-0.5 mt-1 inline-block">
                    {image.qc_status}
                  </p>
                )}
                {isAdminOrManager && (
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="mt-1 p-1 text-red-500 hover:bg-red-50 rounded float-right"
                    title="Delete image"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeImagePreview}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">{selectedImage.file_name}</h3>
              <button onClick={closeImagePreview} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <div className="mb-4">
                <img 
                  src={selectedImage.image_url} 
                  alt={selectedImage.file_name}
                  className="max-w-full max-h-[60vh] mx-auto"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Uploaded by</p>
                    <p>{selectedImage.created_by_info.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p>{formatDate(selectedImage.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">File size</p>
                    <p>{formatFileSize(selectedImage.file_size)}</p>
                  </div>
                  {selectedImage.qc_status && (
                    <div>
                      <p className="text-gray-500">QC Status</p>
                      <p>{selectedImage.qc_status}</p>
                    </div>
                  )}
                </div>
                {selectedImage.notes && (
                  <div className="mt-4">
                    <p className="text-gray-500">Notes</p>
                    <p className="mt-1 bg-white p-2 rounded border border-gray-200">{selectedImage.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <a
                href={selectedImage.image_url}
                download={selectedImage.file_name}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Download size={16} className="mr-2" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlImages;