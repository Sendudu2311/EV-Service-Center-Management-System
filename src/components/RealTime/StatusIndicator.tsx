import React, { useState, useEffect } from 'react';
import {
  // CheckCircleIcon, // Unused import
  // ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BoltIcon,
  EyeIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';
import { DetailedAppointmentStatus } from '../../types/appointment';
import { translateStatus, formatVietnameseDateTime } from '../../utils/vietnamese';

interface StatusUpdate {
  appointmentId: string;
  oldStatus: DetailedAppointmentStatus;
  newStatus: DetailedAppointmentStatus;
  timestamp: string;
  updatedBy: {
    name: string;
    role: string;
  };
  notes?: string;
}

interface Props {
  appointmentId: string;
  currentStatus: DetailedAppointmentStatus;
  onStatusChange?: (newStatus: DetailedAppointmentStatus, update: StatusUpdate) => void;
  showHistory?: boolean;
  compact?: boolean;
  animated?: boolean;
}

const StatusIndicator: React.FC<Props> = ({
  appointmentId,
  currentStatus,
  onStatusChange,
  showHistory = false,
  compact = false,
  animated = true
}) => {
  const { useCustomEvent, isConnected } = useSocket();
  const [status, setStatus] = useState<DetailedAppointmentStatus>(currentStatus);
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Listen for real-time status updates
  useCustomEvent('appointmentStatusUpdate', (data: {
    appointmentId: string;
    oldStatus: DetailedAppointmentStatus;
    newStatus: DetailedAppointmentStatus;
    updatedBy: { name: string; role: string };
    notes?: string;
  }) => {
    if (data.appointmentId === appointmentId) {
      setIsUpdating(true);

      const update: StatusUpdate = {
        appointmentId: data.appointmentId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: data.updatedBy,
        notes: data.notes
      };

      // Animate the status change
      setTimeout(() => {
        setStatus(data.newStatus);
        setLastUpdate(new Date());
        setStatusHistory(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
        setIsUpdating(false);

        // Call callback
        onStatusChange?.(data.newStatus, update);
      }, animated ? 500 : 0);
    }
  });

  // Update status when prop changes
  useEffect(() => {
    if (currentStatus !== status) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  const getStatusConfig = (status: DetailedAppointmentStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: null, // ClockIcon removed
          color: 'text-yellow-600 bg-yellow-100',
          pulse: true,
          description: 'Đang chờ xác nhận từ nhân viên'
        };
      case 'confirmed':
        return {
          icon: CheckCircleIcon,
          color: 'text-blue-600 bg-blue-100',
          pulse: false,
          description: 'Lịch hẹn đã được xác nhận'
        };
      case 'customer_arrived':
        return {
          icon: EyeIcon,
          color: 'text-indigo-600 bg-indigo-100',
          pulse: true,
          description: 'Khách hàng đã có mặt tại trung tâm'
        };
      case 'reception_created':
        return {
          icon: ArrowPathIcon,
          color: 'text-purple-600 bg-purple-100',
          pulse: true,
          description: 'Phiếu tiếp nhận đang được xử lý'
        };
      case 'reception_approved':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600 bg-green-100',
          pulse: false,
          description: 'Phiếu tiếp nhận đã được duyệt'
        };
      case 'in_progress':
        return {
          icon: BoltIcon,
          color: 'text-orange-600 bg-orange-100',
          pulse: true,
          description: 'Đang thực hiện dịch vụ'
        };
      case 'parts_requested':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-yellow-600 bg-yellow-100',
          pulse: true,
          description: 'Đang chờ phê duyệt phụ tùng'
        };
      case 'parts_insufficient':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-orange-600 bg-orange-100',
          pulse: true,
          description: 'Thiếu phụ tùng cần thiết'
        };
      case 'waiting_for_parts':
        return {
          icon: null, // ClockIcon removed
          color: 'text-yellow-600 bg-yellow-100',
          pulse: true,
          description: 'Đang chờ phụ tùng về kho'
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600 bg-green-100',
          pulse: false,
          description: 'Dịch vụ đã hoàn thành'
        };
      case 'invoiced':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600 bg-green-100',
          pulse: false,
          description: 'Hóa đơn đã được xuất'
        };
      case 'cancelled':
        return {
          icon: XCircleIcon,
          color: 'text-red-600 bg-red-100',
          pulse: false,
          description: 'Lịch hẹn đã bị hủy'
        };
      case 'no_show':
        return {
          icon: XCircleIcon,
          color: 'text-red-600 bg-red-100',
          pulse: false,
          description: 'Khách hàng không đến'
        };
      case 'rescheduled':
        return {
          icon: ArrowPathIcon,
          color: 'text-blue-600 bg-blue-100',
          pulse: false,
          description: 'Lịch hẹn đã được đổi'
        };
      default:
        return {
          icon: null, // ClockIcon removed
          color: 'text-gray-600 bg-gray-100',
          pulse: false,
          description: 'Trạng thái không xác định'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full ${statusConfig.color}`}>
          <StatusIcon className="h-4 w-4" />
          {statusConfig.pulse && (
            <div className={`absolute inset-0 rounded-full ${statusConfig.color.split(' ')[1]} animate-ping opacity-20`} />
          )}
          {isUpdating && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-spin" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {translateStatus(status)}
        </span>
        {!isConnected && (
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" title="Mất kết nối real-time" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-start space-x-4">
        <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full ${statusConfig.color} transition-all duration-500 ${isUpdating ? 'scale-110' : 'scale-100'}`}>
          <StatusIcon className="h-6 w-6" />
          {statusConfig.pulse && (
            <div className={`absolute inset-0 rounded-full ${statusConfig.color.split(' ')[1]} animate-ping opacity-20`} />
          )}
          {isUpdating && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-spin" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {translateStatus(status)}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {!isConnected && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Offline</span>
                </div>
              )}
              {isConnected && (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            {statusConfig.description}
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-2">
              Cập nhật lần cuối: {formatVietnameseDateTime(lastUpdate.toISOString())}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 ${
              status === 'pending' ? 'bg-yellow-500 w-1/12' :
              status === 'confirmed' ? 'bg-blue-500 w-2/12' :
              status === 'customer_arrived' ? 'bg-indigo-500 w-3/12' :
              status === 'reception_created' ? 'bg-purple-500 w-4/12' :
              status === 'reception_approved' ? 'bg-green-500 w-5/12' :
              status === 'in_progress' ? 'bg-orange-500 w-8/12' :
              status === 'completed' ? 'bg-green-500 w-10/12' :
              status === 'invoiced' ? 'bg-green-600 w-full' :
              'bg-gray-500 w-0'
            }`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Bắt đầu</span>
          <span>Hoàn thành</span>
        </div>
      </div>

      {/* Status History */}
      {showHistory && statusHistory.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <BellIcon className="h-4 w-4 mr-2" />
            Lịch sử cập nhật
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {statusHistory.map((update, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {translateStatus(update.oldStatus)} → {translateStatus(update.newStatus)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatVietnameseDateTime(update.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Bởi: {update.updatedBy.name} ({
                      update.updatedBy.role === 'customer' ? 'Khách hàng' :
                      update.updatedBy.role === 'staff' ? 'Nhân viên' :
                      update.updatedBy.role === 'technician' ? 'Kỹ thuật viên' :
                      update.updatedBy.role === 'admin' ? 'Quản trị viên' :
                      update.updatedBy.role
                    })
                  </p>
                  {update.notes && (
                    <p className="text-xs text-gray-700 mt-1 italic">
                      "{update.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;