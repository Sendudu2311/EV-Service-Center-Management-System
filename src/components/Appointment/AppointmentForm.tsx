import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { appointmentsAPI, vehiclesAPI, serviceCentersAPI, servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import TechnicianSelection from './TechnicianSelection';

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

interface ServiceCenter {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
  };
}

interface Service {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
}

interface AppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceCenterId: '',
    services: [] as string[],
    scheduledDate: '',
    scheduledTime: '',
    customerNotes: '',
    priority: 'normal',
    technicianId: null as string | null
  });

  useEffect(() => {
    Promise.all([
      fetchVehicles(),
      fetchServiceCenters()
    ]);
  }, []);

  useEffect(() => {
    if (formData.serviceCenterId) {
      fetchServices();
    }
  }, [formData.serviceCenterId]);

  const fetchVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      const vehicleData = response.data?.data || response.data || [];
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
      setVehicles([]);
    }
  };;

  const fetchServiceCenters = async () => {
    try {
      const response = await serviceCentersAPI.getAll();
      const centerData = response.data?.data || response.data || [];
      setServiceCenters(Array.isArray(centerData) ? centerData : []);
    } catch (error) {
      console.error('Error fetching service centers:', error);
      toast.error('Failed to load service centers');
      setServiceCenters([]);
    }
  };;

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      const serviceData = response.data?.data || response.data || [];
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
      setServices([]);
    }
  };;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        setFormData(prev => ({
          ...prev,
          services: [...prev.services, value],
          // Reset technician selection when services change
          technicianId: null
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          services: prev.services.filter(id => id !== value),
          // Reset technician selection when services change
          technicianId: null
        }));
      }
    } else {
      const updates: any = { [name]: value };
      
      // Reset technician selection when critical fields change
      if (['serviceCenterId', 'scheduledDate', 'scheduledTime'].includes(name)) {
        updates.technicianId = null;
      }
      
      // Reset services when service center changes
      if (name === 'serviceCenterId') {
        updates.services = [];
      }
      
      setFormData(prev => ({
        ...prev,
        ...updates
      }));
    }
  };

  const handleTechnicianSelect = (technicianId: string | null) => {
    setFormData(prev => ({
      ...prev,
      technicianId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.services.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setLoading(true);

    try {
      const appointmentData = {
        ...formData,
        services: formData.services.map(serviceId => ({ serviceId, quantity: 1 })),
        ...(formData.technicianId && { technicianId: formData.technicianId })
      };
      
      await appointmentsAPI.create(appointmentData);
      toast.success('Appointment booked successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  Book New Appointment
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Vehicle Selection */}
                <div>
                  <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700">
                    Select Vehicle <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vehicleId"
                    name="vehicleId"
                    required
                    value={formData.vehicleId}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.make} {vehicle.model} {vehicle.year} - {vehicle.vin}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Center Selection */}
                <div>
                  <label htmlFor="serviceCenterId" className="block text-sm font-medium text-gray-700">
                    Service Center <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="serviceCenterId"
                    name="serviceCenterId"
                    required
                    value={formData.serviceCenterId}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a service center</option>
                    {serviceCenters.map((center) => (
                      <option key={center._id} value={center._id}>
                        {center.name} - {center.address.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="scheduledDate"
                      name="scheduledDate"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="scheduledTime"
                      name="scheduledTime"
                      required
                      value={formData.scheduledTime}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select time</option>
                      {[
                        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                        '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
                        '15:00', '15:30', '16:00', '16:30', '17:00'
                      ].map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Services */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Services <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {services.map((service) => (
                        <div key={service._id} className="flex items-start">
                          <input
                            type="checkbox"
                            id={service._id}
                            value={service._id}
                            checked={formData.services.includes(service._id)}
                            onChange={handleChange}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={service._id} className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {service.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {service.description}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND'
                              }).format(service.basePrice)} • {service.estimatedDuration} min
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technician Selection */}
                {formData.serviceCenterId && 
                 formData.services.length > 0 && 
                 formData.scheduledDate && 
                 formData.scheduledTime && (
                  <div>
                    <TechnicianSelection
                      serviceCenterId={formData.serviceCenterId}
                      selectedServices={formData.services.map(serviceId => {
                        const service = services.find(s => s._id === serviceId);
                        return { serviceId, category: service?.category };
                      })}
                      selectedTechnicianId={formData.technicianId}
                      onTechnicianSelect={handleTechnicianSelect}
                      disabled={loading}
                      appointmentDate={formData.scheduledDate}
                      appointmentTime={formData.scheduledTime}
                      estimatedDuration={formData.services.reduce((total, serviceId) => {
                        const service = services.find(s => s._id === serviceId);
                        return total + (service?.estimatedDuration || 0);
                      }, 0)}
                    />
                  </div>
                )}

                {/* Info message when technician selection is not available yet */}
                {formData.serviceCenterId && formData.services.length > 0 && 
                 (!formData.scheduledDate || !formData.scheduledTime) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Please select a date and time to view available technicians for your chosen services.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="customerNotes"
                    name="customerNotes"
                    rows={3}
                    value={formData.customerNotes}
                    onChange={handleChange}
                    placeholder="Please describe any specific issues or requests..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:ml-3 sm:w-auto disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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

export default AppointmentForm;