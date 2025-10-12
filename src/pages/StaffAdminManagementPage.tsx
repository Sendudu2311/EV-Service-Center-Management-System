import React, { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI, techniciansAPI, partRequestsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatVietnameseDateTime, formatVND, combineDateTime } from '../utils/vietnamese';
import { appointmentStatusTranslations } from '../types/appointment';

interface PendingAppointment {
  _id: string;
  appointmentNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
  };
  services: Array<{
    name: string;
    estimatedDuration: number;
  }>;
  scheduledDate: string;
  scheduledTime: string;
  priority: string;
  status: string;
  requestedTechnician?: {
    _id: string;
    name: string;
  };
}

interface AvailableTechnician {
  _id: string;
  name: string;
  specializations: string[];
  availability: {
    status: string;
    workloadPercentage: number;
  };
  skills: Array<{
    category: string;
    level: number;
    certified: boolean;
  }>;
  isRecommended?: boolean;
  matchingSkills?: string[];
}

interface PendingPartRequest {
  _id: string;
  appointmentId: string;
  appointmentNumber: string;
  customer: {
    name: string;
  };
  parts: Array<{
    partId: string;
    name: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    supplier: string;
    category: string;
    isAlternative?: boolean;
  }>;
  requestType: 'initial_service' | 'additional_during_service';
  totalCost: number;
  priority: string;
  requestedAt: string;
  technician: {
    name: string;
  };
  notes?: string;
}

const StaffAdminManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'parts'>('appointments');
  const [loading, setLoading] = useState(true);

  // Appointment assignment state
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<AvailableTechnician[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null);
  const [assigningTechnician, setAssigningTechnician] = useState(false);

  // Parts approval state
  const [pendingPartRequests, setPendingPartRequests] = useState<PendingPartRequest[]>([]);
  const [selectedPartRequest, setSelectedPartRequest] = useState<PendingPartRequest | null>(null);
  const [processingParts, setProcessingParts] = useState(false);

  // Filters and search
  const [appointmentFilters, setAppointmentFilters] = useState({
    search: '',
    priority: '',
    status: 'pending'
  });
  const [partFilters, setPartFilters] = useState({
    search: '',
    requestType: '',
    priority: ''
  });

  /**
   * Fetch pending appointments that need staff confirmation
   */
  const fetchPendingAppointments = useCallback(async () => {
    try {
      const response = await appointmentsAPI.getPendingStaffConfirmation({
        ...appointmentFilters,
        limit: 50
      });
      setPendingAppointments(response.data.data || []);
    } catch (error: unknown) {
      console.error('Error fetching pending appointments:', error);
      toast.error('Không thể tải danh sách lịch hẹn chờ xác nhận');
    }
  }, [appointmentFilters]);

  /**
   * Fetch available technicians for assignment
   */
  const fetchAvailableTechnicians = useCallback(async (appointment?: PendingAppointment) => {
    if (!appointment) return;

    try {
      const serviceCategories = appointment.services.map(s => s.name);
      const response = await appointmentsAPI.getAvailableTechnicians(
        appointment.scheduledDate,
        appointment.scheduledTime,
        appointment.services.reduce((total, s) => total + s.estimatedDuration, 0),
        serviceCategories
      );
      setAvailableTechnicians(response.data.data || []);
    } catch (error: unknown) {
      console.error('Error fetching technicians:', error);
      toast.error('Không thể tải danh sách kỹ thuật viên');
    }
  }, []);

  /**
   * Fetch pending part requests
   */
  const fetchPendingPartRequests = useCallback(async () => {
    try {
      const response = await partRequestsAPI.getPendingApprovals({
        ...partFilters,
        limit: 50
      });
      setPendingPartRequests(response.data.data || []);
    } catch (error: unknown) {
      console.error('Error fetching part requests:', error);
      toast.error('Không thể tải danh sách yêu cầu phụ tùng');
    }
  }, [partFilters]);

  /**
   * Assign technician to appointment
   */
  const assignTechnician = useCallback(async (appointmentId: string, technicianId: string) => {
    try {
      setAssigningTechnician(true);
      await appointmentsAPI.assignTechnician(appointmentId, technicianId);

      toast.success('Đã phân công kỹ thuật viên thành công');
      setSelectedAppointment(null);
      fetchPendingAppointments();
    } catch (error: unknown) {
      console.error('Error assigning technician:', error);
      toast.error('Không thể phân công kỹ thuật viên');
    } finally {
      setAssigningTechnician(false);
    }
  }, [fetchPendingAppointments]);

  /**
   * Confirm appointment without technician assignment
   */
  const confirmAppointment = useCallback(async (appointmentId: string, notes?: string) => {
    try {
      setAssigningTechnician(true);
      await appointmentsAPI.confirm(appointmentId, notes);

      toast.success('Đã xác nhận lịch hẹn thành công');
      setSelectedAppointment(null);
      fetchPendingAppointments();
    } catch (error: unknown) {
      console.error('Error confirming appointment:', error);
      toast.error('Không thể xác nhận lịch hẹn');
    } finally {
      setAssigningTechnician(false);
    }
  }, [fetchPendingAppointments]);

  /**
   * Reject appointment
   */
  const rejectAppointment = useCallback(async (appointmentId: string, reason: string) => {
    try {
      setAssigningTechnician(true);
      await appointmentsAPI.staffReject(appointmentId, reason);

      toast.success('Đã từ chối lịch hẹn');
      setSelectedAppointment(null);
      fetchPendingAppointments();
    } catch (error: unknown) {
      console.error('Error rejecting appointment:', error);
      toast.error('Không thể từ chối lịch hẹn');
    } finally {
      setAssigningTechnician(false);
    }
  }, [fetchPendingAppointments]);

  /**
   * Approve part request
   */
  const approvePartRequest = useCallback(async (requestId: string, approved: boolean, alternatives?: unknown[]) => {
    try {
      setProcessingParts(true);
      await partRequestsAPI.approve(requestId, {
        approved,
        alternatives: alternatives || [],
        reviewedAt: new Date().toISOString(),
        reviewerId: user?._id
      });

      toast.success(approved ? 'Đã phê duyệt yêu cầu phụ tùng' : 'Đã từ chối yêu cầu phụ tùng');
      setSelectedPartRequest(null);
      fetchPendingPartRequests();
    } catch (error: unknown) {
      console.error('Error processing part request:', error);
      toast.error('Không thể xử lý yêu cầu phụ tùng');
    } finally {
      setProcessingParts(false);
    }
  }, [user?._id, fetchPendingPartRequests]);

  // Effects
  useEffect(() => {
    if (user?.role === 'staff' || user?.role === 'admin') {
      setLoading(true);
      Promise.all([
        fetchPendingAppointments(),
        fetchPendingPartRequests()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchPendingAppointments, fetchPendingPartRequests]);

  useEffect(() => {
    if (selectedAppointment) {
      fetchAvailableTechnicians(selectedAppointment);
    }
  }, [selectedAppointment, fetchAvailableTechnicians]);

  if (user?.role !== 'staff' && user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Trang này chỉ dành cho nhân viên và quản trị viên.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Đang tải dữ liệu quản lý...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý nhân viên</h1>
        <p className="mt-2 text-gray-600">
          Phân công kỹ thuật viên và phê duyệt yêu cầu phụ tùng
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              Lịch hẹn chờ xác nhận ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'parts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
              Yêu cầu phụ tùng ({pendingPartRequests.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên khách hàng, số lịch hẹn..."
                      value={appointmentFilters.search}
                      onChange={(e) => setAppointmentFilters({ ...appointmentFilters, search: e.target.value })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={appointmentFilters.priority}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, priority: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả độ ưu tiên</option>
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  <button
                    onClick={fetchPendingAppointments}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-4">
                {pendingAppointments.map((appointment) => (
                  <div key={appointment._id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            #{appointment.appointmentNumber}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            appointment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.priority === 'urgent' ? 'Khẩn cấp' :
                             appointment.priority === 'high' ? 'Cao' :
                             appointment.priority === 'normal' ? 'Bình thường' : 'Thấp'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {appointmentStatusTranslations[appointment.status as keyof typeof appointmentStatusTranslations]}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Khách hàng:</span> {appointment.customer.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Điện thoại:</span> {appointment.customer.phone}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Xe:</span> {appointment.vehicle.make} {appointment.vehicle.model}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Biển số:</span> {appointment.vehicle.licensePlate}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Ngày hẹn:</span> {formatVietnameseDateTime(combineDateTime(appointment.scheduledDate, appointment.scheduledTime))}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-600 mb-1">Dịch vụ:</p>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {appointment.services.map((service, index) => (
                                  <li key={index}>• {service.name} ({service.estimatedDuration}ph)</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Phân công KTV
                        </button>
                        <button
                          onClick={() => confirmAppointment(appointment._id)}
                          disabled={assigningTechnician}
                          className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
                        >
                          Xác nhận
                        </button>
                        <button
                          onClick={() => rejectAppointment(appointment._id, 'Không đủ điều kiện thực hiện')}
                          disabled={assigningTechnician}
                          className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {pendingAppointments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Không có lịch hẹn nào cần xác nhận.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên khách hàng, số lịch hẹn..."
                      value={partFilters.search}
                      onChange={(e) => setPartFilters({ ...partFilters, search: e.target.value })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={partFilters.requestType}
                    onChange={(e) => setPartFilters({ ...partFilters, requestType: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả loại yêu cầu</option>
                    <option value="initial_service">Dịch vụ ban đầu</option>
                    <option value="additional_during_service">Phụ tùng bổ sung</option>
                  </select>
                  <select
                    value={partFilters.priority}
                    onChange={(e) => setPartFilters({ ...partFilters, priority: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả độ ưu tiên</option>
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  <button
                    onClick={fetchPendingPartRequests}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Part Requests List */}
              <div className="space-y-4">
                {pendingPartRequests.map((request) => (
                  <div key={request._id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            #{request.appointmentNumber}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.requestType === 'additional_during_service' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {request.requestType === 'additional_during_service' ? 'Phụ tùng bổ sung' : 'Dịch vụ ban đầu'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {request.priority === 'urgent' ? 'Khẩn cấp' :
                             request.priority === 'high' ? 'Cao' :
                             request.priority === 'normal' ? 'Bình thường' : 'Thấp'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Khách hàng:</span> {request.customer.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Kỹ thuật viên:</span> {request.technician.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Yêu cầu lúc:</span> {formatVietnameseDateTime(request.requestedAt)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Tổng chi phí:</span> {formatVND(request.totalCost)}
                            </p>
                          </div>
                          <div>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-600 mb-1">Phụ tùng yêu cầu:</p>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {request.parts.slice(0, 3).map((part, index) => (
                                  <li key={index}>
                                    • {part.name} x{part.quantity} - {formatVND(part.unitPrice * part.quantity)}
                                  </li>
                                ))}
                                {request.parts.length > 3 && (
                                  <li className="text-gray-500">+ {request.parts.length - 3} phụ tùng khác</li>
                                )}
                              </ul>
                            </div>
                            {request.notes && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-600">Ghi chú:</p>
                                <p className="text-sm text-gray-600">{request.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedPartRequest(request)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => approvePartRequest(request._id, true)}
                          disabled={processingParts}
                          className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1 inline" />
                          Phê duyệt
                        </button>
                        <button
                          onClick={() => approvePartRequest(request._id, false)}
                          disabled={processingParts}
                          className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1 inline" />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {pendingPartRequests.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <WrenchScrewdriverIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Không có yêu cầu phụ tùng nào cần phê duyệt.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technician Assignment Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Phân công kỹ thuật viên - #{selectedAppointment.appointmentNumber}
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Khách hàng:</span> {selectedAppointment.customer.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Thời gian:</span> {formatVietnameseDateTime(combineDateTime(selectedAppointment.scheduledDate, selectedAppointment.scheduledTime))}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Dịch vụ:</span> {selectedAppointment.services.map(s => s.name).join(', ')}
                </p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableTechnicians.map((technician) => (
                  <div key={technician._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">{technician.name}</h4>
                        {technician.isRecommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Khuyến nghị
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          technician.availability.status === 'available' ? 'bg-green-100 text-green-800' :
                          technician.availability.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {technician.availability.status === 'available' ? 'Sẵn sàng' :
                           technician.availability.status === 'busy' ? 'Bận' : 'Ngoại tuyến'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        <p>Tải công việc: {technician.availability.workloadPercentage}%</p>
                        <p>Chuyên môn: {technician.specializations.join(', ')}</p>
                        {technician.matchingSkills && technician.matchingSkills.length > 0 && (
                          <p className="text-green-600">Kỹ năng phù hợp: {technician.matchingSkills.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => assignTechnician(selectedAppointment._id, technician._id)}
                      disabled={assigningTechnician}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {assigningTechnician ? 'Đang phân công...' : 'Phân công'}
                    </button>
                  </div>
                ))}

                {availableTechnicians.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Không có kỹ thuật viên nào khả dụng trong khung giờ này.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => confirmAppointment(selectedAppointment._id, 'Xác nhận không phân công kỹ thuật viên')}
                  disabled={assigningTechnician}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  Xác nhận không phân công
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part Request Detail Modal */}
      {selectedPartRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Chi tiết yêu cầu phụ tùng - #{selectedPartRequest.appointmentNumber}
                </h3>
                <button
                  onClick={() => setSelectedPartRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Khách hàng:</span> {selectedPartRequest.customer.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Kỹ thuật viên:</span> {selectedPartRequest.technician.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Loại yêu cầu:</span> {
                        selectedPartRequest.requestType === 'additional_during_service' ? 'Phụ tùng bổ sung' : 'Dịch vụ ban đầu'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Thời gian yêu cầu:</span> {formatVietnameseDateTime(selectedPartRequest.requestedAt)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Độ ưu tiên:</span> {
                        selectedPartRequest.priority === 'urgent' ? 'Khẩn cấp' :
                        selectedPartRequest.priority === 'high' ? 'Cao' :
                        selectedPartRequest.priority === 'normal' ? 'Bình thường' : 'Thấp'
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tổng chi phí:</span> <span className="font-semibold text-green-600">{formatVND(selectedPartRequest.totalCost)}</span>
                    </p>
                  </div>
                </div>
                {selectedPartRequest.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Ghi chú từ kỹ thuật viên:</p>
                    <p className="text-sm text-gray-600 mt-1 p-2 bg-white rounded border">{selectedPartRequest.notes}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Danh sách phụ tùng</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nhà cung cấp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số lượng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPartRequest.parts.map((part, index) => (
                        <tr key={index} className={part.isAlternative ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{part.name}</div>
                            <div className="text-sm text-gray-500">{part.category}</div>
                            {part.isAlternative && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                Thay thế
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {part.partNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {part.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {part.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatVND(part.unitPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatVND(part.unitPrice * part.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPartRequest(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => approvePartRequest(selectedPartRequest._id, false)}
                  disabled={processingParts}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4 mr-1 inline" />
                  Từ chối
                </button>
                <button
                  onClick={() => approvePartRequest(selectedPartRequest._id, true)}
                  disabled={processingParts}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1 inline" />
                  Phê duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAdminManagementPage;