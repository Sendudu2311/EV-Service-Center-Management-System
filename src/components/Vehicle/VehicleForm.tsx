import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Vehicle {
  _id?: string;
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
}

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  mode: 'create' | 'edit';
  onSuccess: () => void;
  onCancel: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  vehicle,
  mode,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    batteryType: 'lithium-ion',
    batteryCapacity: 50,
    maxChargingPower: 50,
    range: 300,
    purchaseDate: '',
    mileage: 0,
    maintenanceInterval: 10000,
    timeBasedInterval: 12,
    warrantyExpiry: ''
  });

  useEffect(() => {
    if (vehicle && mode === 'edit') {
      setFormData({
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        batteryType: vehicle.batteryType,
        batteryCapacity: vehicle.batteryCapacity,
        maxChargingPower: vehicle.maxChargingPower,
        range: vehicle.range,
        purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split('T')[0] : '',
        mileage: vehicle.mileage,
        maintenanceInterval: vehicle.maintenanceInterval,
        timeBasedInterval: vehicle.timeBasedInterval,
        warrantyExpiry: vehicle.warrantyExpiry ? vehicle.warrantyExpiry.split('T')[0] : ''
      });
    }
  }, [vehicle, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['year', 'batteryCapacity', 'maxChargingPower', 'range', 'mileage', 'maintenanceInterval', 'timeBasedInterval'].includes(name) 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        await api.post('/api/vehicles', formData);
        toast.success('Vehicle registered successfully');
      } else {
        await api.put(`/api/vehicles/${vehicle?._id}`, formData);
        toast.success('Vehicle updated successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  const batteryTypes = [
    { value: 'lithium-ion', label: 'Lithium-ion' },
    { value: 'lithium-iron-phosphate', label: 'Lithium Iron Phosphate (LiFePO4)' },
    { value: 'lithium-polymer', label: 'Lithium Polymer' },
    { value: 'nickel-metal-hydride', label: 'Nickel Metal Hydride' },
    { value: 'solid-state', label: 'Solid State' }
  ];

  const popularMakes = [
    'Tesla', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Kia', 
    'Nissan', 'Chevrolet', 'Ford', 'Volvo', 'Polestar', 'Lucid', 'Rivian', 
    'VinFast', 'BYD', 'Xpeng', 'NIO', 'Li Auto', 'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  {mode === 'create' ? 'Register New Vehicle' : 'Edit Vehicle'}
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                {/* VIN */}
                <div className="sm:col-span-6">
                  <label htmlFor="vin" className="block text-sm font-medium leading-6 text-gray-900">
                    VIN (Vehicle Identification Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vin"
                    id="vin"
                    required
                    maxLength={17}
                    placeholder="Enter 17-character VIN"
                    value={formData.vin}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 uppercase"
                  />
                  <p className="mt-1 text-xs text-gray-500">Must be exactly 17 characters</p>
                </div>

                {/* Make and Model */}
                <div className="sm:col-span-3">
                  <label htmlFor="make" className="block text-sm font-medium leading-6 text-gray-900">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="make"
                    id="make"
                    required
                    value={formData.make}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Select Make</option>
                    {popularMakes.map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="model" className="block text-sm font-medium leading-6 text-gray-900">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    id="model"
                    required
                    placeholder="e.g., Model 3, IONIQ 5, ID.4"
                    value={formData.model}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                {/* Year and Color */}
                <div className="sm:col-span-3">
                  <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="year"
                    id="year"
                    required
                    min="2010"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="color" className="block text-sm font-medium leading-6 text-gray-900">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="color"
                    id="color"
                    required
                    placeholder="e.g., Pearl White, Ocean Blue"
                    value={formData.color}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                {/* Battery Information */}
                <div className="sm:col-span-3">
                  <label htmlFor="batteryType" className="block text-sm font-medium leading-6 text-gray-900">
                    Battery Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="batteryType"
                    id="batteryType"
                    required
                    value={formData.batteryType}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  >
                    {batteryTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="batteryCapacity" className="block text-sm font-medium leading-6 text-gray-900">
                    Battery Capacity (kWh) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="batteryCapacity"
                    id="batteryCapacity"
                    required
                    min="10"
                    max="200"
                    step="0.1"
                    placeholder="50"
                    value={formData.batteryCapacity}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                {/* Performance */}
                <div className="sm:col-span-3">
                  <label htmlFor="maxChargingPower" className="block text-sm font-medium leading-6 text-gray-900">
                    Max Charging Power (kW) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxChargingPower"
                    id="maxChargingPower"
                    required
                    min="3"
                    max="500"
                    placeholder="50"
                    value={formData.maxChargingPower}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="range" className="block text-sm font-medium leading-6 text-gray-900">
                    Range (km) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="range"
                    id="range"
                    required
                    min="50"
                    max="1000"
                    placeholder="300"
                    value={formData.range}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                {/* Dates and Mileage */}
                <div className="sm:col-span-3">
                  <label htmlFor="purchaseDate" className="block text-sm font-medium leading-6 text-gray-900">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="purchaseDate"
                    id="purchaseDate"
                    required
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="warrantyExpiry" className="block text-sm font-medium leading-6 text-gray-900">
                    Warranty Expiry
                  </label>
                  <input
                    type="date"
                    name="warrantyExpiry"
                    id="warrantyExpiry"
                    value={formData.warrantyExpiry}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="mileage" className="block text-sm font-medium leading-6 text-gray-900">
                    Current Mileage (km)
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    id="mileage"
                    min="0"
                    value={formData.mileage}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="maintenanceInterval" className="block text-sm font-medium leading-6 text-gray-900">
                    Maintenance Interval (km)
                  </label>
                  <input
                    type="number"
                    name="maintenanceInterval"
                    id="maintenanceInterval"
                    min="5000"
                    max="50000"
                    step="1000"
                    value={formData.maintenanceInterval}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="timeBasedInterval" className="block text-sm font-medium leading-6 text-gray-900">
                    Time-based Interval (months)
                  </label>
                  <input
                    type="number"
                    name="timeBasedInterval"
                    id="timeBasedInterval"
                    min="3"
                    max="24"
                    value={formData.timeBasedInterval}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === 'create' ? 'Registering...' : 'Updating...'}
                  </div>
                ) : (
                  mode === 'create' ? 'Register Vehicle' : 'Update Vehicle'
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleForm;