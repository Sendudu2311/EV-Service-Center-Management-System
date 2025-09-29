import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ServiceCenter {
  _id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    email: string;
    managerName: string;
  };
  capacity: {
    totalBays: number;
    quickServiceBays: number;
    specialtyBays: number;
  };
  workingHours: {
    [key: string]: {
      isOpen: boolean;
      open?: string;
      close?: string;
    };
  };
  services: Array<{
    _id: string;
    name: string;
    category: string;
  }>;
  isActive: boolean;
  createdAt: string;
}

const ServiceCentersPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ServiceCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    contact: {
      phone: '',
      email: '',
      managerName: ''
    },
    capacity: {
      totalBays: 5,
      quickServiceBays: 2,
      specialtyBays: 1
    },
    workingHours: {
      monday: { isOpen: true, open: '08:00', close: '18:00' },
      tuesday: { isOpen: true, open: '08:00', close: '18:00' },
      wednesday: { isOpen: true, open: '08:00', close: '18:00' },
      thursday: { isOpen: true, open: '08:00', close: '18:00' },
      friday: { isOpen: true, open: '08:00', close: '18:00' },
      saturday: { isOpen: true, open: '09:00', close: '17:00' },
      sunday: { isOpen: false, open: '', close: '' }
    },
    services: [] as string[],
    isActive: true
  });

  const [availableServices, setAvailableServices] = useState<Array<{
    _id: string;
    name: string;
    category: string;
  }>>([]);

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    fetchServiceCenters();
    fetchAvailableServices();
  }, []);

  const fetchServiceCenters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/service-centers');
      setServiceCenters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching service centers:', error);
      toast.error('Failed to load service centers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const response = await axios.get('/api/services');
      setAvailableServices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingCenter) {
        await axios.put(`/api/service-centers/${editingCenter._id}`, formData);
        toast.success('Service center updated successfully');
      } else {
        await axios.post('/api/service-centers', formData);
        toast.success('Service center created successfully');
      }

      setShowModal(false);
      setEditingCenter(null);
      resetForm();
      fetchServiceCenters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save service center');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (center: ServiceCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      code: center.code,
      address: center.address,
      contact: center.contact,
      capacity: center.capacity,
      workingHours: center.workingHours,
      services: center.services.map(service => 
        typeof service === 'object' ? service._id : service
      ),
      isActive: center.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (centerId: string) => {
    if (!confirm('Are you sure you want to delete this service center?')) return;

    try {
      await axios.delete(`/api/service-centers/${centerId}`);
      toast.success('Service center deleted successfully');
      fetchServiceCenters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete service center');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      contact: {
        phone: '',
        email: '',
        managerName: ''
      },
      capacity: {
        totalBays: 5,
        quickServiceBays: 2,
        specialtyBays: 1
      },
      workingHours: {
        monday: { isOpen: true, open: '08:00', close: '18:00' },
        tuesday: { isOpen: true, open: '08:00', close: '18:00' },
        wednesday: { isOpen: true, open: '08:00', close: '18:00' },
        thursday: { isOpen: true, open: '08:00', close: '18:00' },
        friday: { isOpen: true, open: '08:00', close: '18:00' },
        saturday: { isOpen: true, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '', close: '' }
      },
      services: [],
      isActive: true
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData({
      ...formData,
      services: formData.services.includes(serviceId)
        ? formData.services.filter(s => s !== serviceId)
        : [...formData.services, serviceId]
    });
  };

  const formatWorkingHours = (workingHours: ServiceCenter['workingHours']) => {
    const openDays = Object.entries(workingHours)
      .filter(([_, hours]) => hours.isOpen)
      .map(([day, hours]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open}-${hours.close}`)
      .join(', ');
    return openDays || 'Closed';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Centers</h1>
              <p className="text-gray-600 mt-2">Manage service center locations and configurations</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingCenter(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Service Center
            </button>
          </div>
        </div>

        {/* Service Centers Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {serviceCenters.map((center) => (
              <div key={center._id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{center.name}</h3>
                      <p className="text-sm text-gray-600">Code: {center.code}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(center)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(center._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p>{center.address.street}</p>
                        <p>{center.address.city}, {center.address.state} {center.address.zipCode}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{center.contact.phone}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Manager: {center.contact.managerName}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {center.capacity.totalBays} bays total ({center.capacity.quickServiceBays} quick, {center.capacity.specialtyBays} specialty)
                      </span>
                    </div>

                    <div className="flex items-start space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-600">{formatWorkingHours(center.workingHours)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {center.services.slice(0, 3).map((service) => (
                        <span
                          key={typeof service === 'object' ? service._id : service}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {typeof service === 'object' ? service.name : service}
                        </span>
                      ))}
                      {center.services.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{center.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        center.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {center.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Created {new Date(center.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCenter ? 'Edit Service Center' : 'Add New Service Center'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Code</label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Street</label>
                        <input
                          type="text"
                          required
                          value={formData.address.street}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          required
                          value={formData.address.city}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input
                          type="text"
                          required
                          value={formData.address.state}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Manager Name</label>
                        <input
                          type="text"
                          required
                          value={formData.contact.managerName}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, managerName: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          required
                          value={formData.contact.phone}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          required
                          value={formData.contact.email}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Services Offered</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableServices.map((service) => (
                        <label key={service._id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.services.includes(service._id)}
                            onChange={() => handleServiceToggle(service._id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editingCenter ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceCentersPage;