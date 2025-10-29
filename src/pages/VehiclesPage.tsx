import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import VehicleForm from '../components/Vehicle/VehicleForm';
import VehicleDetails from '../components/Vehicle/VehicleDetails';

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
  warrantyExpiry: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  isMaintenanceDue: boolean;
  createdAt: string;
}

const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/vehicles');
      // Defensive programming: ensure we always set an array
      const vehicleData = response.data?.data || response.data || [];
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
      // Ensure vehicles is always an array even on error
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = () => {
    setSelectedVehicle(null);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetails(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) {
      return;
    }

    try {
      await api.delete(`/api/vehicles/${vehicleId}`);
      toast.success('Vehicle removed successfully');
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to remove vehicle');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  const getMaintenanceStatusBadge = (vehicle: Vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-dark-300 text-red-600">
          Maintenance Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-dark-300 text-green-600">
        Up to Date
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMileage = (mileage: number) => {
    return `${mileage.toLocaleString()} km`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
              My Vehicles
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Manage your electric vehicle fleet and maintenance schedules
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              type="button"
              onClick={handleCreateVehicle}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-lime-200 px text-dark-900 shadow-sm hover:bg-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
            >
              <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* Vehicle Grid */}
        {(!vehicles || vehicles.length === 0) ? (
          <div className="mt-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-white">No vehicles</h3>
            <p className="mt-1 text-sm text-text-muted">Get started by adding your first electric vehicle.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleCreateVehicle}
                className="inline-flex items-center gap-x-1.5 rounded-md bg-lime-200 px text-dark-900 shadow-sm hover:bg-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
              >
                <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Add Vehicle
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(vehicles || []).map((vehicle) => (
              <div
                key={vehicle._id}
                className="relative bg-dark-300 overflow-hidden shadow rounded-lg divide-y divide-gray-200"
              >
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg leading-6 text-text-muted text-white">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-text-muted">
                        {vehicle.year} • {vehicle.color}
                      </p>
                    </div>
                    {getMaintenanceStatusBadge(vehicle)}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-text-muted text-text-muted uppercase tracking-wide">
                        Battery
                      </dt>
                      <dd className="mt-1 text-sm text-white">
                        {vehicle.batteryCapacity} kWh
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted text-text-muted uppercase tracking-wide">
                        Range
                      </dt>
                      <dd className="mt-1 text-sm text-white">
                        {vehicle.range} km
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted text-text-muted uppercase tracking-wide">
                        Mileage
                      </dt>
                      <dd className="mt-1 text-sm text-white">
                        {formatMileage(vehicle.mileage)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted text-text-muted uppercase tracking-wide">
                        Max Charging
                      </dt>
                      <dd className="mt-1 text-sm text-white">
                        {vehicle.maxChargingPower} kW
                      </dd>
                    </div>
                  </div>

                  {vehicle.nextMaintenanceDate && (
                    <div className="mt-4">
                      <dt className="text-xs text-text-muted text-text-muted uppercase tracking-wide">
                        Next Maintenance
                      </dt>
                      <dd className="mt-1 text-sm text-white">
                        {formatDate(vehicle.nextMaintenanceDate)}
                      </dd>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-dark-900">
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => handleViewVehicle(vehicle)}
                      className="inline-flex items-center gap-x-1.5 text-sm font-semibold text-lime-600 hover:text-lime-500"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Details
                    </button>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditVehicle(vehicle)}
                        className="inline-flex items-center gap-x-1.5 text-sm font-semibold text-text-secondary hover:text-text-muted"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(vehicle._id)}
                        className="inline-flex items-center gap-x-1.5 text-sm font-semibold text-red-600 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vehicle Form Modal */}
        {showForm && (
          <VehicleForm
            vehicle={selectedVehicle}
            mode={formMode}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setSelectedVehicle(null);
            }}
          />
        )}

        {/* Vehicle Details Modal */}
        {showDetails && selectedVehicle && (
          <VehicleDetails
            vehicle={selectedVehicle}
            onClose={() => {
              setShowDetails(false);
              setSelectedVehicle(null);
            }}
            onEdit={(vehicle) => {
              setShowDetails(false);
              handleEditVehicle(vehicle);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default VehiclesPage;
