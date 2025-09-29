import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  CubeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Part {
  _id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  pricing: {
    cost: number;
    retail: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    minStockLevel: number;
  };
  compatibility: {
    makes: string[];
    models: string[];
    years: {
      min: number;
      max: number;
    };
  };
  isRecommended: boolean;
}

interface ReservedPart {
  partId: string;
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  reservedAt: string;
}

interface WorkflowInfo {
  appointmentStatus: string;
  canReserveParts: boolean;
  canModifyParts: boolean;
  isAssignedTechnician: boolean;
  restrictions: {
    message: string;
  };
}

interface SelectedPart {
  partId: string;
  quantity: number;
}

interface PartsSelectionProps {
  appointmentId: string;
  serviceCategories: string[];
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
  };
  disabled?: boolean;
  mode: 'reserve' | 'use'; // reserve for selecting parts, use for marking as used
}

const PartsSelection: React.FC<PartsSelectionProps> = ({
  appointmentId,
  serviceCategories,
  vehicleInfo,
  disabled = false,
  mode = 'reserve'
}) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [reservedParts, setReservedParts] = useState<ReservedPart[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReservedParts();
    if (serviceCategories.length > 0) {
      fetchPartsByCategory();
    }
  }, [appointmentId, serviceCategories]);

  const fetchReservedParts = async () => {
    try {
      const response = await axios.get(`/api/parts/appointment/${appointmentId}`);
      if (response.data.success) {
        setReservedParts(response.data.data);
        setWorkflowInfo(response.data.workflowInfo);
        
        // Initialize selectedParts for 'use' mode with reserved quantities
        if (mode === 'use') {
          setSelectedParts(
            response.data.data.map((part: ReservedPart) => ({
              partId: part.partId,
              quantity: part.quantity
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching reserved parts:', error);
      toast.error('Failed to load parts information');
    }
  };

  const fetchPartsByCategory = async () => {
    if (activeCategory === 'all') return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleInfo) {
        params.append('vehicleMake', vehicleInfo.make);
        params.append('vehicleModel', vehicleInfo.model);
        params.append('vehicleYear', vehicleInfo.year.toString());
      }

      const response = await axios.get(
        `/api/parts/by-service/${activeCategory}?${params.toString()}`
      );
      
      if (response.data.success) {
        const allParts = [
          ...response.data.data.recommended,
          ...response.data.data.common,
          ...response.data.data.available
        ];
        setParts(allParts);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCategory !== 'all') {
      fetchPartsByCategory();
    } else {
      setParts([]);
    }
  }, [activeCategory, vehicleInfo]);

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateSelectedPartQuantity = (partId: string, change: number) => {
    if (disabled) return;
    
    // Check workflow restrictions
    if (mode === 'reserve' && workflowInfo && !workflowInfo.canReserveParts) {
      toast.error('Parts cannot be reserved at this time');
      return;
    }
    
    if (mode === 'use' && workflowInfo && !workflowInfo.canModifyParts) {
      toast.error('Parts usage cannot be modified at this time');
      return;
    }

    setSelectedParts(prev => {
      const existing = prev.find(p => p.partId === partId);
      const part = parts.find(p => p._id === partId) || 
                   reservedParts.find(p => p.partId === partId);
      
      if (!part) return prev;

      const maxQuantity = mode === 'reserve' 
        ? (part as Part).inventory?.currentStock || 0
        : (part as ReservedPart).quantity || 0;

      if (existing) {
        const newQuantity = Math.max(0, Math.min(maxQuantity, existing.quantity + change));
        if (newQuantity === 0) {
          return prev.filter(p => p.partId !== partId);
        }
        return prev.map(p => 
          p.partId === partId ? { ...p, quantity: newQuantity } : p
        );
      } else if (change > 0) {
        return [...prev, { partId, quantity: Math.min(maxQuantity, change) }];
      }
      return prev;
    });
  };

  const getSelectedQuantity = (partId: string): number => {
    return selectedParts.find(p => p.partId === partId)?.quantity || 0;
  };

  const handleReserveParts = async () => {
    if (selectedParts.length === 0) {
      toast.error('Please select parts to reserve');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/parts/reserve', {
        appointmentId,
        parts: selectedParts
      });

      if (response.data.success) {
        toast.success('Parts reserved successfully');
        setSelectedParts([]);
        fetchReservedParts(); // Refresh reserved parts
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reserve parts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseParts = async () => {
    if (selectedParts.length === 0) {
      toast.error('Please specify which parts were used');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.put('/api/parts/use', {
        appointmentId,
        usedParts: selectedParts
      });

      if (response.data.success) {
        toast.success('Part usage updated successfully');
        fetchReservedParts(); // Refresh reserved parts
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update part usage');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', ...serviceCategories, 'battery', 'motor', 'charging', 'electronics'];

  const formatCurrency = (amount: number, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency === 'VND' ? 'VND' : 'USD'
    }).format(amount);
  };

  const getTotalCost = () => {
    return selectedParts.reduce((total, selected) => {
      const part = parts.find(p => p._id === selected.partId) ||
                   reservedParts.find(p => p.partId === selected.partId);
      if (!part) return total;
      
      const price = 'pricing' in part ? part.pricing.retail : part.unitPrice;
      return total + (price * selected.quantity);
    }, 0);
  };

  // Check if parts functionality should be disabled based on workflow
  const isWorkflowDisabled = workflowInfo && (
    (mode === 'reserve' && !workflowInfo.canReserveParts) ||
    (mode === 'use' && !workflowInfo.canModifyParts)
  );

  return (
    <div className="space-y-6">
      {/* Workflow Status Warning */}
      {workflowInfo && workflowInfo.restrictions && (
        <div className={`p-4 rounded-lg border ${
          isWorkflowDisabled 
            ? 'bg-orange-50 border-orange-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center">
            {isWorkflowDisabled ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
            ) : (
              <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                isWorkflowDisabled ? 'text-orange-800' : 'text-blue-800'
              }`}>
                Appointment Status: {workflowInfo.appointmentStatus}
              </p>
              <p className={`text-sm ${
                isWorkflowDisabled ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {workflowInfo.restrictions.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'reserve' ? 'Parts Selection' : 'Parts Usage'}
          </h3>
          <p className="text-sm text-gray-600">
            {mode === 'reserve' 
              ? 'Select parts needed for this appointment'
              : 'Mark which parts were actually used'
            }
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          {mode === 'reserve' && selectedParts.length > 0 && !isWorkflowDisabled && (
            <button
              onClick={handleReserveParts}
              disabled={submitting || disabled || isWorkflowDisabled}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <CubeIcon className="w-4 h-4 mr-2" />
              {submitting ? 'Reserving...' : `Reserve ${selectedParts.length} Part${selectedParts.length !== 1 ? 's' : ''}`}
            </button>
          )}
          
          {mode === 'use' && selectedParts.length > 0 && !isWorkflowDisabled && (
            <button
              onClick={handleUseParts}
              disabled={submitting || disabled || isWorkflowDisabled}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              {submitting ? 'Updating...' : 'Mark as Used'}
            </button>
          )}
        </div>
      </div>

      {/* Reserved Parts Summary */}
      {reservedParts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Reserved Parts ({reservedParts.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {reservedParts.map((part) => (
              <div key={part.partId} className="flex items-center justify-between text-sm">
                <span className="text-blue-800">{part.name} ({part.partNumber})</span>
                <span className="font-medium text-blue-900">Qty: {part.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'reserve' && (
        <>
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          {activeCategory !== 'all' && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Parts List */}
          {activeCategory === 'all' ? (
            <div className="text-center py-8 text-gray-500">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Select a category to view available parts</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No parts available for this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParts.map((part) => {
                const selectedQty = getSelectedQuantity(part._id);
                const availableStock = part.inventory.currentStock - part.inventory.reservedStock;
                const isLowStock = availableStock <= part.inventory.minStockLevel;
                
                return (
                  <div
                    key={part._id}
                    className={`border rounded-lg p-4 ${
                      selectedQty > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{part.name}</h5>
                        <p className="text-sm text-gray-600">{part.partNumber}</p>
                        <p className="text-xs text-gray-500">{part.brand} • {part.model}</p>
                      </div>
                      {part.isRecommended && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Recommended
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{part.description}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(part.pricing.retail, part.pricing.currency)}
                        </span>
                      </div>
                      <div className={`text-sm ${isLowStock ? 'text-orange-600' : 'text-gray-600'}`}>
                        <span className="flex items-center">
                          {isLowStock && <ExclamationTriangleIcon className="w-4 h-4 mr-1" />}
                          Stock: {availableStock}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateSelectedPartQuantity(part._id, -1)}
                          disabled={disabled || selectedQty <= 0 || isWorkflowDisabled}
                          className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{selectedQty}</span>
                        <button
                          onClick={() => updateSelectedPartQuantity(part._id, 1)}
                          disabled={disabled || selectedQty >= availableStock || isWorkflowDisabled}
                          className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {selectedQty > 0 && (
                        <span className="text-sm font-medium text-blue-600">
                          {formatCurrency(part.pricing.retail * selectedQty, part.pricing.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {mode === 'use' && reservedParts.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Mark Parts as Used</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservedParts.map((part) => {
              const selectedQty = getSelectedQuantity(part.partId);
              
              return (
                <div key={part.partId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">{part.name}</h5>
                      <p className="text-sm text-gray-600">{part.partNumber}</p>
                    </div>
                    <span className="text-sm text-gray-500">Reserved: {part.quantity}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantity Used:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateSelectedPartQuantity(part.partId, -1)}
                        disabled={disabled || selectedQty <= 0 || isWorkflowDisabled}
                        className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{selectedQty}</span>
                      <button
                        onClick={() => updateSelectedPartQuantity(part.partId, 1)}
                        disabled={disabled || selectedQty >= part.quantity || isWorkflowDisabled}
                        className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total Cost */}
      {selectedParts.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">
              Total {mode === 'reserve' ? 'Cost' : 'Parts Used'}:
            </span>
            <span className="text-lg font-bold text-gray-900">
              {mode === 'reserve' && formatCurrency(getTotalCost())}
              {mode === 'use' && `${selectedParts.reduce((sum, p) => sum + p.quantity, 0)} parts`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsSelection;