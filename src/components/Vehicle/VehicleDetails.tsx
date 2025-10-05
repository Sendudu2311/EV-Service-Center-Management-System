import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { BoltIcon, ClockIcon } from '@heroicons/react/24/solid';
import { vehiclesAPI } from '../../services/api';
import VehicleImageGallery from './VehicleImageGallery';
import toast from 'react-hot-toast';

interface Vehicle {
  _id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  batteryType: string;
  batteryCapacity: number;
  maxChargingPower: number;
  range: number;
  purchaseDate: string;
  mileage: number;
  maintenanceInterval: number;
  timeBasedInterval: number;
  warrantyExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  isMaintenanceDue: boolean;
  createdAt: string;
  images?: Array<{
    url: string;
    description: string;
    uploadDate: string;
  }>;
}

interface MaintenanceRecord {
  _id: string;
  scheduledDate: string;
  status: string;
  services: Array<{
    serviceId: {
      name: string;
      category: string;
    };
  }>;
  assignedTechnician?: {
    firstName: string;
    lastName: string;
  };
  actualCompletion?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onVehicleUpdated?: () => void;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onEdit,
  onVehicleUpdated
}) => {
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [updatingMileage, setUpdatingMileage] = useState(false);
  const [newMileage, setNewMileage] = useState(vehicle.mileage);
  const [showMileageUpdate, setShowMileageUpdate] = useState(false);

  useEffect(() => {
    fetchMaintenanceHistory();
  }, [vehicle._id]);

  const fetchMaintenanceHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await vehiclesAPI.getServiceHistory(vehicle._id);
      setMaintenanceHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching maintenance history:', error);
      toast.error('Failed to load maintenance history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleImagesUpdated = () => {
    if (onVehicleUpdated) {
      onVehicleUpdated();
    }
  };

  const handleUpdateMileage = async () => {
    if (newMileage < vehicle.mileage) {
      toast.error('New mileage cannot be less than current mileage');
      return;
    }

    try {
      setUpdatingMileage(true);
      await vehiclesAPI.updateMileage(vehicle._id, newMileage);
      toast.success('Mileage updated successfully');
      setShowMileageUpdate(false);
      // Update the vehicle object with new mileage
      vehicle.mileage = newMileage;
    } catch (error: any) {
      console.error('Error updating mileage:', error);
      toast.error(error.response?.data?.message || 'Failed to update mileage');
    } finally {
      setUpdatingMileage(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMaintenanceStatusColor = (vehicle: Vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getServiceStatusBadge = (status: string) => {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold leading-6 text-gray-900">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </h3>
                <p className="mt-1 text-sm text-gray-500">VIN: {vehicle.vin}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => onEdit(vehicle)}
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Vehicle Information */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h4>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Color</dt>
                      <dd className="mt-1 text-sm text-gray-900">{vehicle.color}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.purchaseDate)}</dd>
                    </div>
                    {vehicle.warrantyExpiry && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Warranty Expiry</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.warrantyExpiry)}</dd>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h5 className="text-md font-medium text-gray-900 mb-3">Technical Specifications</h5>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M20 9H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2v-6a2 2 0 00-2-2zM8 13h8v2H8v-2z" />
                        </svg>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Battery</dt>
                          <dd className="text-sm text-gray-900">
                            {vehicle.batteryCapacity} kWh ({vehicle.batteryType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <BoltIcon className="h-5 w-5 text-yellow-500 mr-2" />
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Max Charging Power</dt>
                          <dd className="text-sm text-gray-900">{vehicle.maxChargingPower} kW</dd>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Range</dt>
                          <dd className="text-sm text-gray-900">{vehicle.range} km</dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Maintenance History */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h4>
                  
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading history...</span>
                    </div>
                  ) : maintenanceHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">No maintenance history available</p>
                  ) : (
                    <div className="space-y-4">
                      {maintenanceHistory.map((record) => (
                        <div key={record._id} className="bg-white rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {formatShortDate(record.scheduledDate)}
                              </span>
                              {getServiceStatusBadge(record.status)}
                            </div>
                            {record.feedback && renderStarRating(record.feedback.rating)}
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            Services: {record.services.map(s => s.serviceId.name).join(', ')}
                          </div>
                          
                          {record.assignedTechnician && (
                            <div className="text-sm text-gray-500">
                              Technician: {record.assignedTechnician.firstName} {record.assignedTechnician.lastName}
                            </div>
                          )}
                          
                          {record.feedback?.comment && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{record.feedback.comment}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle Images */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Vehicle Images</h4>
                  <VehicleImageGallery
                    vehicleId={vehicle._id}
                    images={vehicle.images || []}
                    onImagesUpdated={handleImagesUpdated}
                    canUpload={true}
                  />
                </div>
              </div>

              {/* Maintenance Status & Actions */}
              <div className="lg:col-span-1">
                <div className="space-y-6">
                  {/* Maintenance Status */}
                  <div className={`rounded-lg border-2 p-4 ${getMaintenanceStatusColor(vehicle)}`}>
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      <h4 className="text-sm font-medium">Maintenance Status</h4>
                    </div>
                    <p className="mt-2 text-sm">
                      {vehicle.isMaintenanceDue ? 'Maintenance Due' : 'Up to Date'}
                    </p>
                    {vehicle.nextMaintenanceDate && (
                      <p className="mt-1 text-xs">
                        Next: {formatDate(vehicle.nextMaintenanceDate)}
                      </p>
                    )}
                  </div>

                  {/* Current Mileage */}
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">Current Mileage</h4>
                      <button
                        onClick={() => setShowMileageUpdate(true)}
                        className="text-xs text-blue-600 hover:text-blue-500"
                      >
                        Update
                      </button>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {vehicle.mileage.toLocaleString()} km
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Service interval: {vehicle.maintenanceInterval.toLocaleString()} km</p>
                      <p>Time-based: {vehicle.timeBasedInterval} months</p>
                    </div>

                    {showMileageUpdate && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          min={vehicle.mileage}
                          value={newMileage}
                          onChange={(e) => setNewMileage(Number(e.target.value))}
                          className="block w-full rounded-md border-gray-300 text-sm"
                          placeholder="New mileage"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateMileage}
                            disabled={updatingMileage}
                            className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-500 disabled:opacity-50"
                          >
                            {updatingMileage ? 'Updating...' : 'Update'}
                          </button>
                          <button
                            onClick={() => {
                              setShowMileageUpdate(false);
                              setNewMileage(vehicle.mileage);
                            }}
                            className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-500">
                        Book Maintenance
                      </button>
                      <button className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200">
                        View Full History
                      </button>
                      <button className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200">
                        Download Reports
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;