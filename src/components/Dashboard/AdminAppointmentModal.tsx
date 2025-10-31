import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { appointmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/vietnamese';
import { format } from 'date-fns';

interface AdminAppointmentModalProps {
  appointmentId: string;
  onClose: () => void;
}

interface AppointmentDetail {
  _id: string;
  appointmentNumber: string;
  coreStatus: string;
  scheduledDate: string;
  completedDate?: string;
  actualCompletion?: string;
  estimatedCompletionTime?: string;
  priority: string;
  totalAmount: number;
  depositAmount?: number;
  depositInfo?: {
    amount: number;
    paid: boolean;
  };
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  vehicleId: {
    _id: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    color: string;
    batteryType: string;
    batteryCapacity: number;
  };
  services: Array<{
    serviceId: {
      _id: string;
      name: string;
      category: string;
      description: string;
      basePrice: number;
      estimatedDuration: number;
    };
    quantity: number;
    price: number;
    estimatedDuration: number;
  }>;
  assignedTechnician?: {
    _id: string;
    firstName: string;
    lastName: string;
    specializations: string[];
  };
  checklistItems?: Array<any>;
  partsUsed?: Array<{
    partId: {
      _id: string;
      name: string;
      partNumber: string;
    };
    quantity: number;
    unitPrice: number;
  }>;
  customerNotes?: string;
  serviceNotes?: Array<{
    note: string;
    addedBy?: {
      firstName: string;
      lastName: string;
    };
    addedAt: string;
  }>;
  workflowHistory?: Array<{
    status: string;
    changedAt: string;
    changedBy?: {
      firstName: string;
      lastName: string;
    };
    notes?: string;
    reason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const AdminAppointmentModal: React.FC<AdminAppointmentModalProps> = ({
  appointmentId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getById(appointmentId);
      setAppointment(response.data.data);
    } catch (error: any) {
      console.error('Error fetching appointment details:', error);
      toast.error('Failed to load appointment details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: 'bg-blue-600 text-white',
      CheckedIn: 'bg-yellow-600 text-white',
      InService: 'bg-purple-600 text-white',
      OnHold: 'bg-orange-600 text-white',
      ReadyForPickup: 'bg-green-600 text-white',
      Closed: 'bg-gray-600 text-white',
      Cancelled: 'bg-red-600 text-white',
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          colors[status] || 'bg-gray-600 text-white'
        }`}
      >
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      normal: 'bg-green-100 text-green-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[priority] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {priority.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"></div>
          <div className="inline-block align-middle bg-dark-300 rounded-lg p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="text-white mt-4">Loading appointment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-dark-300 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-dark-900 px-6 py-4 border-b border-dark-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold text-white">
                  Appointment #{appointment.appointmentNumber}
                </h3>
                {getStatusBadge(appointment.coreStatus)}
                {getPriorityBadge(appointment.priority)}
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <UserIcon className="h-5 w-5 text-lime-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Customer Information
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Name:</span>
                      <span className="text-sm text-white font-medium">
                        {appointment.customerId.firstName} {appointment.customerId.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Email:</span>
                      <span className="text-sm text-white">{appointment.customerId.email}</span>
                    </div>
                    {appointment.customerId.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">Phone:</span>
                        <span className="text-sm text-white">{appointment.customerId.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <TruckIcon className="h-5 w-5 text-lime-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Vehicle Information
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Vehicle:</span>
                      <span className="text-sm text-white font-medium">
                        {appointment.vehicleId.year} {appointment.vehicleId.make}{' '}
                        {appointment.vehicleId.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">VIN:</span>
                      <span className="text-sm text-white font-mono">
                        {appointment.vehicleId.vin}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Color:</span>
                      <span className="text-sm text-white">{appointment.vehicleId.color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Battery:</span>
                      <span className="text-sm text-white">
                        {appointment.vehicleId.batteryType} ({appointment.vehicleId.batteryCapacity}{' '}
                        kWh)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <CurrencyDollarIcon className="h-5 w-5 text-lime-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Financial Details
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {/* Services Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Services Subtotal:</span>
                      <span className="text-sm text-white">
                        {formatVND(
                          appointment.services.reduce((sum, s) => sum + s.price, 0)
                        )}
                      </span>
                    </div>

                    {/* Parts Subtotal */}
                    {appointment.partsUsed && appointment.partsUsed.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">Parts Subtotal:</span>
                        <span className="text-sm text-white">
                          {formatVND(
                            appointment.partsUsed.reduce(
                              (sum, p) => sum + p.unitPrice * p.quantity,
                              0
                            )
                          )}
                        </span>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-dark-200 pt-2 mt-2"></div>

                    {/* Total Amount */}
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted font-semibold">Total Amount:</span>
                      <span className="text-lg font-bold text-lime-400">
                        {formatVND(appointment.totalAmount)}
                      </span>
                    </div>

                    {/* Deposit */}
                    {appointment.depositInfo && (
                      <>
                        <div className="border-t border-dark-200 pt-2 mt-2"></div>
                        <div className="flex justify-between">
                          <span className="text-sm text-text-muted">Deposit:</span>
                          <span className="text-sm text-white">
                            {formatVND(appointment.depositInfo.amount)}{' '}
                            <span className={appointment.depositInfo.paid ? 'text-green-400' : 'text-orange-400'}>
                              ({appointment.depositInfo.paid ? 'Paid' : 'Unpaid'})
                            </span>
                          </span>
                        </div>
                        {appointment.depositInfo.paid && (
                          <div className="flex justify-between">
                            <span className="text-sm text-text-muted">Remaining:</span>
                            <span className="text-sm font-semibold text-orange-400">
                              {formatVND(appointment.totalAmount - appointment.depositInfo.amount)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Appointment Timeline */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <ClockIcon className="h-5 w-5 text-lime-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Timeline
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Created:</span>
                      <span className="text-sm text-white">
                        {format(new Date(appointment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Scheduled:</span>
                      <span className="text-sm text-white">
                        {format(new Date(appointment.scheduledDate), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {appointment.estimatedCompletionTime && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">Est. Completion:</span>
                        <span className="text-sm text-white">
                          {format(
                            new Date(appointment.estimatedCompletionTime),
                            'MMM dd, yyyy HH:mm'
                          )}
                        </span>
                      </div>
                    )}
                    {appointment.completedDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">Completed:</span>
                        <span className="text-sm text-green-400">
                          {format(new Date(appointment.completedDate), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Last Updated:</span>
                      <span className="text-sm text-white">
                        {format(new Date(appointment.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Requested Services */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-lime-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Requested Services ({appointment.services.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {appointment.services.map((service) => (
                      <div
                        key={service.serviceId._id}
                        className="bg-dark-300 rounded p-3 border border-dark-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{service.serviceId.name}</p>
                            <p className="text-xs text-text-muted mt-1">{service.serviceId.description}</p>
                          </div>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded ml-2">
                            {service.serviceId.category}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-dark-200">
                          <span className="text-xs text-text-muted">
                            ~{service.estimatedDuration} mins (Qty: {service.quantity})
                          </span>
                          <span className="text-sm font-semibold text-lime-400">
                            {formatVND(service.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parts Used */}
                {appointment.partsUsed && appointment.partsUsed.length > 0 && (
                  <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <CubeIcon className="h-5 w-5 text-lime-400" />
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                        Parts Used ({appointment.partsUsed.length})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {appointment.partsUsed.map((part, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-2 px-3 bg-dark-300 rounded border border-dark-200"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-white">{part.partId.name}</p>
                            <p className="text-xs text-text-muted">
                              {part.partId.partNumber} • Qty: {part.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-lime-400">
                            {formatVND(part.unitPrice * part.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Technician */}
                {appointment.assignedTechnician && (
                  <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <UserIcon className="h-5 w-5 text-lime-400" />
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                        Assigned Technician
                      </h4>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-dark-300 rounded border border-dark-200">
                      <span className="text-sm text-white">
                        {appointment.assignedTechnician.firstName} {appointment.assignedTechnician.lastName}
                      </span>
                      <div className="flex gap-1">
                        {appointment.assignedTechnician.specializations.slice(0, 2).map((spec, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-lime-600 text-dark-900 px-2 py-0.5 rounded"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {(appointment.customerNotes || appointment.serviceNotes) && (
                  <div className="bg-dark-900 rounded-lg p-4 border border-dark-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <DocumentTextIcon className="h-5 w-5 text-lime-400" />
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                        Notes
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {appointment.customerNotes && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Customer Notes:</p>
                          <p className="text-sm text-white bg-dark-300 p-2 rounded border border-dark-200">
                            {appointment.customerNotes}
                          </p>
                        </div>
                      )}
                      {appointment.serviceNotes && appointment.serviceNotes.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Service Notes:</p>
                          {appointment.serviceNotes.map((note, idx) => (
                            <div key={idx} className="text-sm text-white bg-dark-300 p-2 rounded border border-dark-200 mb-2">
                              <p>{note.note}</p>
                              {note.addedBy && (
                                <p className="text-xs text-text-muted mt-1">
                                  by {note.addedBy.firstName} {note.addedBy.lastName} - {format(new Date(note.addedAt), 'MMM dd, HH:mm')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status History - Full Width */}
            {appointment.workflowHistory && appointment.workflowHistory.length > 0 && (
              <div className="mt-6 bg-dark-900 rounded-lg p-4 border border-dark-200">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  Status History
                </h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dark-200"></div>
                  <div className="space-y-4">
                    {appointment.workflowHistory.map((history, idx) => (
                      <div key={idx} className="relative flex items-start pl-10">
                        <div className="absolute left-0 w-8 h-8 bg-lime-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-dark-900 font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1 bg-dark-300 rounded p-3 border border-dark-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              {getStatusBadge(history.status)}
                              {history.changedBy && (
                                <p className="text-xs text-text-muted mt-1">
                                  by {history.changedBy.firstName} {history.changedBy.lastName}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-text-muted">
                              {format(new Date(history.changedAt), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-white mt-2">{history.notes}</p>
                          )}
                          {history.reason && (
                            <p className="text-xs text-text-muted mt-1">Reason: {history.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-dark-900 px-6 py-4 border-t border-dark-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-dark-300 hover:bg-dark-200 text-white rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAppointmentModal;
