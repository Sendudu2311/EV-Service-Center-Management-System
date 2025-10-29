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
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dark-300 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type, notification.priority)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-text-muted text-white">{notification.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{notification.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-dark-200">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setIsOpen(true);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm text-text-muted text-lime-600 hover:text-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
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
      priority === 'urgent' ? 'text-red-600' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'normal' ? 'text-lime-500' :
      'text-text-muted'
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
      case 'normal': return 'border-l-blue-500 bg-dark-900';
      default: return 'border-l-gray-500 bg-dark-900';
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
        className="relative p-2 text-text-muted hover:text-text-muted focus:outline-none focus:ring-2 focus:ring-lime-400 rounded-lg"
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
        <div className="absolute right-0 mt-2 w-96 bg-dark-300 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-200">
            <h3 className="text-lg font-semibold text-white">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-dark-300 text-red-600">
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
                className="p-1 text-text-muted hover:text-text-muted rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 p-2 bg-dark-900">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'unread', label: 'Chưa đọc' },
              { key: 'high_priority', label: 'Ưu tiên cao' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1 rounded text-sm text-text-muted transition-colors ${
                  filter === tab.key
                    ? 'bg-lime-100 text-lime-700'
                    : 'text-text-secondary hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-dark-200">
              <button
                onClick={markAllAsRead}
                className="text-sm text-lime-600 hover:text-lime-700 text-text-muted"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <BellIcon className="h-8 w-8 mx-auto mb-2 text-text-muted" />
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
                    className={`border-l-4 p-4 hover:bg-dark-900 cursor-pointer transition-colors ${
                      notification.isRead ? 'bg-dark-300' : getPriorityColor(notification.priority)
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm text-text-muted text-white ${!notification.isRead ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-dark-9000 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-text-muted">
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
                                  className={`text-xs px-2 py-1 rounded text-text-muted ${
                                    action.variant === 'primary'
                                      ? 'bg-lime-600 text-white hover:bg-lime-100 transition-all duration-200 transform hover:scale-105'
                                      : 'bg-dark-200 text-text-secondary hover:bg-dark-300'
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
                          className="p-1 text-text-muted hover:text-text-secondary rounded"
                          title={notification.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                        >
                          {notification.isRead ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-text-muted hover:text-red-600 rounded"
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
            <div className="p-3 border-t border-dark-200 bg-dark-900">
              <p className="text-xs text-text-muted text-center">
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
