import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarIcon as Calendar,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle,
  ExclamationCircleIcon,
  UserGroupIcon as Users,
  UserPlusIcon,
  XMarkIcon as X,
  UserIcon as User,
  BoltIcon as Zap,
  ArrowPathIcon as RefreshCw,
  ClipboardDocumentCheckIcon as ClipboardCheck
} from '@heroicons/react/24/outline';
import { dashboardAPI, appointmentsAPI, serviceReceptionAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useDebouncedFetch } from '../../hooks/useDebouncedFetch';
import { format } from 'date-fns';
import TechnicianSelection from '../Appointment/TechnicianSelection';
import ServiceReceptionReview from '../ServiceReception/ServiceReceptionReview';

interface DashboardData {
  stats: {
    todayAppointments: number;
    weeklyAppointments: number;
    pendingAppointments: number;
    completedToday: number;
  };
  todaysAppointments: Array<{
    _id: string;
    appointmentNumber: string;
    scheduledTime: string;
    status: string;
    customer: string;
    vehicle: string;
    services: string[];
    technician: string;
    estimatedDuration: number;
  }>;
  totalVehicles: number;
  totalAppointmentsToday: number;
  pendingAppointments: number;
  inProgressAppointments: number;
  completedThisWeek: number;
  recentAppointments: any[];
  availableTechnicians: any[];
}

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { debouncedFetch, isLoading: fetchLoading } = useDebouncedFetch(300);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningTechnician, setAssigningTechnician] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appointments' | 'reception-review'>('appointments');
  const [pendingReceptions, setPendingReceptions] = useState<any[]>([]);
  const [receptionLoading, setReceptionLoading] = useState(false);

  const debouncedFetchDashboard = () => {
    debouncedFetch(fetchDashboardData);
  };

  const immediateFetchDashboard = () => {
    debouncedFetch(fetchDashboardData, true);
  };

  useEffect(() => {
    debouncedFetchDashboard();
    if (activeTab === 'reception-review') {
      fetchPendingReceptions();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats('staff');
      setDashboardData(response.data.data);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Không thể tải dữ liệu dashboard', { duration: 3000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReceptions = async () => {
    try {
      setReceptionLoading(true);
      // Call the correct backend endpoint to get pending service receptions
      const response = await fetch('/api/appointments/receptions/pending-approval', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingReceptions(data.data || []);
      } else {
        toast.error('Không thể tải danh sách phiếu tiếp nhận');
      }
    } catch (error) {
      console.error('Error fetching pending receptions:', error);
      toast.error('Không thể tải danh sách phiếu tiếp nhận');
    } finally {
      setReceptionLoading(false);
    }
  };

  const handleReceptionReview = async (receptionId: string, decision: 'approve' | 'reject', notes: string) => {
    try {
      // receptionId is now the actual ServiceReception _id, not appointment ID
      const response = await fetch(`/api/service-receptions/${receptionId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: decision === 'approve' ? 'approved' : 'rejected',
          reviewNotes: notes
        })
      });

      if (response.ok) {
        fetchPendingReceptions();
        immediateFetchDashboard();
      } else {
        throw new Error('Failed to review reception');
      }
    } catch (error: any) {
      console.error('Error reviewing reception:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-600 text-white';
      case 'pending':
        return 'bg-orange-600 text-white';
      case 'completed':
        return 'bg-lime-200 text-dark-900';
      case 'in_progress':
        return 'bg-dark-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-text-muted text-white';
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.confirm(appointmentId);
      toast.success('Appointment confirmed successfully');
      immediateFetchDashboard();
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignTechnician = async (appointmentId: string, technicianId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.assignTechnician(appointmentId, technicianId);
      toast.success('Technician assigned successfully');
      setAssigningTechnician(null);
      immediateFetchDashboard();
    } catch (error: any) {
      console.error('Error assigning technician:', error);
      toast.error(error.response?.data?.message || 'Failed to assign technician');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoAssign = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.assignTechnician(appointmentId, '', { autoAssign: true });
      toast.success('Technician auto-assigned successfully');
      immediateFetchDashboard();
    } catch (error: any) {
      console.error('Error auto-assigning technician:', error);
      toast.error(error.response?.data?.message || 'Failed to auto-assign technician');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || fetchLoading()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-300 shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
              <p className="mt-1 text-sm text-text-muted">
                Xin chào, {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-dark-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-dark-300 text-lime-600 shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Lịch hẹn</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reception-review')}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === 'reception-review'
                    ? 'bg-dark-300 text-lime-600 shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Duyệt phiếu tiếp nhận</span>
                  {pendingReceptions.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {pendingReceptions.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'appointments' ? (
          // Appointments Tab Content
          <>
            {/* Stats Cards */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-lime-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Lịch hẹn hôm nay
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.totalAppointmentsToday}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Chờ xác nhận
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.pendingAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Đang thực hiện
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.inProgressAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Hoàn thành tuần này
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.completedThisWeek}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Appointments */}
            <div className="bg-dark-300 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 text-text-muted text-white">
                    Lịch hẹn cần xử lý
                  </h3>
                  <button
                    onClick={immediateFetchDashboard}
                    className="inline-flex items-center px-3 py-2 border border-dark-200 bg-dark-300 text-white shadow-sm text-sm leading-4 text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Làm mới
                  </button>
                </div>

                {!dashboardData || !dashboardData.recentAppointments || dashboardData.recentAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-text-muted" />
                    <h3 className="mt-2 text-sm text-text-muted text-white">Không có lịch hẹn</h3>
                    <p className="mt-1 text-sm text-text-muted">
                      Hiện tại không có lịch hẹn nào cần xử lý.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {(dashboardData.recentAppointments || []).map((appointment: any) => (
                        <li key={appointment._id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-dark-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-text-secondary" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-muted text-white truncate">
                                  {appointment.customerId?.firstName} {appointment.customerId?.lastName}
                                </p>
                                <p className="text-sm text-text-muted">
                                  {appointment.vehicleId?.make} {appointment.vehicleId?.model} •{' '}
                                  {appointment.vehicleId?.licensePlate}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {format(new Date(appointment.scheduledDateTime), 'dd/MM/yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </span>

                              {appointment.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmAppointment(appointment._id)}
                                  disabled={actionLoading === appointment._id}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs text-text-muted rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-green-500 disabled:opacity-50"
                                >
                                  {actionLoading === appointment._id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    'Xác nhận'
                                  )}
                                </button>
                              )}

                              {appointment.status === 'confirmed' && !appointment.assignedTechnician && (
                                <div className="flex space-x-2">
                                  {assigningTechnician === appointment._id ? (
                                    <div className="flex items-center space-x-2">
                                      <select
                                        className="text-xs border-dark-300 rounded"
                                        onChange={(e) => handleAssignTechnician(appointment._id, e.target.value)}
                                      >
                                        <option value="">Chọn kỹ thuật viên</option>
                                        {(dashboardData?.availableTechnicians || []).map((tech: any) => (
                                          <option key={tech._id} value={tech._id}>
                                            {tech.firstName} {tech.lastName}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => setAssigningTechnician(null)}
                                        className="text-text-muted hover:text-text-secondary"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setAssigningTechnician(appointment._id)}
                                        className="inline-flex items-center px-2 py-1 border border-dark-300 shadow-sm text-xs text-text-muted rounded text-text-secondary bg-dark-300 hover:bg-dark-900"
                                      >
                                        <User className="h-3 w-3 mr-1" />
                                        Phân công
                                      </button>
                                      <button
                                        onClick={() => handleAutoAssign(appointment._id)}
                                        disabled={actionLoading === appointment._id}
                                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-dark-900 bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                                      >
                                        {actionLoading === appointment._id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-dark-900"></div>
                                        ) : (
                                          <>
                                            <Zap className="h-3 w-3 mr-1" />
                                            Tự động
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // Reception Review Tab Content
          <ServiceReceptionReview
            receptions={pendingReceptions}
            loading={receptionLoading}
            onReview={handleReceptionReview}
          />
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
