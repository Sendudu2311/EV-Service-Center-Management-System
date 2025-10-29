import React, { useState, useRef } from 'react';
import { PhotoIcon, PlusIcon } from '@heroicons/react/24/outline';
import { vehiclesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface VehicleImage {
  url: string;
  description: string;
  uploadDate: string;
}

interface VehicleImageGalleryProps {
  vehicleId: string;
  images: VehicleImage[];
  onImagesUpdated: () => void;
  canUpload?: boolean;
}

const VehicleImageGallery: React.FC<VehicleImageGalleryProps> = ({
  vehicleId,
  images,
  onImagesUpdated,
  canUpload = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('description', `Vehicle image - ${file.name}`);

      await vehiclesAPI.addImage(vehicleId, formData);
      toast.success('Image uploaded successfully');
      onImagesUpdated();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-8">
        <PhotoIcon className="mx-auto h-12 w-12 text-text-muted" />
        <h3 className="mt-2 text-sm text-text-muted text-white">No images</h3>
        <p className="mt-1 text-sm text-text-muted">
          {canUpload ? 'Get started by uploading an image.' : 'No images available for this vehicle.'}
        </p>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 text-text-muted rounded-md text-white bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {uploading ? 'Uploading...' : 'Add Image'}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canUpload && (
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            {uploading ? 'Uploading...' : 'Add Image'}
          </button>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group cursor-pointer">
            <img
              src={image.url}
              alt={image.description || `Vehicle image ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border border-dark-300 shadow-sm hover:shadow-md transition-shadow"
              onClick={() => openImageModal(image.url)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="truncate">{image.description || 'Vehicle image'}</p>
              <p className="text-text-secondary">
                {new Date(image.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={selectedImage}
              alt="Vehicle image"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:text-text-secondary"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleImageGallery;
