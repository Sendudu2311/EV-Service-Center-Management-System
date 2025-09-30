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
      const response = await appointmentsAPI.getAll({ status: 'reception_created' });

      if (response.data.success) {
        const receptions = (response.data.data || []).map((appointment: any) => ({
          _id: `reception_${appointment._id}`,
          appointmentId: {
            _id: appointment._id,
            appointmentNumber: appointment.appointmentNumber
          },
          customerId: {
            firstName: appointment.customerId.firstName || 'Unknown',
            lastName: appointment.customerId.lastName || 'Customer',
            phone: appointment.customerId.phone || 'N/A'
          },
          vehicleId: {
            make: appointment.vehicleId?.make || 'Unknown',
            model: appointment.vehicleId?.model || 'Vehicle',
            year: appointment.vehicleId?.year || 2020,
            licensePlate: appointment.vehicleId?.licensePlate || 'N/A',
            vin: appointment.vehicleId?.vin || 'N/A'
          },
          bookedServices: appointment.services || [],
          priorityLevel: appointment.priority || 'normal',
          estimatedServiceTime: appointment.estimatedDuration || 120,
          status: 'received',
          receivedBy: {
            firstName: 'System',
            lastName: 'Auto'
          },
          receivedAt: appointment.updatedAt || new Date().toISOString(),
          vehicleCondition: {
            exterior: {
              condition: 'good',
              damages: [],
              notes: 'Pending detailed inspection'
            },
            interior: {
              condition: 'good',
              cleanliness: 'clean',
              damages: [],
              notes: ''
            },
            battery: {
              level: 80,
              health: 'good',
              chargingStatus: 'not_charging',
              notes: 'Battery level checked during arrival'
            },
            mileage: {
              current: 25000
            }
          },
          customerItems: [],
          specialInstructions: {
            fromCustomer: appointment.customerNotes || '',
            safetyPrecautions: [],
            warningNotes: []
          }
        }));

        setPendingReceptions(receptions);
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
      const appointmentId = receptionId.replace('reception_', '');

      const response = await serviceReceptionAPI.review(appointmentId, {
        decision: decision === 'approve' ? 'approved' : 'rejected',
        reviewNotes: notes,
        staffReviewStatus: decision === 'approve' ? 'approved' : 'rejected'
      });

      if (response.data.success) {
        fetchPendingReceptions();
        immediateFetchDashboard();
      }
    } catch (error: any) {
      console.error('Error reviewing reception:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Xin chào, {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Lịch hẹn</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reception-review')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'reception-review'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
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
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Lịch hẹn hôm nay
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.totalAppointmentsToday}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Chờ xác nhận
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.pendingAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Đang thực hiện
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.inProgressAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Hoàn thành tuần này
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.completedThisWeek}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Appointments */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Lịch hẹn cần xử lý
                  </h3>
                  <button
                    onClick={immediateFetchDashboard}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Làm mới
                  </button>
                </div>

                {!dashboardData || !dashboardData.recentAppointments || dashboardData.recentAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có lịch hẹn</h3>
                    <p className="mt-1 text-sm text-gray-500">
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
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {appointment.customerId?.firstName} {appointment.customerId?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {appointment.vehicleId?.make} {appointment.vehicleId?.model} •{' '}
                                  {appointment.vehicleId?.licensePlate}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {format(new Date(appointment.scheduledDateTime), 'dd/MM/yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </span>

                              {appointment.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmAppointment(appointment._id)}
                                  disabled={actionLoading === appointment._id}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
                                        className="text-xs border-gray-300 rounded"
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
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setAssigningTechnician(appointment._id)}
                                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                      >
                                        <User className="h-3 w-3 mr-1" />
                                        Phân công
                                      </button>
                                      <button
                                        onClick={() => handleAutoAssign(appointment._id)}
                                        disabled={actionLoading === appointment._id}
                                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {actionLoading === appointment._id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
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
            onRefresh={fetchPendingReceptions}
          />
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;