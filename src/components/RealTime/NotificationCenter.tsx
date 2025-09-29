import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  // XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  TruckIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';
import { formatVietnameseDateTime } from '../../utils/vietnamese';
import { toast } from 'react-hot-toast';

export interface Notification {
  id: string;
  type: 'appointment_reminder' | 'status_update' | 'payment_due' | 'parts_available' | 'maintenance_due' | 'system_alert' | 'chat_message' | 'invoice_ready';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
  data?: Record<string, any>;
  actions?: {
    label: string;
    action: string;
    variant: 'primary' | 'secondary';
  }[];
}

interface Props {
  userId: string;
  userRole: 'customer' | 'staff' | 'technician' | 'admin';
  onActionClick?: (action: string, notification: Notification) => void;
  maxNotifications?: number;
  showOnlyUnread?: boolean;
}

const NotificationCenter: React.FC<Props> = ({
  userId,
  userRole,
  onActionClick,
  maxNotifications = 50,
  showOnlyUnread = false
}) => {
  const { useCustomEvent, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high_priority'>('all');

  // Listen for real-time notifications
  useCustomEvent('newNotification', (data: {
    notification: Notification;
    targetUsers: string[];
    targetRoles: string[];
  }) => {
    // Check if this notification is for current user
    if (data.targetUsers.includes(userId) || data.targetRoles.includes(userRole)) {
      const notification = {
        ...data.notification,
        id: data.notification.id || `notif_${Date.now()}`,
        createdAt: data.notification.createdAt || new Date().toISOString()
      };

      setNotifications(prev => [notification, ...prev.slice(0, maxNotifications - 1)]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification for high priority items
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
        }

        // Show toast notification
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type, notification.priority)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setIsOpen(true);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Xem
              </button>
            </div>
          </div>
        ), {
          duration: notification.priority === 'urgent' ? 10000 : 5000
        });
      }
    }
  });

  // Listen for notification updates
  useCustomEvent('notificationUpdate', (data: {
    notificationId: string;
    updates: Partial<Notification>;
  }) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === data.notificationId
          ? { ...notif, ...data.updates }
          : notif
      )
    );
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `h-5 w-5 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'normal' ? 'text-blue-500' :
      'text-gray-500'
    }`;

    switch (type) {
      case 'appointment_reminder':
        return <CalendarIcon className={iconClass} />;
      case 'status_update':
        return <WrenchScrewdriverIcon className={iconClass} />;
      case 'payment_due':
      case 'invoice_ready':
        return <CreditCardIcon className={iconClass} />;
      case 'parts_available':
        return <TruckIcon className={iconClass} />;
      case 'maintenance_due':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'chat_message':
        return <UserIcon className={iconClass} />;
      case 'system_alert':
        return <InformationCircleIcon className={iconClass} />;
      default:
        return <BellIcon className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'normal': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'high_priority') {
      filtered = filtered.filter(n => n.priority === 'high' || n.priority === 'urgent');
    }

    if (showOnlyUnread) {
      filtered = filtered.filter(n => !n.isRead);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3 h-3 bg-yellow-500 rounded-full" />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount} mới
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {!isConnected && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                  Offline
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-500 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 p-2 bg-gray-50">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'unread', label: 'Chưa đọc' },
              { key: 'high_priority', label: 'Ưu tiên cao' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-gray-200">
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' :
                   filter === 'high_priority' ? 'Không có thông báo ưu tiên cao' :
                   'Không có thông báo nào'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-l-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      notification.isRead ? 'bg-white' : getPriorityColor(notification.priority)
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              {formatVietnameseDateTime(notification.createdAt)}
                            </p>
                            <div className="flex items-center space-x-2">
                              {notification.actions?.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActionClick?.(action.action, notification);
                                  }}
                                  className={`text-xs px-2 py-1 rounded font-medium ${
                                    action.variant === 'primary'
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title={notification.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                        >
                          {notification.isRead ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Xóa thông báo"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expiration warning */}
                    {notification.expiresAt && new Date(notification.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                        Hết hạn: {formatVietnameseDateTime(notification.expiresAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Hiển thị {filteredNotifications.length} / {notifications.length} thông báo
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;