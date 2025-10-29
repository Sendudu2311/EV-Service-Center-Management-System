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
        <UserGroupIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg text-text-muted text-white mb-2">Không có quyền truy cập</h3>
        <p className="text-text-muted">Trang này chỉ dành cho nhân viên và quản trị viên.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-text-muted">Đang tải dữ liệu quản lý...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quản lý nhân viên</h1>
        <p className="mt-2 text-text-secondary">
          Phân công kỹ thuật viên và phê duyệt yêu cầu phụ tùng
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-dark-300 shadow rounded-lg">
        <div className="border-b border-dark-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`group inline-flex items-center py-4 px-6 border-b-2 text-text-muted text-sm ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-lime-600'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
              }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              Lịch hẹn chờ xác nhận ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={`group inline-flex items-center py-4 px-6 border-b-2 text-text-muted text-sm ${
                activeTab === 'parts'
                  ? 'border-blue-500 text-lime-600'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
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
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên khách hàng, số lịch hẹn..."
                      value={appointmentFilters.search}
                      onChange={(e) => setAppointmentFilters({ ...appointmentFilters, search: e.target.value })}
                      className="pl-10 w-full border border-dark-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={appointmentFilters.priority}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, priority: e.target.value })}
                    className="border border-dark-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả độ ưu tiên</option>
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  <button
                    onClick={fetchPendingAppointments}
                    className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-4">
                {pendingAppointments.map((appointment) => (
                  <div key={appointment._id} className="bg-dark-300 border border-dark-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg text-text-muted text-white">
                            #{appointment.appointmentNumber}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${
                            appointment.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            appointment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-lime-100 text-lime-800'
                          }`}>
                            {appointment.priority === 'urgent' ? 'Khẩn cấp' :
                             appointment.priority === 'high' ? 'Cao' :
                             appointment.priority === 'normal' ? 'Bình thường' : 'Thấp'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-dark-300 text-yellow-600">
                            {appointmentStatusTranslations[appointment.status as keyof typeof appointmentStatusTranslations]}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Khách hàng:</span> {appointment.customer.name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Điện thoại:</span> {appointment.customer.phone}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Xe:</span> {appointment.vehicle.make} {appointment.vehicle.model}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Biển số:</span> {appointment.vehicle.licensePlate}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Ngày hẹn:</span> {formatVietnameseDateTime(combineDateTime(appointment.scheduledDate, appointment.scheduledTime))}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm text-text-muted text-text-secondary mb-1">Dịch vụ:</p>
                              <ul className="text-sm text-text-secondary space-y-1">
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
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-white bg-lime-600 hover:bg-lime-500 hover:text-dark-900 transition-all duration-200 transform hover:scale-105"
                        >
                          Phân công KTV
                        </button>
                        <button
                          onClick={() => confirmAppointment(appointment._id)}
                          disabled={assigningTechnician}
                          className="px-4 py-2 border border-green-300 rounded-md text-sm text-text-muted text-green-700 bg-dark-300 hover:bg-green-50 disabled:opacity-50"
                        >
                          Xác nhận
                        </button>
                        <button
                          onClick={() => rejectAppointment(appointment._id, 'Không đủ điều kiện thực hiện')}
                          disabled={assigningTechnician}
                          className="px-4 py-2 border border-red-300 rounded-md text-sm text-text-muted text-red-700 bg-dark-300 hover:bg-red-50 disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {pendingAppointments.length === 0 && (
                  <div className="text-center py-12 text-text-muted">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                    <p className="text-white">Không có lịch hẹn nào cần xác nhận.</p>
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
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên khách hàng, số lịch hẹn..."
                      value={partFilters.search}
                      onChange={(e) => setPartFilters({ ...partFilters, search: e.target.value })}
                      className="pl-10 w-full border border-dark-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={partFilters.requestType}
                    onChange={(e) => setPartFilters({ ...partFilters, requestType: e.target.value })}
                    className="border border-dark-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả loại yêu cầu</option>
                    <option value="initial_service">Dịch vụ ban đầu</option>
                    <option value="additional_during_service">Phụ tùng bổ sung</option>
                  </select>
                  <select
                    value={partFilters.priority}
                    onChange={(e) => setPartFilters({ ...partFilters, priority: e.target.value })}
                    className="border border-dark-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả độ ưu tiên</option>
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  <button
                    onClick={fetchPendingPartRequests}
                    className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Part Requests List */}
              <div className="space-y-4">
                {pendingPartRequests.map((request) => (
                  <div key={request._id} className="bg-dark-300 border border-dark-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg text-text-muted text-white">
                            #{request.appointmentNumber}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${
                            request.requestType === 'additional_during_service' ? 'bg-orange-100 text-orange-800' : 'bg-lime-100 text-lime-800'
                          }`}>
                            {request.requestType === 'additional_during_service' ? 'Phụ tùng bổ sung' : 'Dịch vụ ban đầu'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-lime-100 text-lime-800'
                          }`}>
                            {request.priority === 'urgent' ? 'Khẩn cấp' :
                             request.priority === 'high' ? 'Cao' :
                             request.priority === 'normal' ? 'Bình thường' : 'Thấp'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Khách hàng:</span> {request.customer.name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Kỹ thuật viên:</span> {request.technician.name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Yêu cầu lúc:</span> {formatVietnameseDateTime(request.requestedAt)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              <span className="text-text-muted">Tổng chi phí:</span> {formatVND(request.totalCost)}
                            </p>
                          </div>
                          <div>
                            <div className="mt-2">
                              <p className="text-sm text-text-muted text-text-secondary mb-1">Phụ tùng yêu cầu:</p>
                              <ul className="text-sm text-text-secondary space-y-1">
                                {request.parts.slice(0, 3).map((part, index) => (
                                  <li key={index}>
                                    • {part.name} x{part.quantity} - {formatVND(part.unitPrice * part.quantity)}
                                  </li>
                                ))}
                                {request.parts.length > 3 && (
                                  <li className="text-text-muted">+ {request.parts.length - 3} phụ tùng khác</li>
                                )}
                              </ul>
                            </div>
                            {request.notes && (
                              <div className="mt-2">
                                <p className="text-sm text-text-muted text-text-secondary">Ghi chú:</p>
                                <p className="text-sm text-text-secondary">{request.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedPartRequest(request)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => approvePartRequest(request._id, true)}
                          disabled={processingParts}
                          className="px-4 py-2 border border-green-300 rounded-md text-sm text-text-muted text-green-700 bg-dark-300 hover:bg-green-50 disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1 inline" />
                          Phê duyệt
                        </button>
                        <button
                          onClick={() => approvePartRequest(request._id, false)}
                          disabled={processingParts}
                          className="px-4 py-2 border border-red-300 rounded-md text-sm text-text-muted text-red-700 bg-dark-300 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1 inline" />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {pendingPartRequests.length === 0 && (
                  <div className="text-center py-12 text-text-muted">
                    <WrenchScrewdriverIcon className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                    <p className="text-white">Không có yêu cầu phụ tùng nào cần phê duyệt.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technician Assignment Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-dark-300">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-text-muted text-white">
                  Phân công kỹ thuật viên - #{selectedAppointment.appointmentNumber}
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-dark-900 rounded-lg">
                <p className="text-sm text-text-secondary">
                  <span className="text-text-muted">Khách hàng:</span> {selectedAppointment.customer.name}
                </p>
                <p className="text-sm text-text-secondary">
                  <span className="text-text-muted">Thời gian:</span> {formatVietnameseDateTime(combineDateTime(selectedAppointment.scheduledDate, selectedAppointment.scheduledTime))}
                </p>
                <p className="text-sm text-text-secondary">
                  <span className="text-text-muted">Dịch vụ:</span> {selectedAppointment.services.map(s => s.name).join(', ')}
                </p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableTechnicians.map((technician) => (
                  <div key={technician._id} className="flex items-center justify-between p-4 border border-dark-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm text-text-muted text-white">{technician.name}</h4>
                        {technician.isRecommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dark-300 text-green-600">
                            Khuyến nghị
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-text-muted ${
                          technician.availability.status === 'available' ? 'bg-green-100 text-green-800' :
                          technician.availability.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-dark-100 text-gray-800'
                        }`}>
                          {technician.availability.status === 'available' ? 'Sẵn sàng' :
                           technician.availability.status === 'busy' ? 'Bận' : 'Ngoại tuyến'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-text-muted">
                        <p className="text-white">Tải công việc: {technician.availability.workloadPercentage}%</p>
                        <p className="text-white">Chuyên môn: {technician.specializations.join(', ')}</p>
                        {technician.matchingSkills && technician.matchingSkills.length > 0 && (
                          <p className="text-green-600">Kỹ năng phù hợp: {technician.matchingSkills.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => assignTechnician(selectedAppointment._id, technician._id)}
                      disabled={assigningTechnician}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                    >
                      {assigningTechnician ? 'Đang phân công...' : 'Phân công'}
                    </button>
                  </div>
                ))}

                {availableTechnicians.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                    <p className="text-white">Không có kỹ thuật viên nào khả dụng trong khung giờ này.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
                >
                  Hủy
                </button>
                <button
                  onClick={() => confirmAppointment(selectedAppointment._id, 'Xác nhận không phân công kỹ thuật viên')}
                  disabled={assigningTechnician}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-dark-300">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-text-muted text-white">
                  Chi tiết yêu cầu phụ tùng - #{selectedPartRequest.appointmentNumber}
                </h3>
                <button
                  onClick={() => setSelectedPartRequest(null)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-dark-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Khách hàng:</span> {selectedPartRequest.customer.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Kỹ thuật viên:</span> {selectedPartRequest.technician.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Loại yêu cầu:</span> {
                        selectedPartRequest.requestType === 'additional_during_service' ? 'Phụ tùng bổ sung' : 'Dịch vụ ban đầu'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Thời gian yêu cầu:</span> {formatVietnameseDateTime(selectedPartRequest.requestedAt)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Độ ưu tiên:</span> {
                        selectedPartRequest.priority === 'urgent' ? 'Khẩn cấp' :
                        selectedPartRequest.priority === 'high' ? 'Cao' :
                        selectedPartRequest.priority === 'normal' ? 'Bình thường' : 'Thấp'
                      }
                    </p>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-muted">Tổng chi phí:</span> <span className="font-semibold text-green-600">{formatVND(selectedPartRequest.totalCost)}</span>
                    </p>
                  </div>
                </div>
                {selectedPartRequest.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-text-muted text-text-secondary">Ghi chú từ kỹ thuật viên:</p>
                    <p className="text-sm text-text-secondary mt-1 p-2 bg-dark-300 rounded border">{selectedPartRequest.notes}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-md text-text-muted text-white mb-4">Danh sách phụ tùng</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-dark-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Mã phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Nhà cung cấp
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Số lượng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-300 divide-y divide-gray-200">
                      {selectedPartRequest.parts.map((part, index) => (
                        <tr key={index} className={part.isAlternative ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-text-muted text-white">{part.name}</div>
                            <div className="text-sm text-text-muted">{part.category}</div>
                            {part.isAlternative && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dark-300 text-yellow-600 mt-1">
                                Thay thế
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {part.partNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {part.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {part.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {formatVND(part.unitPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted text-white">
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
                  className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
                >
                  Đóng
                </button>
                <button
                  onClick={() => approvePartRequest(selectedPartRequest._id, false)}
                  disabled={processingParts}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4 mr-1 inline" />
                  Từ chối
                </button>
                <button
                  onClick={() => approvePartRequest(selectedPartRequest._id, true)}
                  disabled={processingParts}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
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
