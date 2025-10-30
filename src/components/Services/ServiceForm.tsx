import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Part {
  _id: string;
  name: string;
  partNumber: string;
  category: string;
  pricing: {
    retail: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
  };
}

interface Service {
  _id?: string;
  name: string;
  code: string;
  description: string;
  category: 'battery' | 'motor' | 'charging' | 'electronics' | 'body' | 'general' | 'diagnostic';
  subcategory?: string;
  basePrice: number;
  estimatedDuration: number;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  requiredCertifications: string[];
  requiredTools: Array<{
    name: string;
    isRequired: boolean;
  }>;
  checklist: Array<{
    step: string;
    category: 'safety' | 'preparation' | 'execution' | 'verification' | 'cleanup';
    isRequired: boolean;
    estimatedTime: number;
  }>;
  commonParts: Array<{
    partId: string;
    quantity: number;
    isOptional: boolean;
  }>;
  warranty?: {
    duration: number;
    description: string;
  };
  isActive: boolean;
  applicableVehicles?: {
    makes: string[];
    models: string[];
    years: {
      min: number;
      max: number;
    };
    batteryTypes: string[];
  };
  seasonality?: {
    peak: string[];
    low: string[];
  };
  tags: string[];
}

interface ServiceFormProps {
  service?: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ service, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<Array<{
    partId: string;
    quantity: number;
    isOptional: boolean;
  }>>([]);
  
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    code: '',
    category: 'general',
    subcategory: '',
    basePrice: 0,
    estimatedDuration: 60,
    description: '',
    skillLevel: 'basic',
    requiredCertifications: [],
    requiredTools: [],
    checklist: [],
    isActive: true,
    tags: [],
    warranty: undefined,
    applicableVehicles: undefined,
    seasonality: undefined
  });

  const serviceCategories = ['battery', 'motor', 'charging', 'electronics', 'body', 'general', 'diagnostic'];
  const skillLevels = ['basic', 'intermediate', 'advanced', 'expert'];

  useEffect(() => {
    if (isOpen) {
      fetchParts();
      if (service?.commonParts) {
        setSelectedParts(service.commonParts);
      }
    }
  }, [isOpen, service]);

  // Update form data when service changes
  useEffect(() => {
    console.log('Service changed:', service); // Debug log
    setFormData({
      name: service?.name || '',
      code: service?.code || '',
      category: service?.category || 'general',
      subcategory: service?.subcategory || '',
      basePrice: service?.basePrice || 0,
      estimatedDuration: service?.estimatedDuration || 60,
      description: service?.description || '',
      skillLevel: service?.skillLevel || 'basic',
      requiredCertifications: service?.requiredCertifications || [],
      requiredTools: service?.requiredTools || [],
      checklist: service?.checklist || [],
      isActive: service?.isActive !== undefined ? service.isActive : true,
      tags: service?.tags || [],
      warranty: service?.warranty || undefined,
      applicableVehicles: service?.applicableVehicles || undefined,
      seasonality: service?.seasonality || undefined
    });
    
    if (service?.commonParts) {
      setSelectedParts(service.commonParts);
    } else {
      setSelectedParts([]);
    }
  }, [service]);

  const fetchParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parts?isActive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.category || !formData.basePrice || !formData.estimatedDuration) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        commonParts: selectedParts.map(part => ({
          partId: part.partId,
          quantity: part.quantity,
          isOptional: part.isOptional
        }))
      };

      const url = service?._id ? `/api/services/${service._id}` : '/api/services';
      const method = service?._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        toast.success(service?._id ? 'Service updated successfully' : 'Service created successfully');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save service');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const addPartToService = (partId: string) => {
    if (!selectedParts.find(p => p.partId === partId)) {
      setSelectedParts(prev => [...prev, {
        partId,
        quantity: 1,
        isOptional: false
      }]);
    }
  };

  const removePartFromService = (partId: string) => {
    setSelectedParts(prev => prev.filter(p => p.partId !== partId));
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    setSelectedParts(prev => prev.map(p => 
      p.partId === partId ? { ...p, quantity } : p
    ));
  };

  const updatePartOptional = (partId: string, isOptional: boolean) => {
    setSelectedParts(prev => prev.map(p => 
      p.partId === partId ? { ...p, isOptional } : p
    ));
  };

  const getPartById = (partId: string) => {
    return parts.find(p => p._id === partId);
  };

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-dark-300 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg text-text-muted leading-6 text-white">
                    {service?._id ? 'Edit Service' : 'Add New Service'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-text-muted hover:text-text-secondary"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Service Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                        placeholder="e.g., SV001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Category *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      >
                        {serviceCategories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        value={formData.subcategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Base Price (VND) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.basePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Estimated Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        required
                        min="15"
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 60 }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Skill Level *
                      </label>
                      <select
                        required
                        value={formData.skillLevel}
                        onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      >
                        {skillLevels.map(level => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-dark-300 text-lime-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-lime-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-text-muted text-text-secondary">Active Service</span>
                      </label>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-text-muted text-text-secondary mb-2">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                    />
                  </div>

                  {/* Parts Required */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg text-text-muted text-white mb-4">Parts Required</h4>
                    
                    {/* Add Parts */}
                    <div className="mb-4">
                      <label className="block text-sm text-text-muted text-text-secondary mb-2">
                        Add Parts
                      </label>
                      <select
                        onChange={(e) => e.target.value && addPartToService(e.target.value)}
                        value=""
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:ring-lime-400 focus:border-lime-400"
                      >
                        <option value="">Select a part to add</option>
                        {parts
                          .filter(part => !selectedParts.find(sp => sp.partId === part._id))
                          .map(part => (
                            <option key={part._id} value={part._id}>
                              {part.name} ({part.partNumber}) - Stock: {part.inventory.currentStock}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Selected Parts */}
                    {selectedParts.length > 0 && (
                      <div className="space-y-3">
                        {selectedParts.map((selectedPart) => {
                          const part = getPartById(selectedPart.partId);
                          return (
                            <div key={selectedPart.partId} className="flex items-center space-x-4 p-3 bg-dark-900 rounded-md">
                              <div className="flex-1">
                                <p className="text-text-muted">{part?.name || 'Unknown Part'}</p>
                                <p className="text-sm text-text-muted">{part?.partNumber}</p>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <label className="text-sm">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={selectedPart.quantity}
                                  onChange={(e) => updatePartQuantity(selectedPart.partId, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 border border-dark-300 rounded"
                                />
                              </div>

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedPart.isOptional}
                                  onChange={(e) => updatePartOptional(selectedPart.partId, e.target.checked)}
                                  className="rounded bg-dark-300 text-white border-dark-300 text-lime-600 focus:ring-lime-400"
                                />
                                <span className="ml-2 text-sm">Optional</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => removePartFromService(selectedPart.partId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status Flags */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg text-text-muted text-white mb-4">Status</h4>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded bg-dark-300 text-white border-dark-300 text-lime-600 focus:ring-lime-400"
                        />
                        <span className="ml-2 text-sm text-text-secondary">Active</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-text-muted text-text-secondary bg-dark-300 border border-dark-200 rounded-md hover:bg-dark-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm text-dark-900 bg-lime-600 border border-transparent rounded-md hover:bg-dark-9000 hover:text-dark-900 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (service?._id ? 'Update Service' : 'Create Service')}
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

export default ServiceForm;
