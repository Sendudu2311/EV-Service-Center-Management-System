import React, { useState, useEffect } from 'react';
import { EyeIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
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
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const AllVehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetails(true);
  };

  const getMaintenanceStatusBadge = (vehicle: Vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white bg-red-600">
          Maintenance Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white bg-green-600">
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

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${vehicle.customerId.firstName} ${vehicle.customerId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === '' || 
      (filterStatus === 'due' && vehicle.isMaintenanceDue) ||
      (filterStatus === 'current' && !vehicle.isMaintenanceDue);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pageTitle = user?.role === 'admin' ? 'All Vehicles' : 
                    user?.role === 'staff' ? 'Customer Vehicles' :
                    user?.role === 'technician' ? 'Service Vehicles' : 'Vehicles';

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
              {pageTitle}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {user?.role === 'admin' ? 'Manage all vehicles in the system' :
               user?.role === 'staff' ? 'View and manage customer vehicles' :
               user?.role === 'technician' ? 'View vehicles assigned for service' : 'Vehicle management'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-text-secondary">
              Search vehicles
            </label>
            <input
              type="text"
              name="search"
              id="search"
              placeholder="Search by make, model, VIN, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full bg-dark-300 text-white border border-dark-300 rounded-md shadow-sm focus:border-lime-400 focus:ring-lime-400 focus:ring-2 sm:text-sm placeholder-text-muted"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-secondary">
              Maintenance Status
            </label>
            <select
              id="status"
              name="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 block w-full bg-dark-300 text-white border border-dark-300 rounded-md shadow-sm focus:border-lime-400 focus:ring-lime-400 focus:ring-2 sm:text-sm"
            >
              <option value="">All Vehicles</option>
              <option value="due">Maintenance Due</option>
              <option value="current">Up to Date</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-text-secondary">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        {filteredVehicles.length === 0 ? (
          <div className="mt-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-400"
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
            <h3 className="mt-2 text-sm font-semibold text-white">No vehicles found</h3>
            <p className="mt-1 text-sm text-text-secondary">
              {searchTerm || filterStatus ? 'Try adjusting your search or filter.' : 'No vehicles in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="mt-8 bg-dark-300 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {(filteredVehicles || []).map((vehicle) => (
                <li key={vehicle._id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-dark-200 flex items-center justify-center">
                            <svg className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-lime-200 truncate">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                              </p>
                              <p className="text-sm text-text-secondary truncate">
                                VIN: {vehicle.vin}
                              </p>
                            </div>
                            {getMaintenanceStatusBadge(vehicle)}
                          </div>
                          
                          {user?.role !== 'customer' && (
                            <div className="mt-2 flex items-center text-sm text-text-secondary">
                              <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              <span className="truncate">
                                {vehicle.customerId.firstName} {vehicle.customerId.lastName} ({vehicle.customerId.email})
                              </span>
                            </div>
                          )}
                          
                          <div className="mt-2 flex items-center text-sm text-text-secondary space-x-6">
                            <div>
                              <span className="text-text-muted">Battery:</span> {vehicle.batteryCapacity} kWh
                            </div>
                            <div>
                              <span className="text-text-muted">Range:</span> {vehicle.range} km
                            </div>
                            <div>
                              <span className="text-text-muted">Mileage:</span> {formatMileage(vehicle.mileage)}
                            </div>
                          </div>

                          {vehicle.nextMaintenanceDate && (
                            <div className="mt-1 flex items-center text-sm text-text-secondary">
                              <span className="text-text-muted">Next Maintenance:</span>
                              <span className="ml-1">{formatDate(vehicle.nextMaintenanceDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewVehicle(vehicle)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium text-dark-900 rounded-md bg-lime-200 hover:bg-lime-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
              // Only allow editing for customers or admins
              if (user?.role === 'customer' || user?.role === 'admin') {
                setShowDetails(false);
                // Handle edit - could open edit form
                toast.info('Edit functionality will be implemented in Phase 2');
              } else {
                toast.error('You do not have permission to edit this vehicle');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AllVehiclesPage;
