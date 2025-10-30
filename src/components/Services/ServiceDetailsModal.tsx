import React, { useEffect, useState } from 'react';
import { XMarkIcon, ClockIcon, UserGroupIcon, WrenchIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Part {
  _id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
}

interface Service {
  _id: string;
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
    partId: string | { _id: string; name: string; code: string; price: number };
    partName?: string;
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
  createdAt: string;
  updatedAt: string;
}

interface ServiceDetailsModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

const ServiceDetailsModal: React.FC<ServiceDetailsModalProps> = ({ service, isOpen, onClose }) => {
  const [partsDetails, setPartsDetails] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  useEffect(() => {
    if (isOpen && service?.commonParts && service.commonParts.length > 0) {
      fetchPartsDetails();
    }
  }, [isOpen, service]);

  const fetchPartsDetails = async () => {
    try {
      setLoadingParts(true);
      
      // If partName is already in commonParts (denormalized), use it directly
      if (service!.commonParts.some(cp => cp.partName)) {
        const details = service!.commonParts.map(cp => ({
          _id: typeof cp.partId === 'string' ? cp.partId : cp.partId._id,
          name: cp.partName || 'Unknown Part',
          code: 'N/A',
          price: 0,
          quantity: cp.quantity,
        }));
        setPartsDetails(details);
      } else {
        // Fallback: Fetch parts if names not denormalized
        const token = localStorage.getItem('token');
        const response = await fetch('/api/parts?limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const allParts = data.data || data.parts || [];
          
          // Map commonParts with their details
          const details = service!.commonParts
            .map(cp => {
              const partId = typeof cp.partId === 'string' ? cp.partId : cp.partId._id;
              const part = allParts.find((p: any) => p._id === partId);
              return {
                _id: partId,
                name: cp.partName || part?.name || 'Unknown Part',
                code: part?.code || 'N/A',
                price: part?.price || 0,
                quantity: cp.quantity,
              };
            });
          
          setPartsDetails(details);
        }
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to load parts details');
    } finally {
      setLoadingParts(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'safety': 'text-red-600 bg-dark-300',
      'preparation': 'text-lime-600 bg-dark-300',
      'execution': 'text-green-600 bg-dark-300',
      'verification': 'text-yellow-600 bg-dark-300',
      'cleanup': 'text-purple-600 bg-dark-300'
    };
    return colors[category] || 'text-text-secondary bg-dark-900';
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-300 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-300 border-b border-dark-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{service.name}</h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted bg-dark-200 text-lime-600">
                {service.code}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted bg-dark-200 text-green-600">
                {service.category}
              </span>
              {service.subcategory && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted bg-purple-100 text-purple-800">
                  {service.subcategory}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-text-secondary">{service.description}</p>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-300 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <ClockIcon className="h-5 w-5 text-lime-600" />
                <span className="text-sm text-text-secondary">Duration</span>
              </div>
              <p className="text-2xl font-bold text-lime-600">{formatDuration(service.estimatedDuration)}</p>
            </div>

            <div className="bg-dark-300 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <WrenchIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-text-secondary">Skill Level</span>
              </div>
              <p className="text-2xl font-bold text-green-600 capitalize">{service.skillLevel}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <ShieldCheckIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-text-secondary">Base Price</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatPrice(service.basePrice)}</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <UserGroupIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-text-secondary">Status</span>
              </div>
              <p className={`text-2xl font-bold ${service.isActive ? 'text-green-900' : 'text-red-900'}`}>
                {service.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>

          {/* Required Certifications */}
          {service?.requiredCertifications && service.requiredCertifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Required Certifications</h3>
              <div className="space-y-2">
                {service.requiredCertifications.map((cert, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-dark-900 rounded">
                    <div className="h-2 w-2 bg-lime-600 rounded-full"></div>
                    <span className="text-text-secondary">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {service.warranty && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Warranty</h3>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                <p className="text-text-secondary">
                  <span className="font-semibold">{service.warranty.duration} days:</span> {service.warranty.description}
                </p>
              </div>
            </div>
          )}

          {/* Service Checklist */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Service Checklist</h3>
            <div className="space-y-2">
              {service?.checklist && service.checklist.length > 0 ? (
                service.checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg flex items-start space-x-3 ${getCategoryColor(
                      item.category as any
                    )}`}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-3 w-3 rounded-full bg-current opacity-75"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-text-muted">{item.step}</p>
                        <span className="text-xs text-text-muted uppercase opacity-75">
                          {formatDuration(item.estimatedTime)}
                        </span>
                      </div>
                      {item.isRequired && (
                        <p className="text-xs mt-1 opacity-75">Required</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-text-muted">No checklist items</div>
              )}
            </div>
          </div>

          {/* Common Parts */}
          {service.commonParts && service.commonParts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Common Parts Required</h3>
              {loadingParts ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {partsDetails && partsDetails.length > 0 ? (
                    partsDetails.map((part, idx) => (
                      <div key={idx} className="bg-dark-900 p-4 rounded-lg border border-dark-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">{part.name}</p>
                            <p className="text-sm text-text-muted">{part.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">Qty: {service?.commonParts?.[idx]?.quantity || 0}</p>
                            <p className="text-sm text-text-muted">
                              {formatPrice((part.price || 0) * (service?.commonParts?.[idx]?.quantity || 0))}
                            </p>
                          </div>
                        </div>
                        {service?.commonParts?.[idx]?.isOptional && (
                          <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-text-muted">
                      No parts data available
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {service?.tags && service.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm text-text-muted bg-dark-100 text-text-secondary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dark-200 p-6 bg-dark-900">
          <button
            onClick={onClose}
            className="w-full bg-lime-600 text-black font-semibold px-4 py-2 rounded-lg hover:bg-dark-9000 hover:text-dark-900 transition-all duration-200 transform hover:scale-105 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsModal;
