import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../../contexts/SocketContext';
import {
  CalendarDaysIcon,
  TruckIcon,
  CreditCardIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  Battery0Icon,
  Battery50Icon,
  Battery100Icon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  WrenchScrewdriverIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatVietnameseDateTime, formatVND, appointmentStatusTranslations, combineDateTime } from '../../utils/vietnamese';
import { useDebouncedFetch } from '../../hooks/useDebouncedFetch';
import {
  CustomerDashboardResponse,
  CustomerDashboardStats,
  CustomerVehicleInfo,
  CustomerRecentAppointment,
  CustomerNotification,
  DashboardLoadingState,
  AppointmentStatusUpdate,
  InvoiceGeneratedEvent,
  NewMessageEvent
} from '../../types/dashboard';

// Using shared types from ../../types/dashboard.ts instead of local interfaces

const EnhancedCustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket: _socket, isConnected } = useSocket(); // socket reserved for real-time updates
  const { debouncedFetch, isLoading: fetchLoading } = useDebouncedFetch(300);

  const [stats, setStats] = useState<CustomerDashboardStats | null>(null);
  const [vehicles, setVehicles] = useState<CustomerVehicleInfo[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<CustomerRecentAppointment[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loadingState, setLoadingState] = useState<DashboardLoadingState>({
    isLoading: true,
    error: null,
    lastFetch: null
  });
  const [retryCount, setRetryCount] = useState(0);

  const debouncedFetchDashboard = useCallback(() => {
    debouncedFetch(fetchDashboardData);
  }, [debouncedFetch]);

  const immediateFetchDashboard = useCallback(() => {
    debouncedFetch(fetchDashboardData, true);
  }, [debouncedFetch]);

  useEffect(() => {
    debouncedFetchDashboard();
  }, [debouncedFetchDashboard]);

  // Listen for real-time updates with proper typing
  useCustomEvent('appointmentStatusUpdate', (data: AppointmentStatusUpdate) => {
    // Update appointments when status changes
    setRecentAppointments(prev =>
      prev.map(apt =>
        apt._id === data.appointmentId
          ? { ...apt, status: data.newStatus }
          : apt
      )
    );

    // Show notification for status changes
    toast(`Lịch hẹn ${data.appointmentId} đã chuyển sang: ${appointmentStatusTranslations[data.newStatus] || data.newStatus}`, { icon: 'ℹ️' });

  });

  useCustomEvent('invoiceGenerated', (data: InvoiceGeneratedEvent) => {
    if (data.customerId === user?._id) {
      toast.success(`Hóa đơn mới: ${data.invoiceNumber} - ${formatVND(data.amount)}`);

      // Add notification
      const newNotification: CustomerNotification = {
        _id: `invoice_${Date.now()}`,
        type: 'invoice_ready',
        title: 'Hóa đơn mới',
        message: `Hóa đơn ${data.invoiceNumber} đã sẵn sàng`,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/invoices/${data.invoiceNumber}`,
        priority: 'medium'
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);

      immediateFetchDashboard(); // Refresh stats
    }
  });

  useCustomEvent('newMessage', (data: NewMessageEvent) => {
    if (data.recipientId === user?._id) {
      // Add new notification for messages
      const newNotification: CustomerNotification = {
        _id: `msg_${Date.now()}`,
        type: 'appointment_reminder',
        title: 'Tin nhắn mới',
        message: `Tin nhắn từ ${data.senderName}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: data.appointmentId ? `/appointments/${data.appointmentId}` : '/messages',
        priority: 'low'
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);

      toast(`Tin nhắn mới từ ${data.senderName}`, { icon: '💬' });
    }
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));

      // Single API call to get all customer dashboard data
      const response = await dashboardAPI.getCustomerDashboard();
      const dashboardData: CustomerDashboardResponse = response.data.data;

      // Update all states with backend data
      setStats(dashboardData.stats);
      setVehicles(dashboardData.vehicles || []);
      setRecentAppointments(dashboardData.recentAppointments || []);

      // Handle notifications - create default notifications if not provided by backend
      if (dashboardData.notifications) {
        setNotifications(dashboardData.notifications);
      } else {
        // Create default notifications based on vehicles and appointments
        const defaultNotifications: CustomerNotification[] = [];

        // Add maintenance reminders for vehicles
        dashboardData.vehicles?.forEach(vehicle => {
          if (vehicle.isMaintenanceDue) {
            defaultNotifications.push({
              _id: `maintenance_${vehicle._id}`,
              type: 'maintenance_due',
              title: 'Bảo dưỡng định kỳ',
              message: `${vehicle.make} ${vehicle.model} cần bảo dưỡng`,
              isRead: false,
              createdAt: new Date().toISOString(),
              priority: 'high' as const
            });
          }
        });

        // Add upcoming appointment reminders
        const upcomingAppointments = dashboardData.recentAppointments?.filter(apt =>
          ['confirmed', 'pending'].includes(apt.status) &&
          new Date(apt.scheduledDate) > new Date()
        ) || [];

        upcomingAppointments.slice(0, 3).forEach(apt => {
          defaultNotifications.push({
            _id: `upcoming_${apt._id}`,
            type: 'appointment_reminder',
            title: 'Lịch hẹn sắp tới',
            message: `Lịch hẹn ${apt.appointmentNumber} vào ${apt.scheduledDate}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            priority: 'medium' as const,
            actionUrl: `/appointments/${apt._id}`
          });
        });

        setNotifications(defaultNotifications.slice(0, 5));
      }

      setLoadingState({
        isLoading: false,
        error: null,
        lastFetch: new Date()
      });
      setRetryCount(0);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);

      const errorType: 'auth' | 'server' | 'network' | 'validation' =
                       error.response?.status === 401 ? 'auth' :
                       error.response?.status === 403 ? 'auth' :
                       error.response?.status >= 500 ? 'server' :
                       error.code === 'NETWORK_ERROR' ? 'network' : 'server';

      const dashboardError = {
        type: errorType,
        message: error.response?.data?.message || 'Không thể tải dữ liệu dashboard',
        code: error.response?.status,
        retry: errorType !== 'auth'
      };

      setLoadingState({
        isLoading: false,
        error: dashboardError,
        lastFetch: null
      });

      // Show appropriate error message
      if (errorType === 'auth') {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        // Redirect to login handled by axios interceptor
      } else if (retryCount < 2) {
        toast.error(`${dashboardError.message}. Đang thử lại...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => immediateFetchDashboard(), 2000);
      } else {
        toast.error(dashboardError.message);
      }
    }
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    immediateFetchDashboard();
  }, [immediateFetchDashboard]);

  const getStatusBadge = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'customer_arrived': 'bg-indigo-100 text-indigo-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {appointmentStatusTranslations[status] || status}
      </span>
    );
  };

  const getBatteryIcon = (healthStatus: string, currentCharge: number) => {
    const getColor = () => {
      if (healthStatus === 'poor') return 'text-red-500';
      if (currentCharge <= 20) return 'text-red-500';
      if (currentCharge <= 50) return 'text-yellow-500';
      return 'text-green-500';
    };

    const getBatteryComponent = () => {
      if (currentCharge <= 25) return Battery0Icon;
      if (currentCharge <= 75) return Battery50Icon;
      return Battery100Icon;
    };

    const BatteryComponent = getBatteryComponent();
    return <BatteryComponent className={`h-5 w-5 ${getColor()}`} />;
  };

  const getBatteryHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatMaintenanceStatus = (vehicle: CustomerVehicleInfo) => {
    if (!vehicle.isMaintenanceDue) return null;

    const dueDate = vehicle.nextMaintenanceDate ? new Date(vehicle.nextMaintenanceDate) : null;
    const isOverdue = dueDate && dueDate < new Date();

    return {
      text: isOverdue ? 'Quá hạn bảo dưỡng' : 'Sắp đến hạn bảo dưỡng',
      color: isOverdue ? 'text-red-600' : 'text-yellow-600',
      icon: <ExclamationTriangleIcon className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
    };
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance_due':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'service_completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'invoice_ready':
        return <CreditCardIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Loading state with skeleton
  if ((loadingState.isLoading || fetchLoading()) && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (loadingState.error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Không thể tải dữ liệu dashboard
            </h3>
            <p className="text-gray-600 mb-6">
              {loadingState.error.message}
            </p>

            {loadingState.error.retry && (
              <div className="space-y-4">
                <button
                  onClick={handleRetry}
                  disabled={loadingState.isLoading || fetchLoading()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingState.isLoading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Đang thử lại...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Thử lại
                    </>
                  )}
                </button>

                <div className="text-sm text-gray-500">
                  {loadingState.lastFetch && (
                    <>Lần cuối cập nhật: {formatVietnameseDateTime(loadingState.lastFetch.toISOString())}</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Chào mừng, {user?.firstName} {user?.lastName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tổng quan về xe và dịch vụ của bạn
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs">
                    {isConnected ? 'Kết nối trực tiếp' : 'Mất kết nối'}
                  </span>
                </div>

                {loadingState.lastFetch && (
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span>
                      Cập nhật: {formatVietnameseDateTime(loadingState.lastFetch.toISOString()).split(' ')[1]}
                    </span>
                    <button
                      onClick={handleRetry}
                      disabled={loadingState.isLoading || fetchLoading()}
                      className="text-blue-600 hover:text-blue-500 disabled:opacity-50"
                    >
                      {(loadingState.isLoading || fetchLoading()) ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowPathIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Link
                to="/appointments"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Đặt lịch hẹn mới
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats && [
            {
              name: 'Xe đang sử dụng',
              value: stats.activeVehicles,
              icon: TruckIcon,
              color: 'blue',
              href: '/vehicles'
            },
            {
              name: 'Lịch hẹn sắp tới',
              value: stats.upcomingAppointments,
              icon: CalendarDaysIcon,
              color: 'green',
              href: '/appointments'
            },
            {
              name: 'Dịch vụ hoàn thành',
              value: stats.completedServices,
              icon: CheckCircleIcon,
              color: 'emerald',
              href: '/appointments'
            },
            {
              name: 'Tổng chi phí',
              value: formatVND(stats.totalSpent),
              icon: CreditCardIcon,
              color: 'purple',
              href: '/invoices'
            }
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.name}
                to={stat.href}
                className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div>
                  <div className={`absolute rounded-md p-3 bg-${stat.color}-500`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                </div>
                <div className="ml-16 pb-6 flex items-baseline">
                  <p className={`text-2xl font-semibold text-${stat.color}-600`}>
                    {typeof stat.value === 'number' ? stat.value : stat.value}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Vehicle Management Section */}
        {vehicles.length > 0 && (
          <div className="mb-8">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2" />
                  Xe điện của bạn
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => {
                    const maintenanceStatus = formatMaintenanceStatus(vehicle);
                    return (
                      <div
                        key={vehicle._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h4>
                            {vehicle.licensePlate && (
                              <p className="text-sm text-gray-600">{vehicle.licensePlate}</p>
                            )}
                          </div>
                          {maintenanceStatus && (
                            <div className="flex items-center space-x-1">
                              {maintenanceStatus.icon}
                            </div>
                          )}
                        </div>

                        {/* Battery Info */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pin:</span>
                            <div className="flex items-center space-x-2">
                              {getBatteryIcon(vehicle.batteryHealth || 'good', vehicle.currentCharge || 80)}
                              <span className="text-sm font-medium">{vehicle.currentCharge || 80}%</span>
                            </div>
                          </div>

                          {vehicle.batteryHealth && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Sức khỏe pin:</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getBatteryHealthColor(vehicle.batteryHealth)}`}>
                                {vehicle.batteryHealth === 'excellent' ? 'Tuyệt vời' :
                                 vehicle.batteryHealth === 'good' ? 'Tốt' :
                                 vehicle.batteryHealth === 'fair' ? 'Khá' : 'Kém'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Dung lượng:</span>
                            <span className="text-sm font-medium">{vehicle.batteryCapacity} kWh</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Tầm di chuyển:</span>
                            <span className="text-sm font-medium">{vehicle.range} km</span>
                          </div>
                        </div>

                        {/* Maintenance Status */}
                        {maintenanceStatus && (
                          <div className={`text-xs ${maintenanceStatus.color} mb-2`}>
                            {maintenanceStatus.text}
                            {vehicle.nextMaintenanceDate && (
                              <span className="block mt-1">
                                Ngày: {formatVietnameseDateTime(vehicle.nextMaintenanceDate).split(' ')[0]}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Link
                            to={`/vehicles/${vehicle._id}`}
                            className="flex-1 text-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Chi tiết
                          </Link>
                          {vehicle.isMaintenanceDue && (
                            <Link
                              to="/appointments"
                              className="flex-1 text-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Đặt lịch
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent Appointments */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Lịch hẹn gần đây
                </h3>
                {!Array.isArray(recentAppointments) || recentAppointments.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có lịch hẹn</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Bạn chưa có lịch hẹn nào gần đây.
                    </p>
                    <div className="mt-6">
                      <Link
                        to="/appointments"
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                      >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Đặt lịch hẹn mới
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(recentAppointments || []).map((appointment) => (
                      <div
                        key={appointment._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-semibold text-gray-900">
                                #{appointment.appointmentNumber}
                              </h4>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {appointment.vehicle || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatVietnameseDateTime(combineDateTime(appointment.scheduledDate, appointment.scheduledTime))}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.serviceCenter || 'N/A'}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm font-medium text-gray-900">
                                Chi phí: {formatVND(appointment.totalPrice)}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {appointment.services.slice(0, 2).map((service, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {service}
                                  </span>
                                ))}
                                {appointment.services.length > 2 && (
                                  <span className="text-xs text-gray-500">+{appointment.services.length - 2} dịch vụ</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Link
                            to={`/appointments`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-500"
                          >
                            <ArrowRightIcon className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <Link
                        to="/appointments"
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Xem tất cả lịch hẹn →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications and Vehicle Status */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Thông báo
                </h3>
                {!Array.isArray(notifications) || notifications.length === 0 ? (
                  <div className="text-center py-6">
                    <BellIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      Không có thông báo mới
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(notifications || []).map((notification) => (
                      <div
                        key={notification._id}
                        className={`p-3 rounded-lg border transition-colors ${
                          notification.isRead
                            ? 'bg-gray-50 border-gray-200'
                            : notification.priority === 'high'
                            ? 'bg-red-50 border-red-200'
                            : notification.priority === 'medium'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-blue-50 border-blue-100'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              {notification.priority === 'high' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Quan trọng
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {formatVietnameseDateTime(notification.createdAt)}
                              </p>
                              {notification.actionUrl && (
                                <Link
                                  to={notification.actionUrl}
                                  className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                                >
                                  Xem chi tiết →
                                </Link>
                              )}
                            </div>
                            {notification.expiresAt && (
                              <div className="flex items-center mt-2 text-xs text-yellow-600">
                                <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                                Hết hạn: {formatVietnameseDateTime(notification.expiresAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Thao tác nhanh
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/appointments"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <CalendarDaysIcon className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Đặt lịch hẹn</span>
                  </Link>
                  <Link
                    to="/vehicles"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <TruckIcon className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Quản lý xe</span>
                  </Link>
                  <Link
                    to="/invoices"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <CreditCardIcon className="h-5 w-5 text-purple-500 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Xem hóa đơn</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCustomerDashboard;