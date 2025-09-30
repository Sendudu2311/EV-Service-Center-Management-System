import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { serviceReceptionAPI, appointmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardDocumentListIcon,
  // PhotoIcon, // Unused import
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  ServiceReception,
  ServiceReceptionFormData,
  // EVChecklistItem, // Unused import
  // serviceReceptionStatusTranslations, // Unused import
  // vehicleConditionTranslations, // Unused import
  // urgencyTranslations // Unused import
} from '../types/serviceReception';
import { Appointment } from '../types/appointment';
import { formatVietnameseDateTime, formatVND, combineDateTime } from '../utils/vietnamese';

// Validation schema
const serviceReceptionSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  assignedTechnician: z.string().optional(),
  customerComplaints: z.array(z.string()).min(1, 'At least one complaint is required'),
  customerRequests: z.array(z.string()),
  customerNotes: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  estimatedCompletionDate: z.string().min(1, 'Estimated completion date is required'),
  internalNotes: z.string().optional(),
});

const ServiceReceptionPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [serviceReception, setServiceReception] = useState<ServiceReception | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'condition' | 'services' | 'checklist' | 'estimate'>('basic');
  const [newComplaint, setNewComplaint] = useState('');
  const [newRequest, setNewRequest] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ServiceReceptionFormData>({
    resolver: zodResolver(serviceReceptionSchema),
    defaultValues: {
      customerComplaints: [],
      customerRequests: [],
      priority: 'normal',
    }
  });

  const watchedComplaints = watch('customerComplaints');
  const watchedRequests = watch('customerRequests');

  useEffect(() => {
    if (appointmentId) {
      fetchData();
    }
  }, [appointmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch appointment details
      const appointmentResponse = await appointmentsAPI.getById(appointmentId!);
      const appointmentData = appointmentResponse.data.data || appointmentResponse.data;
      setAppointment(appointmentData);

      // Set form values from appointment
      setValue('appointmentId', appointmentData._id);
      setValue('customerId', appointmentData.customerId._id);
      setValue('vehicleId', appointmentData.vehicleId._id);
      if (appointmentData.assignedTechnician) {
        setValue('assignedTechnician', appointmentData.assignedTechnician._id);
      }

      // Try to fetch existing service reception
      try {
        const receptionResponse = await serviceReceptionAPI.getAll({
          appointmentId: appointmentId
        });
        const receptions = receptionResponse.data.data || receptionResponse.data;
        if (receptions.length > 0) {
          const existingReception = receptions[0];
          setServiceReception(existingReception);

          // Populate form with existing data
          setValue('customerComplaints', existingReception.customerComplaints);
          setValue('customerRequests', existingReception.customerRequests);
          setValue('customerNotes', existingReception.customerNotes || '');
          setValue('priority', existingReception.priority);
          setValue('estimatedCompletionDate', existingReception.estimatedCompletionDate.split('T')[0]);
          setValue('internalNotes', existingReception.internalNotes || '');
        }
      } catch (_error) { // Error handled by toast
        // No existing reception - this is fine for new ones
        console.log('No existing service reception found');
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải thông tin lịch hẹn');
      navigate('/appointments');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ServiceReceptionFormData) => {
    try {
      setSaving(true);

      const receptionData = {
        ...data,
        vehicleCondition: getDefaultVehicleCondition(),
        plannedServices: (appointment?.services || []).map(service => ({
          serviceId: typeof service.serviceId === 'string' ? service.serviceId : service.serviceId._id,
          serviceName: service.serviceName,
          description: service.description || '',
          category: service.category,
          estimatedDuration: service.estimatedDuration || 60,
          estimatedCost: service.totalPrice,
          priority: data.priority,
          requiredParts: [],
          notes: ''
        })) || [],
        additionalServicesRecommended: [],
        partsNeeded: [],
      };

      let response;
      if (serviceReception) {
        response = await serviceReceptionAPI.update(appointmentId!, receptionData);
        toast.success('Đã cập nhật phiếu tiếp nhận dịch vụ');
      } else {
        response = await serviceReceptionAPI.create(appointmentId!, receptionData);
        toast.success('Đã tạo phiếu tiếp nhận dịch vụ');
      }

      const savedReception = response.data.data || response.data;
      setServiceReception(savedReception);

      // Update appointment status
      await appointmentsAPI.updateStatus(appointmentId!, 'reception_created');

      // Emit socket event
      if (socket) {
        socket.emit('service_reception_created', {
          appointmentId: appointmentId,
          receptionId: savedReception._id,
          appointmentNumber: appointment?.appointmentNumber,
          technicianId: user?._id
        });
      }

    } catch (error: any) {
      console.error('Error saving service reception:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu phiếu tiếp nhận');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultVehicleCondition = () => ({
    exterior: {
      condition: 'good' as const,
      damages: [],
      notes: ''
    },
    interior: {
      condition: 'good' as const,
      issues: [],
      notes: ''
    },
    underHood: {
      condition: 'good' as const,
      findings: []
    },
    battery: {
      currentCharge: 0,
      voltage: 0,
      temperature: 0,
      chargeCycles: 0,
      healthStatus: 'good' as const,
      estimatedRange: 0,
      chargingPortCondition: 'good' as const,
      issues: []
    },
    tires: {
      frontLeft: { pressure: 0, treadDepth: 0, condition: 'good' },
      frontRight: { pressure: 0, treadDepth: 0, condition: 'good' },
      rearLeft: { pressure: 0, treadDepth: 0, condition: 'good' },
      rearRight: { pressure: 0, treadDepth: 0, condition: 'good' }
    }
  });

  const addComplaint = () => {
    if (newComplaint.trim()) {
      const currentComplaints = watchedComplaints || [];
      setValue('customerComplaints', [...currentComplaints, newComplaint.trim()]);
      setNewComplaint('');
    }
  };

  const removeComplaint = (index: number) => {
    const currentComplaints = watchedComplaints || [];
    setValue('customerComplaints', currentComplaints.filter((_, i) => i !== index));
  };

  const addRequest = () => {
    if (newRequest.trim()) {
      const currentRequests = watchedRequests || [];
      setValue('customerRequests', [...currentRequests, newRequest.trim()]);
      setNewRequest('');
    }
  };

  const removeRequest = (index: number) => {
    const currentRequests = watchedRequests || [];
    setValue('customerRequests', currentRequests.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Không tìm thấy lịch hẹn</h3>
          <p className="mt-1 text-sm text-gray-500">Lịch hẹn không tồn tại hoặc đã bị xóa.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/appointments')}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Quay lại danh sách lịch hẹn
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', name: 'Thông tin cơ bản', icon: ClipboardDocumentListIcon },
    { id: 'condition', name: 'Tình trạng xe', icon: ExclamationTriangleIcon },
    { id: 'services', name: 'Dịch vụ', icon: CheckCircleIcon },
    { id: 'checklist', name: 'Checklist EV', icon: CheckCircleIcon },
    { id: 'estimate', name: 'Báo giá', icon: CheckCircleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Phiếu tiếp nhận dịch vụ
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Lịch hẹn #{appointment.appointmentNumber} - {appointment.customerId.firstName} {appointment.customerId.lastName}
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            <button
              onClick={() => navigate('/appointments')}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <XMarkIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Hủy
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                  {serviceReception ? 'Cập nhật' : 'Tạo phiếu'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Appointment Summary */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin lịch hẹn</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Khách hàng</p>
                <p className="text-sm text-gray-900">{appointment.customerId.firstName} {appointment.customerId.lastName}</p>
                <p className="text-sm text-gray-500">{appointment.customerId.phone}</p>
                <p className="text-sm text-gray-500">{appointment.customerId.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Xe</p>
                <p className="text-sm text-gray-900">
                  {appointment.vehicleId.make} {appointment.vehicleId.model} {appointment.vehicleId.year}
                </p>
                <p className="text-sm text-gray-500">Biển số: {appointment.vehicleId.licensePlate}</p>
                <p className="text-sm text-gray-500">VIN: {appointment.vehicleId.vin}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lịch hẹn</p>
                <p className="text-sm text-gray-900">
                  {appointment?.scheduledDate && appointment?.scheduledTime
                    ? formatVietnameseDateTime(combineDateTime(appointment.scheduledDate, appointment.scheduledTime))
                    : 'Chưa có thời gian'}
                </p>
                <p className="text-sm text-gray-500">
                  Chi phí ước tính: {formatVND(appointment.estimatedCost)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-6 py-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Độ ưu tiên *
                    </label>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="low">Thấp</option>
                          <option value="normal">Bình thường</option>
                          <option value="high">Cao</option>
                          <option value="urgent">Khẩn cấp</option>
                        </select>
                      )}
                    />
                    {errors.priority && (
                      <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày hoàn thành dự kiến *
                    </label>
                    <Controller
                      name="estimatedCompletionDate"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="date"
                          {...field}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      )}
                    />
                    {errors.estimatedCompletionDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.estimatedCompletionDate.message}</p>
                    )}
                  </div>
                </div>

                {/* Customer Complaints */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khiếu nại của khách hàng *
                  </label>
                  <div className="space-y-2">
                    {watchedComplaints?.map((complaint, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-50 p-2 rounded border">
                          {complaint}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeComplaint(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newComplaint}
                        onChange={(e) => setNewComplaint(e.target.value)}
                        placeholder="Nhập khiếu nại mới..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addComplaint()}
                      />
                      <button
                        type="button"
                        onClick={addComplaint}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {errors.customerComplaints && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerComplaints.message}</p>
                  )}
                </div>

                {/* Customer Requests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yêu cầu của khách hàng
                  </label>
                  <div className="space-y-2">
                    {watchedRequests?.map((request, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-50 p-2 rounded border">
                          {request}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRequest(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newRequest}
                        onChange={(e) => setNewRequest(e.target.value)}
                        placeholder="Nhập yêu cầu mới..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addRequest()}
                      />
                      <button
                        type="button"
                        onClick={addRequest}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú của khách hàng
                    </label>
                    <Controller
                      name="customerNotes"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          rows={4}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Ghi chú từ khách hàng..."
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú nội bộ
                    </label>
                    <Controller
                      name="internalNotes"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          rows={4}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Ghi chú nội bộ..."
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs content will be implemented in separate components */}
            {activeTab === 'condition' && (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Đánh giá tình trạng xe</h3>
                <p className="mt-1 text-sm text-gray-500">Tính năng này sẽ được triển khai trong phiên bản tiếp theo.</p>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="text-center py-12">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Quản lý dịch vụ</h3>
                <p className="mt-1 text-sm text-gray-500">Tính năng này sẽ được triển khai trong phiên bản tiếp theo.</p>
              </div>
            )}

            {activeTab === 'checklist' && (
              <div className="text-center py-12">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Checklist EV</h3>
                <p className="mt-1 text-sm text-gray-500">Tính năng này sẽ được triển khai trong phiên bản tiếp theo.</p>
              </div>
            )}

            {activeTab === 'estimate' && (
              <div className="text-center py-12">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Báo giá chi tiết</h3>
                <p className="mt-1 text-sm text-gray-500">Tính năng này sẽ được triển khai trong phiên bản tiếp theo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceReceptionPage;