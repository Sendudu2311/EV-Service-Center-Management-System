import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PartsSelection from '../components/Parts/PartsSelection';
import StatusActionButton from '../components/Common/StatusActionButton';
import ServiceReceptionModal from '../components/ServiceReception/ServiceReceptionModal';
import { DetailedAppointmentStatus } from '../types/appointment';

interface WorkQueueStats {
  pendingAppointments: number;
  inProgressAppointments: number;
  completedToday: number;
  averageCompletionTime: number;
}

interface Appointment {
  _id: string;
  appointmentNumber: string;
  customerId: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicleId: {
    make: string;
    model: string;
    year: number;
    vin: string;
  };
  services: Array<{
    serviceId: {
      name: string;
      category: string;
      estimatedDuration: number;
    };
    quantity: number;
  }>;
  scheduledDate: string;
  scheduledTime: string;
  status: DetailedAppointmentStatus;
  priority: string;
  customerNotes?: string;
  serviceNotes: Array<{
    note: string;
    addedBy: {
      firstName: string;
      lastName: string;
    };
    addedAt: string;
  }>;
  checklistItems: Array<{
    _id: string;
    item: string;
    isCompleted: boolean;
    completedBy?: {
      firstName: string;
      lastName: string;
    };
    completedAt?: string;
    notes?: string;
  }>;
  estimatedCompletion?: string;
}

const WorkQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'available'>('assigned');
  const [detailsTab, setDetailsTab] = useState<'overview' | 'checklist' | 'parts'>('overview');
  const [newNote, setNewNote] = useState('');
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [creatingReception, setCreatingReception] = useState(false);

  useEffect(() => {
    fetchWorkQueueData();
  }, [activeTab]);

  const fetchWorkQueueData = async () => {
    try {
      setLoading(true);

      // Fetch technician dashboard stats
      const statsResponse = await api.get('/api/dashboard/technician');
      setStats(statsResponse.data.data);

      // Fetch appointments based on active tab
      const appointmentsUrl = activeTab === 'assigned' 
        ? '/api/appointments?assignedTechnician=true' 
        : '/api/appointments?status=pending';
      
      const appointmentsResponse = await api.get(appointmentsUrl);
      setAppointments(appointmentsResponse.data.data || []);
    } catch (_error) { // Error handled by toast
      console.error('Error fetching work queue data:', error);
      toast.error('Failed to load work queue data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: DetailedAppointmentStatus) => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchWorkQueueData();
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleStatusAction = async (action: string, appointmentId: string) => {
    const appointment = appointments.find(apt => apt._id === appointmentId) || selectedAppointment;
    if (!appointment) return;

    // Map action to status or handle special cases
    let newStatus: DetailedAppointmentStatus | null = null;

    switch (action) {
      case 'confirm':
      case 'confirm_appointment':
        newStatus = 'confirmed';
        break;
      case 'checkIn':
      case 'mark_customer_arrived':
        newStatus = 'customer_arrived';
        break;
      case 'createReception':
      case 'create_reception':
        if (appointment.status === 'customer_arrived') {
          // Open the service reception modal instead of direct status change
          setSelectedAppointment(appointment);
          setShowReceptionModal(true);
          return;
        }
        newStatus = 'reception_created';
        break;
      case 'approveReception':
      case 'approve_reception':
        newStatus = 'reception_approved';
        break;
      case 'startWork':
      case 'start_work':
        newStatus = 'in_progress';
        break;
      case 'requestParts':
      case 'request_parts':
        newStatus = 'parts_requested';
        break;
      case 'complete':
      case 'complete_work':
        newStatus = 'completed';
        break;
      case 'invoice':
      case 'generate_invoice':
        newStatus = 'invoiced';
        break;
      case 'cancel':
      case 'cancel_appointment':
        // Handle cancellation with confirmation
        const confirmMessage = `Are you sure you want to cancel appointment #${appointment.appointmentNumber}?`;
        if (window.confirm(confirmMessage)) {
          newStatus = 'cancelled';
        } else {
          return;
        }
        break;
      case 'reschedule':
      case 'reschedule_appointment':
        newStatus = 'rescheduled';
        break;
      case 'view_details':
      case 'view_reception':
      case 'send_reminder':
      case 'contact_customer':
        // These are view/notification actions that don't change status
        console.log(`Handling view/action: ${action} for appointment ${appointmentId}`);
        return;
      default:
        // Only set as status if it's a valid status, otherwise log warning
        const validStatuses = ['pending', 'confirmed', 'customer_arrived', 'reception_created', 'reception_approved', 'in_progress', 'parts_insufficient', 'parts_requested', 'completed', 'invoiced', 'cancelled', 'no_show', 'rescheduled'];
        if (validStatuses.includes(action)) {
          newStatus = action as DetailedAppointmentStatus;
        } else {
          console.warn(`Unknown action: ${action}. Ignoring status update.`);
          return;
        }
    }

    if (newStatus) {
      await handleStatusUpdate(appointmentId, newStatus);
    }
  };

  const handleCreateServiceReception = async (receptionData: any) => {
    if (!selectedAppointment) return;

    try {
      setCreatingReception(true);

      // Map the services from appointment to the expected format
      const bookedServices = selectedAppointment.services?.map(service => ({
        serviceId: service.serviceId._id || service.serviceId,
        serviceName: service.serviceId.name || service.serviceId,
        category: service.serviceId.category || '',
        quantity: service.quantity || 1,
        estimatedDuration: service.serviceId.estimatedDuration || 60,
        isCompleted: false
      })) || [];

      const payload = {
        bookedServices,
        additionalServices: [],
        requestedParts: [],
        vehicleCondition: receptionData.vehicleCondition,
        customerItems: receptionData.customerItems,
        preServicePhotos: [],
        diagnosticCodes: [],
        specialInstructions: receptionData.specialInstructions,
        priorityLevel: receptionData.priorityLevel,
        estimatedServiceTime: receptionData.estimatedServiceTime
      };

      const response = await api.post(`/api/service-receptions/${selectedAppointment._id}/create`, payload);

      if (response.data.success) {
        toast.success('Tạo phiếu tiếp nhận thành công!');
        setShowReceptionModal(false);
        setSelectedAppointment(null);
        fetchWorkQueueData();
      }
    } catch (error: any) {
      console.error('Error creating service reception:', error);
      toast.error(error.response?.data?.message || 'Không thể tạo phiếu tiếp nhận');
    } finally {
      setCreatingReception(false);
    }
  };

  const handleAddServiceNote = async (appointmentId: string) => {
    if (!newNote.trim()) return;

    try {
      await api.put(`/api/appointments/${appointmentId}`, {
        addServiceNote: newNote
      });
      setNewNote('');
      toast.success('Service note added');
      fetchWorkQueueData();
      
      // Update selected appointment
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        const response = await api.get(`/api/appointments/${appointmentId}`);
        setSelectedAppointment(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add service note');
    }
  };

  const handleChecklistItemUpdate = async (appointmentId: string, itemId: string, isCompleted: boolean, notes?: string) => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, {
        updateChecklistItem: {
          itemId,
          isCompleted,
          notes
        }
      });
      toast.success('Checklist updated');
      
      // Update selected appointment
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        const response = await api.get(`/api/appointments/${appointmentId}`);
        setSelectedAppointment(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update checklist');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Work Queue</h1>
          <p className="text-gray-600 mt-2">Manage your assigned appointments and work tasks</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.pendingAppointments}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.inProgressAppointments}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Completed Today</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.completedToday}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg. Time (hours)</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.averageCompletionTime}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Appointments List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Appointments</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('assigned')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        activeTab === 'assigned'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      My Assignments
                    </button>
                    <button
                      onClick={() => setActiveTab('available')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        activeTab === 'available'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Available
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {appointments.length === 0 ? (
                  <div className="p-6 text-center">
                    <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {activeTab === 'assigned' ? 'No appointments assigned to you' : 'No available appointments'}
                    </p>
                  </div>
                ) : (
                  (appointments || []).map((appointment) => (
                    <div
                      key={appointment._id}
                      className={`p-6 hover:bg-gray-50 cursor-pointer ${
                        selectedAppointment?._id === appointment._id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                #{appointment.appointmentNumber}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                                {appointment.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {appointment.customerId.firstName} {appointment.customerId.lastName} • {appointment.vehicleId.make} {appointment.vehicleId.model}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(appointment.scheduledDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ')}
                          </span>
                          {appointment.priority === 'urgent' && (
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div className="mt-3">
                        <StatusActionButton
                          appointmentId={appointment._id}
                          currentStatus={appointment.status}
                          userRole="technician"
                          onAction={handleStatusAction}
                        />
                      </div>

                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {appointment.services?.map((service, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {service?.serviceId?.name || 'Unknown Service'}
                              {(service?.quantity || 0) > 1 && ` (${service.quantity})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            {selectedAppointment ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Appointment #{selectedAppointment.appointmentNumber}
                  </h3>
                  
                  {/* Detail Tabs */}
                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => setDetailsTab('overview')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        detailsTab === 'overview'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setDetailsTab('checklist')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        detailsTab === 'checklist'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Checklist
                    </button>
                    <button
                      onClick={() => setDetailsTab('parts')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        detailsTab === 'parts'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CubeIcon className="w-4 h-4 inline mr-1" />
                      Parts
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Overview Tab */}
                  {detailsTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Customer & Vehicle Info */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Customer & Vehicle</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Customer:</span> {selectedAppointment.customerId.firstName} {selectedAppointment.customerId.lastName}</p>
                          <p><span className="font-medium">Phone:</span> {selectedAppointment.customerId.phone}</p>
                          <p><span className="font-medium">Vehicle:</span> {selectedAppointment.vehicleId.year} {selectedAppointment.vehicleId.make} {selectedAppointment.vehicleId.model}</p>
                          <p><span className="font-medium">VIN:</span> {selectedAppointment.vehicleId.vin}</p>
                        </div>
                      </div>

                      {/* Services */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Services</h4>
                        <div className="space-y-2">
                          {(selectedAppointment.services || []).map((service, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{service?.serviceId?.name || 'Unknown Service'}</span>
                                <span className="text-sm text-gray-600">{service?.serviceId?.estimatedDuration || 0} mins</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Category: {service?.serviceId?.category || 'Unknown'}</p>
                              {service.quantity > 1 && (
                                <p className="text-sm text-gray-600">Quantity: {service.quantity}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Status Actions</h4>
                        <StatusActionButton
                          appointmentId={selectedAppointment._id}
                          currentStatus={selectedAppointment.status}
                          userRole="technician"
                          onAction={handleStatusAction}
                        />
                      </div>

                      {/* Service Notes */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Service Notes</h4>
                        <div className="space-y-2">
                          {(selectedAppointment.serviceNotes || []).map((note, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                              <p className="text-gray-900">{note.note}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                By {note.addedBy.firstName} {note.addedBy.lastName} on {formatDate(note.addedAt)}
                              </p>
                            </div>
                          ))}
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Add service note..."
                              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm"
                            />
                            <button
                              onClick={() => handleAddServiceNote(selectedAppointment._id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Checklist Tab */}
                  {detailsTab === 'checklist' && (
                    <div className="space-y-4">
                      {selectedAppointment.checklistItems && selectedAppointment.checklistItems.length > 0 ? (
                        <div className="space-y-2">
                          {(selectedAppointment.checklistItems || []).map((item) => (
                            <div key={item._id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={(e) => handleChecklistItemUpdate(selectedAppointment._id, item._id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className={`text-sm flex-1 ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {item.item}
                              </span>
                              {item.isCompleted && item.completedBy && (
                                <span className="text-xs text-gray-500">
                                  by {item.completedBy.firstName}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p>No checklist items for this appointment</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Parts Tab */}
                  {detailsTab === 'parts' && (
                    <PartsSelection
                      appointmentId={selectedAppointment._id}
                      serviceCategories={selectedAppointment.services?.map(s => s?.serviceId?.category).filter(Boolean) || []}
                      vehicleInfo={{
                        make: selectedAppointment.vehicleId.make,
                        model: selectedAppointment.vehicleId.model,
                        year: selectedAppointment.vehicleId.year
                      }}
                      mode={selectedAppointment.status === 'in_progress' ? 'use' : 'reserve'}
                      disabled={selectedAppointment.status === 'completed'}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select an appointment</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose an appointment from the list to view details and take actions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Reception Modal */}
      {showReceptionModal && selectedAppointment && (
        <ServiceReceptionModal
          appointment={selectedAppointment}
          isOpen={showReceptionModal}
          onClose={() => {
            setShowReceptionModal(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleCreateServiceReception}
          isLoading={creatingReception}
        />
      )}
    </div>
  );
};

export default WorkQueuePage;