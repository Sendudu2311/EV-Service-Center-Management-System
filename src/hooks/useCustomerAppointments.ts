import { useState, useEffect, useCallback } from 'react';
import { appointmentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import {
  CustomerAppointmentCard,
  CustomerAppointmentFilters,
  CustomerAppointmentLoadingState,
  CustomerAppointmentError,
  RescheduleRequest,
  CancelRequest,
  checkCustomerPermission,
  DEFAULT_CUSTOMER_PERMISSIONS
} from '../types/customerAppointment';
import { Appointment, DetailedAppointmentStatus } from '../types/appointment';
import { appointmentStatusTranslations } from '../utils/vietnamese';

interface UseCustomerAppointmentsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useCustomerAppointments = ({
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: UseCustomerAppointmentsProps = {}) => {
  const { user } = useAuth();
  const { isConnected } = useSocket();

  // Core state
  const [appointments, setAppointments] = useState<CustomerAppointmentCard[]>([]);
  const [filters, setFilters] = useState<CustomerAppointmentFilters>({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Loading states
  const [loadingState, setLoadingState] = useState<CustomerAppointmentLoadingState>({
    isLoading: true,
    isRescheduling: false,
    isCancelling: false,
    isLoadingTimeSlots: false,
    error: null,
    lastFetch: null
  });

  const [retryCount, setRetryCount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Enhanced appointment card creator
  const createAppointmentCard = useCallback((appointment: Appointment): CustomerAppointmentCard => {
    const reschedulePermission = checkCustomerPermission(appointment, 'reschedule');
    const cancelPermission = checkCustomerPermission(appointment, 'cancel');

    // Calculate progress for timeline
    const statusProgress: { [key in DetailedAppointmentStatus]?: number } = {
      pending: 5,
      confirmed: 15,
      customer_arrived: 25,
      reception_created: 35,
      reception_approved: 45,
      in_progress: 65,
      parts_requested: 70,
      parts_insufficient: 75,
      waiting_for_parts: 80,
      completed: 95,
      invoiced: 100,
      cancelled: 0,
      no_show: 0,
      rescheduled: 10
    };

    // Status display configuration
    const statusDisplay = {
      text: appointmentStatusTranslations[appointment.status] || appointment.status,
      color: getStatusColor(appointment.status),
      progress: statusProgress[appointment.status] || 0
    };

    // Available actions for customer
    const availableActions = [];

    if (reschedulePermission.allowed) {
      availableActions.push({
        type: 'reschedule' as const,
        label: 'Đổi lịch',
        icon: 'calendar',
        disabled: false
      });
    }

    if (cancelPermission.allowed) {
      availableActions.push({
        type: 'cancel' as const,
        label: 'Hủy lịch',
        icon: 'x-circle',
        disabled: false,
        destructive: true
      });
    }

    availableActions.push({
      type: 'view' as const,
      label: 'Chi tiết',
      icon: 'eye',
      disabled: false
    });

    if (appointment.status === 'invoiced') {
      availableActions.push({
        type: 'download_invoice' as const,
        label: 'Tải hóa đơn',
        icon: 'download',
        disabled: false
      });
    }

    return {
      ...appointment,
      canReschedule: reschedulePermission.allowed,
      canCancel: cancelPermission.allowed,
      statusDisplay,
      timeline: [], // Will be populated when needed
      availableActions
    } as CustomerAppointmentCard;
  }, []);

  // Fetch customer appointments
  const fetchAppointments = useCallback(async (showLoading = true) => {
    if (!user) return;

    try {
      if (showLoading) {
        setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const params = {
        ...filters,
        customerOnly: true
      };

      const [appointmentsResponse, statsResponse] = await Promise.all([
        appointmentsAPI.getCustomerAppointments(params),
        appointmentsAPI.getCustomerStats().catch(() => ({ data: { data: null } }))
      ]);

      const appointmentsList = appointmentsResponse.data.data || appointmentsResponse.data || [];
      const appointmentCards = (appointmentsList as Appointment[]).map(createAppointmentCard);

      setAppointments(appointmentCards);
      setStats(statsResponse.data.data);
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        lastFetch: new Date()
      }));
      setRetryCount(0);

    } catch (error: any) {
      console.error('Error fetching customer appointments:', error);

      const customerError: CustomerAppointmentError = {
        type: error.response?.status === 401 || error.response?.status === 403 ? 'auth' :
              error.response?.status >= 500 ? 'server' :
              error.code === 'NETWORK_ERROR' ? 'network' : 'server',
        message: error.response?.data?.message || 'Không thể tải danh sách lịch hẹn',
        retryable: error.response?.status !== 401 && error.response?.status !== 403
      };

      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: customerError.message,
        lastFetch: null
      }));

      // Handle different error types
      if (customerError.type === 'auth') {
        toast.error('Phiên đăng nhập hết hạn. Đang chuyển hướng...');
        // Auth redirect handled by axios interceptor
      } else if (retryCount < 2 && customerError.retryable) {
        setRetryCount(prev => prev + 1);
        toast.error(`${customerError.message}. Đang thử lại...`);
        setTimeout(() => fetchAppointments(false), 2000 * (retryCount + 1));
      } else {
        toast.error(customerError.message);
      }
    }
  }, [user, filters, createAppointmentCard, retryCount]);

  // Reschedule appointment
  const rescheduleAppointment = useCallback(async (rescheduleData: RescheduleRequest) => {
    setLoadingState(prev => ({ ...prev, isRescheduling: true }));

    try {
      await appointmentsAPI.customerReschedule(rescheduleData.appointmentId, {
        newDate: rescheduleData.newDate,
        newTime: rescheduleData.newTime,
        reason: rescheduleData.reason,
        reasonCategory: rescheduleData.reasonCategory.id
      });

      toast.success('Đã gửi yêu cầu đổi lịch. Chờ xác nhận từ trung tâm.');
      await fetchAppointments(false);

    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      const message = error.response?.data?.message || 'Không thể đổi lịch hẹn';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoadingState(prev => ({ ...prev, isRescheduling: false }));
    }
  }, [fetchAppointments]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (cancelData: CancelRequest) => {
    setLoadingState(prev => ({ ...prev, isCancelling: true }));

    try {
      await appointmentsAPI.customerCancel(cancelData.appointmentId, {
        reason: cancelData.reason,
        reasonCategory: cancelData.reasonCategory.id
      });

      toast.success('Đã hủy lịch hẹn thành công.');
      await fetchAppointments(false);

    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      const message = error.response?.data?.message || 'Không thể hủy lịch hẹn';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoadingState(prev => ({ ...prev, isCancelling: false }));
    }
  }, [fetchAppointments]);

  // Get available time slots for reschedule
  const getAvailableTimeSlots = useCallback(async (
    date: string,
    serviceCenterId: string,
    duration: number = 60
  ) => {
    setLoadingState(prev => ({ ...prev, isLoadingTimeSlots: true }));

    try {
      const response = await appointmentsAPI.getAvailableTimeSlots(date, serviceCenterId, duration);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching time slots:', error);
      toast.error('Không thể tải khung giờ có sẵn');
      return [];
    } finally {
      setLoadingState(prev => ({ ...prev, isLoadingTimeSlots: false }));
    }
  }, []);

  // Retry mechanism
  const retry = useCallback(() => {
    setRetryCount(0);
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time event handlers
  useCustomEvent('appointmentStatusUpdate', (data: any) => {
    if (user?.role === 'customer') {
      setAppointments(prev =>
        prev.map(apt => {
          if (apt._id === data.appointmentId) {
            const updatedAppointment = { ...apt, status: data.newStatus };
            return createAppointmentCard(updatedAppointment);
          }
          return apt;
        })
      );

      // Show notification for important status changes
      if (['confirmed', 'customer_arrived', 'in_progress', 'completed', 'cancelled'].includes(data.newStatus)) {
        toast.info(`Lịch hẹn ${data.appointmentId}: ${appointmentStatusTranslations[data.newStatus]}`);
      }
    }
  });

  useCustomEvent('appointmentRescheduled', (data: any) => {
    if (user?.role === 'customer') {
      toast.success(`Lịch hẹn ${data.appointmentNumber} đã được đổi thành công`);
      fetchAppointments(false);
    }
  });

  useCustomEvent('appointmentCancelled', (data: any) => {
    if (user?.role === 'customer') {
      toast.info(`Lịch hẹn ${data.appointmentNumber} đã được hủy`);
      fetchAppointments(false);
    }
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && isConnected && user) {
      const interval = setInterval(() => {
        fetchAppointments(false);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isConnected, user, refreshInterval, fetchAppointments]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, fetchAppointments]);

  // Filter and sort appointments
  const filteredAppointments = appointments.filter(appointment => {
    if (filters.status && appointment.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        appointment.appointmentNumber.toLowerCase().includes(searchLower) ||
        appointment.services.some(service =>
          service.serviceId?.name?.toLowerCase().includes(searchLower)
        ) ||
        `${appointment.vehicleId.make} ${appointment.vehicleId.model}`.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return {
    // Data
    appointments: filteredAppointments,
    stats,
    filters,
    loadingState,

    // Actions
    setFilters,
    fetchAppointments,
    rescheduleAppointment,
    cancelAppointment,
    getAvailableTimeSlots,
    retry,

    // Computed
    isEmpty: filteredAppointments.length === 0 && !loadingState.isLoading,
    hasError: !!loadingState.error,
    canRetry: !!loadingState.error && retryCount < 3,
    isConnected
  };
};

// Helper function for status colors
const getStatusColor = (status: DetailedAppointmentStatus): string => {
  const colorMap: { [key in DetailedAppointmentStatus]?: string } = {
    pending: 'yellow',
    confirmed: 'blue',
    customer_arrived: 'indigo',
    reception_created: 'purple',
    reception_approved: 'cyan',
    in_progress: 'orange',
    parts_requested: 'amber',
    parts_insufficient: 'red',
    waiting_for_parts: 'yellow',
    completed: 'green',
    invoiced: 'emerald',
    cancelled: 'red',
    no_show: 'gray',
    rescheduled: 'blue'
  };

  return colorMap[status] || 'gray';
};