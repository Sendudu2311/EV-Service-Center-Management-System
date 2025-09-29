import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  TruckIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  vehicleCount?: number;
  appointmentCount?: number;
}

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  batteryType: string;
  color: string;
  isActive: boolean;
}

interface Appointment {
  _id: string;
  appointmentNumber: string;
  scheduledDate: string;
  status: string;
  services: Array<{
    serviceId: {
      name: string;
      category: string;
    };
  }>;
  totalCost: number;
}

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'profile' | 'vehicles' | 'appointments'>('profile');

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, filterStatus]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filterStatus !== 'all') {
        params.append('isActive', filterStatus === 'active' ? 'true' : 'false');
      }

      const response = await api.get(`/api/auth/users?role=customer&${params}`);
      
      // Get customer statistics
      const customerData = response.data?.data || response.data || [];
      const customersWithStats = await Promise.all(
        (Array.isArray(customerData) ? customerData : []).map(async (customer: Customer) => {
          try {
            // Get vehicle count
            const vehiclesResponse = await api.get(`/api/vehicles?customerId=${customer._id}`);
            const vehicleCount = vehiclesResponse.data.count || 0;

            // Get appointment count
            const appointmentsResponse = await api.get(`/api/appointments?customerId=${customer._id}`);
            const appointmentCount = appointmentsResponse.data.count || 0;

            return {
              ...customer,
              vehicleCount,
              appointmentCount
            };
          } catch (error) {
            return {
              ...customer,
              vehicleCount: 0,
              appointmentCount: 0
            };
          }
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId: string, type: 'profile' | 'vehicles' | 'appointments') => {
    try {
      setLoading(true);

      if (type === 'vehicles') {
        const response = await api.get(`/api/vehicles?customerId=${customerId}`);
        setCustomerVehicles(response.data.data || []);
      } else if (type === 'appointments') {
        const response = await api.get(`/api/appointments?customerId=${customerId}`);
        setCustomerAppointments(response.data.data || []);
      }

      setModalType(type);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/auth/users/${customerId}`, { isActive: !currentStatus });
      toast.success(`Customer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update customer status');
    }
  };

  const filteredCustomers = (customers || []).filter(customer => {
    if (!customer) return false;
    const matchesSearch = searchTerm === '' ||
      customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && customer.isActive) ||
      (filterStatus === 'inactive' && !customer.isActive);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!['staff', 'admin'].includes(user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You need staff privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-2">View and manage customer accounts and their service history</p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="block border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Customers ({filteredCustomers.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-6 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {customer._id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {customer.email}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {customer.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TruckIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-900">{customer.vehicleCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-900">{customer.appointmentCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.lastLogin ? formatDate(customer.lastLogin) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              fetchCustomerDetails(customer._id, 'profile');
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              fetchCustomerDetails(customer._id, 'vehicles');
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="View Vehicles"
                          >
                            <TruckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              fetchCustomerDetails(customer._id, 'appointments');
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="View Appointments"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleCustomerStatus(customer._id, customer.isActive)}
                            className={`${
                              customer.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={customer.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalType === 'profile' && 'Customer Profile'}
                    {modalType === 'vehicles' && 'Customer Vehicles'}
                    {modalType === 'appointments' && 'Customer Appointments'}
                    : {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {modalType === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.firstName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedCustomer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Member Since</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedCustomer.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === 'vehicles' && (
                  <div className="space-y-4">
                    {customerVehicles.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No vehicles registered</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customerVehicles.map((vehicle) => (
                          <div key={vehicle._id} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h4>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <p><span className="font-medium">VIN:</span> {vehicle.vin}</p>
                              <p><span className="font-medium">Color:</span> {vehicle.color}</p>
                              <p><span className="font-medium">Battery:</span> {vehicle.batteryType}</p>
                              <p>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  vehicle.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {vehicle.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {modalType === 'appointments' && (
                  <div className="space-y-4">
                    {customerAppointments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No appointments found</p>
                    ) : (
                      <div className="space-y-4">
                        {customerAppointments.map((appointment) => (
                          <div key={appointment._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">#{appointment.appointmentNumber}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><span className="font-medium">Date:</span> {formatDate(appointment.scheduledDate)}</p>
                              <p><span className="font-medium">Services:</span> {appointment.services?.map(s => s.serviceId?.name || 'Unknown').filter(Boolean).join(', ') || 'No services'}</p>
                              <p><span className="font-medium">Total:</span> ${appointment.totalCost?.toFixed(2) || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;