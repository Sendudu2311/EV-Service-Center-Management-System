import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../contexts/SocketContext';
import { appointmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AppointmentForm from '../components/Appointment/AppointmentForm';
import AppointmentDetails from '../components/Appointment/AppointmentDetails';
import {
  Appointment,
  DetailedAppointmentStatus,
  AppointmentPriority,
  appointmentStatusTranslations,
  priorityTranslations,
  canTransitionStatus,
  getNextStatuses
} from '../types/appointment';
import { formatVietnameseDateTime, formatVND, combineDateTime } from '../utils/vietnamese';

/**
 * Interface for API response with pagination
 */
interface AppointmentResponse {
  success: boolean;
  data: Appointment[];
  total: number;
  page: number;
  totalPages: number;
  count: number;
}

/**
 * Interface for component state management
 */
interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  selectedAppointment: Appointment | null;
  updatingStatus: string | null;
}

/**
 * Interface for filters state
 */
interface FiltersState {
  statusFilter: DetailedAppointmentStatus | '';
  priorityFilter: AppointmentPriority | '';
  sortBy: 'date' | 'status' | 'priority';
  page: number;
  limit: number;
}

const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { emitStatusUpdate } = useSocket();

  // Main component state
  const [state, setState] = useState<AppointmentState>({
    appointments: [],
    loading: true,
    error: null,
    selectedAppointment: null,
    updatingStatus: null,
  });

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Filters state
  const [filters, setFilters] = useState<FiltersState>({
    statusFilter: '',
    priorityFilter: '',
    sortBy: 'date',
    page: 1,
    limit: 10,
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  /**
   * Fetch appointments with error handling and retry logic
   */
  const fetchAppointments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const params: any = {
        page: filters.page,
        limit: filters.limit,
      };

      if (filters.statusFilter) params.status = filters.statusFilter;
      if (filters.priorityFilter) params.priority = filters.priorityFilter;

      const response = await appointmentsAPI.getAll(params);
      const data = response.data as unknown as AppointmentResponse;

      let appointmentsList = data.data || [];

      // Apply client-side sorting
      appointmentsList = appointmentsList.sort((a: Appointment, b: Appointment) => {
        switch (filters.sortBy) {
          case 'date':
            return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
          case 'status':
            return a.status.localeCompare(b.status);
          case 'priority': {
            const priorityOrder: Record<AppointmentPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          }
          default:
            return 0;
        }
      });

      setState(prev => ({
        ...prev,
        appointments: appointmentsList,
        loading: false,
        error: null
      }));

      setPagination({
        total: data.total || appointmentsList.length,
        totalPages: data.totalPages || 1,
        currentPage: data.page || 1,
      });

      setRetryCount(0);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string; code?: string };
      console.error('Error fetching appointments:', error);

      const errorMessage = err.response?.data?.message ||
                          err.message ||
                          'Không thể tải danh sách lịch hẹn';

      setState(prev => ({ ...prev, loading: false, error: errorMessage }));

      // Auto-retry for network errors (max 3 times)
      if (retryCount < 3 && err.code === 'NETWORK_ERROR') {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAppointments(false);
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
    }
  }, [filters, retryCount]);

  /**
   * Effect to fetch appointments when filters change
   */
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /**
   * Real-time appointment status updates
   */
  useCustomEvent('appointmentStatusUpdate', useCallback((data) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(apt =>
        apt._id === data.appointmentId
          ? { ...apt, status: data.status, updatedAt: data.updatedAt }
          : apt
      )
    }));
  }, []));

  /**
   * Real-time new appointment notifications
   */
  useCustomEvent('newAppointment', useCallback((data) => {
    if (user?.role !== 'customer' || data.customerId === user._id) {
      fetchAppointments(false);
    }
  }, [user, fetchAppointments]));


  /**
   * Handle status updates with proper API mapping and optimistic updates
   */
  const handleStatusUpdate = useCallback(async (
    appointmentId: string,
    newStatus: DetailedAppointmentStatus,
    notes?: string
  ) => {
    const appointment = state.appointments.find(apt => apt._id === appointmentId);

    if (!user || !appointment) {
      toast.error('Không tìm thấy thông tin lịch hẹn');
      return;
    }

    if (!canTransitionStatus(appointment.status, newStatus, user.role)) {
      toast.error('Bạn không có quyền thay đổi trạng thái này');
      return;
    }

    try {
      setState(prev => ({ ...prev, updatingStatus: appointmentId }));

      // Optimistic update
      setState(prev => ({
        ...prev,
        appointments: prev.appointments.map(apt =>
          apt._id === appointmentId
            ? { ...apt, status: newStatus, updatedAt: new Date().toISOString() }
            : apt
        )
      }));

      // Call the correct API endpoint based on status
      await appointmentsAPI.updateStatus(appointmentId, newStatus, notes);

      // Emit real-time update
      emitStatusUpdate(appointmentId, newStatus);

      toast.success(`Đã cập nhật trạng thái: ${appointmentStatusTranslations[newStatus]}`);

      // Refresh to ensure data consistency
      fetchAppointments(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error updating status:', error);

      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        appointments: prev.appointments.map(apt =>
          apt._id === appointmentId
            ? { ...apt, status: appointment.status, updatedAt: appointment.updatedAt }
            : apt
        )
      }));

      const errorMessage = err.response?.data?.message || 'Không thể cập nhật trạng thái';
      toast.error(errorMessage);
    } finally {
      setState(prev => ({ ...prev, updatingStatus: null }));
    }
  }, [state.appointments, user, emitStatusUpdate, fetchAppointments]);

  /**
   * Handle appointment cancellation with proper confirmation
   */
  const handleCancelAppointment = useCallback(async (appointmentId: string, reason?: string) => {
    const appointment = state.appointments.find(apt => apt._id === appointmentId);

    if (!appointment) {
      toast.error('Không tìm thấy lịch hẹn');
      return;
    }

    const confirmMessage = `Bạn có chắc chắn muốn hủy lịch hẹn #${appointment.appointmentNumber}?\nLý do: ${reason || 'Khách hàng hủy'}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Use correct API method and parameters
      await appointmentsAPI.cancel(appointmentId, reason || 'Khách hàng hủy');

      toast.success('Đã hủy lịch hẹn thành công');
      fetchAppointments(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error cancelling appointment:', error);
      const errorMessage = err.response?.data?.message || 'Không thể hủy lịch hẹn';
      toast.error(errorMessage);
    }
  }, [state.appointments, fetchAppointments]);


  /**
   * Handle form success callback
   */
  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    fetchAppointments(false);
    toast.success('Tạo lịch hẹn thành công!');
  }, [fetchAppointments]);

  /**
   * Handle details modal close
   */
  const handleDetailsClose = useCallback(() => {
    setShowDetails(false);
    setState(prev => ({ ...prev, selectedAppointment: null }));
  }, []);

  /**
   * Handle appointment details view
   */
  const handleViewDetails = useCallback((appointment: Appointment) => {
    setState(prev => ({ ...prev, selectedAppointment: appointment }));
    setShowDetails(true);
  }, []);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((filterType: keyof FiltersState, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
      page: filterType !== 'page' ? 1 : value // Reset to page 1 when filters change
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      statusFilter: '',
      priorityFilter: '',
      sortBy: 'date',
      page: 1,
      limit: 10,
    });
  }, []);

  /**
   * Get status badge with proper styling
   */
  const getStatusBadge = useCallback((status: DetailedAppointmentStatus) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      customer_arrived: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      reception_created: 'bg-purple-100 text-purple-800 border-purple-200',
      reception_approved: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      parts_insufficient: 'bg-orange-100 text-orange-800 border-orange-200',
      waiting_for_parts: 'bg-amber-100 text-amber-800 border-amber-200',
      rescheduled: 'bg-gray-100 text-gray-800 border-gray-200',
      in_progress: 'bg-green-100 text-green-800 border-green-200',
      parts_requested: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      invoiced: 'bg-teal-100 text-teal-800 border-teal-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      no_show: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}
        title={appointmentStatusTranslations[status] || status}
        role="status"
        aria-label={`Trạng thái: ${appointmentStatusTranslations[status] || status}`}
      >
        {appointmentStatusTranslations[status] || status}
      </span>
    );
  }, []);

  /**
   * Get priority badge with proper styling
   */
  const getPriorityBadge = useCallback((priority: AppointmentPriority) => {
    const priorityColors = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };

    const priorityIcon = priority === 'urgent' ? <ExclamationTriangleIcon className="w-3 h-3 mr-1" /> : null;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          priorityColors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}
        title={priorityTranslations[priority] || priority}
        role="status"
        aria-label={`Độ ưu tiên: ${priorityTranslations[priority] || priority}`}
      >
        {priorityIcon}
        {priorityTranslations[priority] || priority}
      </span>
    );
  }, []);


  /**
   * Check if user can update appointment status
   */
  const canUpdateStatus = useCallback((appointment: Appointment) => {
    if (!user) return false;
    const nextStatuses = getNextStatuses(appointment.status, user.role);
    return nextStatuses.length > 0;
  }, [user]);

  /**
   * Render status action buttons
   */
  const renderStatusActions = useCallback((appointment: Appointment) => {
    if (!user || !canUpdateStatus(appointment)) return null;

    const nextStatuses = getNextStatuses(appointment.status, user.role);

    return (
      <div className="flex items-center space-x-1 mt-2" role="group" aria-label="Hành động trạng thái">
        {nextStatuses.slice(0, 2).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusUpdate(appointment._id, status)}
            disabled={state.updatingStatus === appointment._id}
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Cập nhật trạng thái: ${appointmentStatusTranslations[status]}`}
          >
            {state.updatingStatus === appointment._id ? (
              <ArrowPathIcon className="w-3 h-3 animate-spin" />
            ) : (
              appointmentStatusTranslations[status]
            )}
          </button>
        ))}
      </div>
    );
  }, [user, canUpdateStatus, handleStatusUpdate, state.updatingStatus]);

  /**
   * Calculate dashboard statistics
   */
  const dashboardStats = useMemo(() => [
    {
      label: 'Tổng lịch hẹn',
      value: pagination.total || state.appointments.length,
      color: 'blue',
      icon: CalendarIcon
    },
    {
      label: 'Chờ xác nhận',
      value: state.appointments.filter(a => a.status === 'pending').length,
      color: 'yellow',
      icon: ClockIcon
    },
    {
      label: 'Đang thực hiện',
      value: state.appointments.filter(a => a.status === 'in_progress').length,
      color: 'green',
      icon: ArrowPathIcon
    },
    {
      label: 'Hoàn thành',
      value: state.appointments.filter(a => a.status === 'completed').length,
      color: 'emerald',
      icon: CheckCircleIcon
    }
  ], [state.appointments, pagination.total]);

  /**
   * Render pagination controls
   */
  const renderPagination = useCallback(() => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
            disabled={filters.page <= 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Trước
          </button>
          <button
            onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, filters.page + 1))}
            disabled={filters.page >= pagination.totalPages}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> đến{' '}
              <span className="font-medium">
                {Math.min(filters.page * filters.limit, pagination.total)}
              </span>{' '}
              trong tổng số <span className="font-medium">{pagination.total}</span> kết quả
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                const page = index + Math.max(1, filters.page - 2);
                if (page > pagination.totalPages) return null;

                return (
                  <button
                    key={page}
                    onClick={() => handleFilterChange('page', page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                      page === filters.page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } border ${index === 0 ? 'rounded-l-md' : ''} ${
                      index === Math.min(4, pagination.totalPages - 1) ? 'rounded-r-md' : ''
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }, [pagination, filters, handleFilterChange]);

  // Loading state
  if (state.loading && state.appointments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Đang tải lịch hẹn...</h3>
          <p className="mt-1 text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Quản lý lịch hẹn
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý và theo dõi lịch hẹn bảo dưỡng xe điện
            </p>
            {state.error && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {state.error}
                {retryCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Đang thử lại lần {retryCount}/3)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Bật/tắt bộ lọc"
            >
              <FunnelIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Bộ lọc
            </button>
            {user?.role !== 'technician' && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-label="Tạo lịch hẹn mới"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Tạo lịch hẹn mới
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <select
                  id="status-filter"
                  value={filters.statusFilter}
                  onChange={(e) => handleFilterChange('statusFilter', e.target.value as DetailedAppointmentStatus | '')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(appointmentStatusTranslations).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Độ ưu tiên
                </label>
                <select
                  id="priority-filter"
                  value={filters.priorityFilter}
                  onChange={(e) => handleFilterChange('priorityFilter', e.target.value as AppointmentPriority | '')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Tất cả độ ưu tiên</option>
                  {Object.entries(priorityTranslations).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
                  Sắp xếp theo
                </label>
                <select
                  id="sort-by"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value as 'date' | 'status' | 'priority')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="date">Ngày tạo</option>
                  <option value="status">Trạng thái</option>
                  <option value="priority">Độ ưu tiên</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Xóa tất cả bộ lọc"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          {dashboardStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.label} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <IconComponent className={`h-6 w-6 text-${stat.color}-600`} />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
                      <p className={`text-2xl font-semibold text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointments List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {state.appointments.length === 0 && !state.loading ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  {state.error ? 'Lỗi khi tải dữ liệu' : 'Không có lịch hẹn'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {state.error
                    ? 'Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ'
                    : 'Bắt đầu bằng cách tạo một lịch hẹn mới.'
                  }
                </p>
                {state.error ? (
                  <div className="mt-6">
                    <button
                      onClick={() => fetchAppointments(true)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Thử lại
                    </button>
                  </div>
                ) : user?.role !== 'technician' && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Tạo lịch hẹn mới
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {state.appointments.map((appointment) => (
                  <article
                    key={appointment._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <header className="flex items-center space-x-4 mb-2">
                          <h2 className="text-lg font-semibold text-gray-900">
                            #{appointment.appointmentNumber}
                          </h2>
                          {getStatusBadge(appointment.status)}
                          {getPriorityBadge(appointment.priority)}
                        </header>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Khách hàng</h3>
                            <p className="text-sm text-gray-900">
                              {appointment.customerId.firstName} {appointment.customerId.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              <a href={`tel:${appointment.customerId.phone}`} className="hover:text-blue-600">
                                {appointment.customerId.phone}
                              </a>
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Xe</h3>
                            <p className="text-sm text-gray-900">
                              {appointment.vehicleId.make} {appointment.vehicleId.model} {appointment.vehicleId.year}
                            </p>
                            <p className="text-sm text-gray-500">{appointment.vehicleId.licensePlate}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Lịch hẹn</h3>
                            <p className="text-sm text-gray-900">
                              <time dateTime={combineDateTime(appointment.scheduledDate, appointment.scheduledTime)}>
                                {formatVietnameseDateTime(combineDateTime(appointment.scheduledDate, appointment.scheduledTime))}
                              </time>
                            </p>
                            <p className="text-sm text-gray-500">
                              Chi phí ước tính: {formatVND(appointment.estimatedCost)}
                            </p>
                          </div>
                        </div>

                        {appointment.assignedTechnician && (
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-500">Kỹ thuật viên</h3>
                            <p className="text-sm text-gray-900">
                              {appointment.assignedTechnician.firstName} {appointment.assignedTechnician.lastName}
                            </p>
                          </div>
                        )}

                        {renderStatusActions(appointment)}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label={`Xem chi tiết lịch hẹn #${appointment.appointmentNumber}`}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {['pending', 'confirmed'].includes(appointment.status) && (
                          <button
                            onClick={() => handleCancelAppointment(appointment._id)}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label={`Hủy lịch hẹn #${appointment.appointmentNumber}`}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          {renderPagination()}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <AppointmentForm
          onCancel={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetails && state.selectedAppointment && (
        <AppointmentDetails
          appointment={state.selectedAppointment}
          onClose={handleDetailsClose}
          _onUpdate={() => fetchAppointments(false)}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;