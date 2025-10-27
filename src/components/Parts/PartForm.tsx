import React, { useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Part {
  _id?: string;
  name: string;
  partNumber: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  model?: string;
  specifications?: any;
  compatibility?: {
    makes: string[];
    models: string[];
    years: { min: number; max: number };
    batteryTypes: string[];
  };
  pricing: {
    cost: number;
    retail: number;
    wholesale?: number;
    currency: string;
  };
  supplierInfo?: {
    name: string;
    contact: string;
    notes?: string;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    usedStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    reorderPoint: number;
    averageUsage: number;
  };
  leadTime?: number;
  warranty?: {
    duration: number;
    type: string;
    description: string;
  };
  isRecommended: boolean;
  isActive: boolean;
  isDiscontinued: boolean;
  tags: string[];
  images?: Array<{
    url: string;
    publicId: string;
    originalName: string;
  }>;
}

interface PartFormProps {
  part?: Part | null;
  isOpen: boolean;
  onClose: () => void;
}

const PartForm: React.FC<PartFormProps> = ({ part, isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<Part>>({
    name: '',
    partNumber: '',
    description: '',
    category: 'battery',
    subcategory: '',
    brand: '',
    model: '',
    pricing: {
      cost: 0,
      retail: 0,
      wholesale: 0,
      currency: 'VND'
    },
    supplierInfo: {
      name: '',
      contact: '',
      notes: ''
    },
    inventory: {
      currentStock: 0,
      reservedStock: 0,
      usedStock: 0,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      averageUsage: 0
    },
    compatibility: {
      makes: [],
      models: [],
      years: { min: 2020, max: 2025 },
      batteryTypes: []
    },
    leadTime: 7,
    warranty: {
      duration: 12,
      type: 'limited',
      description: ''
    },
    isRecommended: false,
    isActive: true,
    isDiscontinued: false,
    tags: []
  });

  // Update form data when part prop changes
  useEffect(() => {
    console.log('Part changed:', part); // Debug log
    setFormData({
      name: part?.name || '',
      partNumber: part?.partNumber || '',
      description: part?.description || '',
      category: part?.category || 'battery',
      subcategory: part?.subcategory || '',
      brand: part?.brand || '',
      model: part?.model || '',
      pricing: {
        cost: part?.pricing?.cost || 0,
        retail: part?.pricing?.retail || 0,
        wholesale: part?.pricing?.wholesale || 0,
        currency: part?.pricing?.currency || 'VND'
      },
      supplierInfo: {
        name: part?.supplierInfo?.name || '',
        contact: part?.supplierInfo?.contact || '',
        notes: part?.supplierInfo?.notes || ''
      },
      inventory: {
        currentStock: part?.inventory?.currentStock || 0,
        reservedStock: part?.inventory?.reservedStock || 0,
        usedStock: part?.inventory?.usedStock || 0,
        minStockLevel: part?.inventory?.minStockLevel || 10,
        maxStockLevel: part?.inventory?.maxStockLevel || 100,
        reorderPoint: part?.inventory?.reorderPoint || 20,
        averageUsage: part?.inventory?.averageUsage || 0
      },
      compatibility: {
        makes: part?.compatibility?.makes || [],
        models: part?.compatibility?.models || [],
        years: part?.compatibility?.years || { min: 2020, max: 2025 },
        batteryTypes: part?.compatibility?.batteryTypes || []
      },
      leadTime: part?.leadTime || 7,
      warranty: {
        duration: part?.warranty?.duration || 12,
        type: part?.warranty?.type || 'limited',
        description: part?.warranty?.description || ''
      },
      isRecommended: part?.isRecommended || false,
      isActive: part?.isActive !== undefined ? part.isActive : true,
      isDiscontinued: part?.isDiscontinued || false,
      tags: part?.tags || []
    });
  }, [part]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(newImages);
    setPreviewUrls(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.partNumber || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submitFormData = new FormData();

      // Append form data
      Object.keys(formData).forEach(key => {
        const value = formData[key as keyof Part];
        if (typeof value === 'object' && value !== null) {
          submitFormData.append(key, JSON.stringify(value));
        } else {
          submitFormData.append(key, String(value));
        }
      });

      // Append images
      selectedImages.forEach(image => {
        submitFormData.append('images', image);
      });

      const url = part?._id ? `/api/parts/${part._id}` : '/api/parts';
      const method = part?._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitFormData
      });

      if (response.ok) {
        toast.success(part?._id ? 'Part updated successfully' : 'Part created successfully');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save part');
      }
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error('Failed to save part');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Battery', 'Motor', 'Electronics', 'Charging', 'Body', 'Interior', 'Tires', 'Fluids'
  ];

  const batteryTypes = [
    'Lithium-ion', 'LiFePO4', 'NiMH', 'Lead-acid'
  ];

  const evMakes = [
    'Tesla', 'BYD', 'VinFast', 'BMW', 'Mercedes-EQS', 'Audi', 'Hyundai', 'Kia', 'Nissan', 'Chevrolet'
  ];

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {part?._id ? 'Edit Part' : 'Add New Part'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Part Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Part Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.partNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cost Price (VND)
                        </label>
                        <input
                          type="number"
                          value={formData.pricing?.cost}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            pricing: { ...prev.pricing!, cost: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Retail Price (VND)
                        </label>
                        <input
                          type="number"
                          value={formData.pricing?.retail}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            pricing: { ...prev.pricing!, retail: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wholesale Price (VND)
                        </label>
                        <input
                          type="number"
                          value={formData.pricing?.wholesale}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            pricing: { ...prev.pricing!, wholesale: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Inventory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Stock
                        </label>
                        <input
                          type="number"
                          value={formData.inventory?.currentStock}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            inventory: { ...prev.inventory!, currentStock: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Stock Level
                        </label>
                        <input
                          type="number"
                          value={formData.inventory?.minStockLevel}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            inventory: { ...prev.inventory!, minStockLevel: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reorder Point
                        </label>
                        <input
                          type="number"
                          value={formData.inventory?.reorderPoint}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            inventory: { ...prev.inventory!, reorderPoint: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Warranty */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Warranty</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (months)
                        </label>
                        <input
                          type="number"
                          value={formData.warranty?.duration}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            warranty: { ...prev.warranty!, duration: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type *
                        </label>
                        <select
                          required
                          value={formData.warranty?.type}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            warranty: { ...prev.warranty!, type: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="manufacturer">Manufacturer</option>
                          <option value="supplier">Supplier</option>
                          <option value="service_center">Service Center</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          value={formData.warranty?.description}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            warranty: { ...prev.warranty!, description: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Images</h4>
                    
                    <div className="mb-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <PhotoIcon className="h-5 w-5 mr-2" />
                        Upload Images
                      </button>
                    </div>

                    {/* Image Previews */}
                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Flags */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Status</h4>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isRecommended}
                          onChange={(e) => setFormData(prev => ({ ...prev, isRecommended: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Recommended</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isDiscontinued}
                          onChange={(e) => setFormData(prev => ({ ...prev, isDiscontinued: e.target.checked }))}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Discontinued</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (part?._id ? 'Update Part' : 'Create Part')}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PartForm;