import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../../contexts/SocketContext';
import {
  ClockIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { dashboardAPI, appointmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatVietnameseDateTime, appointmentStatusTranslations, combineDateTime } from '../../utils/vietnamese';
import { useDebouncedFetch } from '../../hooks/useDebouncedFetch';

interface TechnicianStats {
  todayAppointments: number;
  inProgressAppointments: number;
  completedToday: number;
  avgCompletionTime: number;
  currentWorkload: number;
  maxWorkload: number;
  efficiency: number;
  customerRating: number;
}

interface WorkQueueItem {
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
    licensePlate: string;
  };
  services: string[];
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  priority: string;
  status: string;
  serviceReceptionId?: string;
  workflowHistory?: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    notes?: string;
  }>;
}

interface CurrentTask {
  _id: string;
  appointmentNumber: string;
  status: string;
  startedAt: string;
  estimatedCompletion: string;
  customerName: string;
  vehicleInfo: string;
  currentStep: string;
  progress: number;
}

interface ServiceReceptionItem {
  _id: string;
  receptionNumber: string;
  status: string;
  createdAt: string;
  customerId: {
    firstName: string;
    lastName: string;
  };
  vehicleId: {
    make: string;
    model: string;
    licensePlate: string;
  };
  submissionStatus: {
    staffReviewStatus: string;
    submittedToStaff: boolean;
  };
  recommendedServices: Array<{
    serviceName: string;
  }>;
  requestedParts: Array<{
    partName: string;
  }>;
}

const EnhancedTechnicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket: _socket, isConnected } = useSocket(); // socket reserved for real-time updates
  const { debouncedFetch, isLoading: fetchLoading } = useDebouncedFetch(300);

  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [workQueue, setWorkQueue] = useState<WorkQueueItem[]>([]);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [serviceReceptions, setServiceReceptions] = useState<ServiceReceptionItem[]>([]);
  const [selectedReception, setSelectedReception] = useState<ServiceReceptionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Fetch data if user is authenticated as technician (boot logic moved to prevent double boot)
    if (user?.role === 'technician') {
      debouncedFetchDashboard();
    } else if (!user) {
      setLoading(false); // Not authenticated, stop loading
    }

    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timeInterval);
  }, [user]);

  // Listen for real-time updates
  useCustomEvent('technicianAssigned', (data) => {
    if (data.technicianId === user?._id) {
      toast.success(`Bạn được giao lịch hẹn: ${data.appointmentNumber}`);
      immediateFetchDashboard();
    }
  });

  useCustomEvent('appointmentStatusUpdate', (data) => {
    // Update work queue when status changes
    setWorkQueue(prev =>
      prev.map(item =>
        item._id === data.appointmentId
          ? { ...item, status: data.status }
          : item
      )
    );

    // Update current task if applicable
    if (currentTask && currentTask._id === data.appointmentId) {
      setCurrentTask(prev => prev ? { ...prev, status: data.status } : null);
    }
  });

  useCustomEvent('serviceReceptionCreated', (data) => {
    if (data.technicianId === user?._id) {
      toast(`Đã tạo phiếu tiếp nhận cho lịch hẹn ${data.appointmentNumber}`, { icon: 'ℹ️' });
      immediateFetchDashboard();
    }
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch technician stats
      const statsResponse = await dashboardAPI.getStats('technician');
      setStats(statsResponse.data.data);

      // Fetch work queue - include confirmed appointments for technicians
      const queueResponse = await appointmentsAPI.getWorkQueue({
        technicianId: user?._id,
        status: 'confirmed,customer_arrived,reception_created,reception_approved,in_progress',
        limit: 10
      });
      const workQueueData = queueResponse.data.data?.appointments || queueResponse.data.data || [];
      setWorkQueue(workQueueData);

      // Fetch service receptions created by technician
      try {
        const receptionsResponse = await fetch('/api/service-receptions/technician/my-receptions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (receptionsResponse.ok) {
          const receptionsData = await receptionsResponse.json();
          setServiceReceptions(receptionsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching service receptions:', error);
      }

      // Check for current active task - ONLY in_progress appointments
      const currentTasks = workQueueData.filter((item: WorkQueueItem) =>
        item.status === 'in_progress'
      );

      if (currentTasks.length > 0) {
        const task = currentTasks[0];
        
        // Find when work actually started from workflow history
        const workStartTime = task.workflowHistory?.find((history: any) => 
          history.status === 'in_progress'
        )?.changedAt || new Date().toISOString();

        setCurrentTask({
          _id: task._id,
          appointmentNumber: task.appointmentNumber,
          status: task.status,
          startedAt: workStartTime, // Use actual start time from workflow history
          estimatedCompletion: combineDateTime(task.scheduledDate, task.scheduledTime),
          customerName: `${task.customerId?.firstName || ''} ${task.customerId?.lastName || ''}`,
          vehicleInfo: `${task.vehicleId?.make || ''} ${task.vehicleId?.model || ''} ${task.vehicleId?.year || ''}`,
          currentStep: appointmentStatusTranslations[task.status] || task.status,
          progress: getProgressPercentage(task.status),
        });
      } else {
        setCurrentTask(null);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchDashboard = () => {
    debouncedFetch(fetchDashboardData);
  };

  const immediateFetchDashboard = () => {
    debouncedFetch(fetchDashboardData, true);
  };

  const getProgressPercentage = (status: string): number => {
    const statusProgress = {
      'confirmed': 10,
      'customer_arrived': 20,
      'reception_created': 40,
      'reception_approved': 60,
      'in_progress': 80,
      'completed': 100,
    };
    return statusProgress[status as keyof typeof statusProgress] || 0;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'text-gray-500',
      'normal': 'text-blue-500',
      'high': 'text-orange-500',
      'urgent': 'text-red-500',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  };

  const handleStartWork = async (appointmentId: string) => {
    try {
      await appointmentsAPI.updateStatus(appointmentId, 'in_progress');
      toast.success('Đã bắt đầu công việc');
      immediateFetchDashboard();
    } catch (error: any) {
      console.error('Error starting work:', error);
      toast.error('Không thể bắt đầu công việc');
    }
  };

  const handleCompleteWork = async (appointmentId: string) => {
    try {
      await appointmentsAPI.updateStatus(appointmentId, 'completed');
      toast.success('Đã hoàn thành công việc');
      immediateFetchDashboard();
    } catch (error: any) {
      console.error('Error completing work:', error);
      toast.error('Không thể hoàn thành công việc');
    }
  };

  const handleResubmitReception = async (receptionId: string) => {
    try {
      const response = await fetch(`/api/service-receptions/${receptionId}/resubmit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Đã gửi lại phiếu tiếp nhận để staff duyệt');
        setSelectedReception(null);
        debouncedFetchDashboard();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Không thể gửi lại phiếu');
      }
    } catch (error) {
      console.error('Error resubmitting reception:', error);
      toast.error('Lỗi khi gửi lại phiếu tiếp nhận');
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTimeSinceStart = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return formatDuration(diffMinutes);
  };

  if (loading || fetchLoading()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                Kỹ thuật viên - {user?.firstName} {user?.lastName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Hôm nay: {formatVietnameseDateTime(currentTime.toISOString()).split(' ')[0]}
              </p>
              <div className="flex items-center mt-2">
                <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs">
                    {isConnected ? 'Kết nối trực tiếp' : 'Mất kết nối'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
              <Link
                to="/work-queue"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <ClipboardDocumentListIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Hàng đợi công việc
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats && [
            {
              name: 'Lịch hẹn hôm nay',
              value: stats.todayAppointments,
              icon: ClockIcon,
              color: 'blue',
            },
            {
              name: 'Đang thực hiện',
              value: stats.inProgressAppointments,
              icon: WrenchScrewdriverIcon,
              color: 'yellow',
            },
            {
              name: 'Hoàn thành hôm nay',
              value: stats.completedToday,
              icon: CheckCircleIcon,
              color: 'green',
            },
            {
              name: 'Đánh giá trung bình',
              value: (stats.customerRating || 0).toFixed(1) + '/5',
              icon: ChartBarIcon,
              color: 'purple',
            }
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden"
              >
                <div>
                  <div className={`absolute rounded-md p-3 bg-${stat.color}-500`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                </div>
                <div className="ml-16 pb-6 flex items-baseline">
                  <p className={`text-2xl font-semibold text-${stat.color}-600`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Current Task */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Công việc hiện tại
                </h3>
                {currentTask ? (
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        #{currentTask.appointmentNumber}
                      </h4>
                      <p className="text-sm text-gray-600">{currentTask.customerName}</p>
                      <p className="text-sm text-gray-500">{currentTask.vehicleInfo}</p>
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        {currentTask.currentStep}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Tiến độ</span>
                        <span>{currentTask.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentTask.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <p>Bắt đầu: {getTimeSinceStart(currentTask.startedAt)} trước</p>
                      <p>Dự kiến hoàn thành: {formatVietnameseDateTime(currentTask.estimatedCompletion)}</p>
                    </div>

                    <div className="flex space-x-2">
                      {currentTask.status === 'reception_approved' && (
                        <button
                          onClick={() => handleStartWork(currentTask._id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Bắt đầu
                        </button>
                      )}
                      {currentTask.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteWork(currentTask._id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Hoàn thành
                        </button>
                      )}
                      <Link
                        to={`/service-reception/${currentTask._id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4 mr-1" />
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có công việc</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Hiện tại bạn không có công việc nào đang thực hiện.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Work Queue */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Hàng đợi công việc
                </h3>
                {workQueue.length === 0 ? (
                  <div className="text-center py-6">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có công việc</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Hàng đợi công việc hiện đang trống.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workQueue.slice(0, 6).map((item) => (
                      <div
                        key={item._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-semibold text-gray-900">
                                #{item.appointmentNumber}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'customer_arrived' ? 'bg-indigo-100 text-indigo-800' :
                                item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointmentStatusTranslations[item.status] || item.status}
                              </span>
                              <ExclamationTriangleIcon className={`h-4 w-4 ${getPriorityColor(item.priority || 'normal')}`} />
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.customerId?.firstName || ''} {item.customerId?.lastName || ''} - {item.customerId?.phone || ''}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.vehicleId?.make || ''} {item.vehicleId?.model || ''} - {item.vehicleId?.licensePlate || ''}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatVietnameseDateTime(combineDateTime(item.scheduledDate, item.scheduledTime))}
                            </p>
                            <p className="text-sm text-gray-500">
                              Thời gian ước tính: {formatDuration(item.estimatedDuration || 60)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {item.status === 'customer_arrived' && (
                              <Link
                                to={`/service-reception/${item._id}`}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Tạo phiếu
                              </Link>
                            )}
                            {item.status === 'reception_approved' && !currentTask && (
                              <button
                                onClick={() => handleStartWork(item._id)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-green-600 hover:bg-green-700"
                              >
                                Bắt đầu
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {workQueue.length > 6 && (
                      <div className="text-center pt-4">
                        <Link
                          to="/work-queue"
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          Xem tất cả ({workQueue.length - 6} việc còn lại) →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Service Receptions List */}
        <div className="mt-8">
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Phiếu tiếp nhận đã tạo
              </h3>
              {serviceReceptions.length === 0 ? (
                <div className="text-center py-6">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Chưa có phiếu tiếp nhận</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Bạn chưa tạo phiếu tiếp nhận nào.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số phiếu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khách hàng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Xe
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dịch vụ / Phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái duyệt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tạo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serviceReceptions.map((reception) => (
                        <tr key={reception._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reception.receptionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reception.customerId?.firstName} {reception.customerId?.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reception.vehicleId?.make} {reception.vehicleId?.model}
                            <br />
                            <span className="text-xs text-gray-400">{reception.vehicleId?.licensePlate}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs">
                              <div className="text-blue-600">{reception.recommendedServices?.length || 0} dịch vụ</div>
                              <div className="text-purple-600">{reception.requestedParts?.length || 0} phụ tùng</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              reception.submissionStatus?.staffReviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              reception.submissionStatus?.staffReviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              reception.submissionStatus?.submittedToStaff ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {reception.submissionStatus?.staffReviewStatus === 'approved' ? 'Đã duyệt' :
                               reception.submissionStatus?.staffReviewStatus === 'rejected' ? 'Từ chối' :
                               reception.submissionStatus?.submittedToStaff ? 'Chờ duyệt' :
                               'Chưa gửi'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatVietnameseDateTime(reception.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedReception(reception)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service Reception Detail Modal */}
        {selectedReception && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  Chi tiết phiếu tiếp nhận - {selectedReception.receptionNumber}
                </h3>
                <button
                  onClick={() => setSelectedReception(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer & Vehicle Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Thông tin khách hàng</h4>
                    <p className="text-gray-900">
                      {selectedReception.customerId?.firstName} {selectedReception.customerId?.lastName}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Thông tin xe</h4>
                    <p className="text-gray-900">
                      {selectedReception.vehicleId?.make} {selectedReception.vehicleId?.model}
                    </p>
                    <p className="text-sm text-gray-500">{selectedReception.vehicleId?.licensePlate}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Trạng thái duyệt</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedReception.submissionStatus?.staffReviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedReception.submissionStatus?.staffReviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    selectedReception.submissionStatus?.submittedToStaff ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedReception.submissionStatus?.staffReviewStatus === 'approved' ? 'Đã duyệt' :
                     selectedReception.submissionStatus?.staffReviewStatus === 'rejected' ? 'Từ chối' :
                     selectedReception.submissionStatus?.submittedToStaff ? 'Chờ duyệt' :
                     'Chưa gửi'}
                  </span>
                </div>

                {/* Recommended Services */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Dịch vụ đề xuất ({selectedReception.recommendedServices?.length || 0})
                  </h4>
                  {selectedReception.recommendedServices && selectedReception.recommendedServices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReception.recommendedServices.map((service, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded">
                          <p className="font-medium text-gray-900">{service.serviceName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Không có dịch vụ đề xuất</p>
                  )}
                </div>

                {/* Requested Parts */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Phụ tùng yêu cầu ({selectedReception.requestedParts?.length || 0})
                  </h4>
                  {selectedReception.requestedParts && selectedReception.requestedParts.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReception.requestedParts.map((part, index) => (
                        <div key={index} className="bg-purple-50 p-3 rounded">
                          <p className="font-medium text-gray-900">{part.partName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Không có phụ tùng yêu cầu</p>
                  )}
                </div>

                {/* Created Date */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Ngày tạo</h4>
                  <p className="text-gray-900">{formatVietnameseDateTime(selectedReception.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                {selectedReception.submissionStatus?.staffReviewStatus === 'rejected' && (
                  <div className="text-sm">
                    <p className="text-red-600 font-medium">Lý do từ chối:</p>
                    <p className="text-gray-700">{selectedReception.submissionStatus.reviewNotes || 'Không có lý do cụ thể'}</p>
                  </div>
                )}
                <div className="flex space-x-2 ml-auto">
                  {selectedReception.submissionStatus?.staffReviewStatus === 'rejected' && (
                    <button
                      onClick={() => handleResubmitReception(selectedReception._id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Gửi lại để duyệt
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReception(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTechnicianDashboard;