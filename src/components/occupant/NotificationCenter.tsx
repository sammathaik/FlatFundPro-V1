import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  AlertCircle,
  Info,
  FileText,
  DollarSign,
  Home,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';

interface Notification {
  id: string;
  apartment_id: string;
  apartment_name: string;
  flat_id: string;
  flat_number: string;
  type: string;
  title: string;
  message: string;
  context_data: any;
  priority: 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  created_at: string;
}

interface UserFlat {
  apartment_id: string;
  apartment_name: string;
  flat_id: string;
  flat_number: string;
  occupant_name: string;
  unread_count: number;
}

interface NotificationCenterProps {
  mobile: string;
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationCenter({
  mobile,
  isOpen,
  onClose,
  onUnreadCountChange
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userFlats, setUserFlats] = useState<UserFlat[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<UserFlat | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFlatSelector, setShowFlatSelector] = useState(false);

  useEffect(() => {
    if (isOpen && mobile) {
      loadUserFlats();
    }
  }, [isOpen, mobile]);

  useEffect(() => {
    if (selectedFlat) {
      loadNotifications();
      updateUnreadCount();
    }
  }, [selectedFlat]);

  async function loadUserFlats() {
    try {
      const { data, error } = await supabase.rpc('get_user_flats_for_notifications', {
        p_mobile: mobile
      });

      if (error) throw error;

      setUserFlats(data || []);

      if (data && data.length > 0) {
        setSelectedFlat(data[0]);
      }
    } catch (error) {
      console.error('Error loading user flats:', error);
    }
  }

  async function loadNotifications() {
    if (!selectedFlat) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_occupant_notifications', {
        p_mobile: mobile,
        p_flat_id: selectedFlat.flat_id,
        p_apartment_id: selectedFlat.apartment_id,
        p_limit: 50,
        p_unread_only: false
      });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUnreadCount() {
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count', {
        p_mobile: mobile,
        p_flat_id: null,
        p_apartment_id: null
      });

      if (error) throw error;
      if (onUnreadCountChange) {
        onUnreadCountChange(data || 0);
      }
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId,
        p_mobile: mobile
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      updateUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    if (!selectedFlat) return;

    try {
      const { error } = await supabase.rpc('mark_all_notifications_as_read', {
        p_mobile: mobile,
        p_flat_id: selectedFlat.flat_id,
        p_apartment_id: selectedFlat.apartment_id
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );

      await loadUserFlats();
      updateUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'payment_reminder':
      case 'payment_overdue':
        return <DollarSign className="w-5 h-5" />;
      case 'payment_approved':
        return <CheckCheck className="w-5 h-5" />;
      case 'payment_rejected':
      case 'payment_clarification_needed':
        return <AlertCircle className="w-5 h-5" />;
      case 'collection_announcement':
      case 'collection_status_update':
        return <FileText className="w-5 h-5" />;
      case 'fine_applied':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  }

  function getNotificationColor(type: string, priority: string) {
    if (priority === 'urgent') return 'text-red-600 bg-red-50 border-red-200';
    if (priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';

    switch (type) {
      case 'payment_approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'payment_rejected':
      case 'fine_applied':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'payment_clarification_needed':
      case 'payment_overdue':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6" />
              <h2 className="text-xl font-bold">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Flat Selector */}
          {userFlats.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowFlatSelector(!showFlatSelector)}
                className="w-full flex items-center justify-between bg-blue-500 bg-opacity-50 hover:bg-opacity-70 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {selectedFlat?.apartment_name}
                    </div>
                    <div className="text-xs opacity-90">
                      Flat {selectedFlat?.flat_number}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFlatSelector ? 'rotate-180' : ''}`} />
              </button>

              {showFlatSelector && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto z-10">
                  {userFlats.map((flat) => (
                    <button
                      key={`${flat.apartment_id}-${flat.flat_id}`}
                      onClick={() => {
                        setSelectedFlat(flat);
                        setShowFlatSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        selectedFlat?.flat_id === flat.flat_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {flat.apartment_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            Flat {flat.flat_number}
                          </div>
                        </div>
                        {flat.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                            {flat.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {userFlats.length === 1 && selectedFlat && (
            <div className="bg-blue-500 bg-opacity-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <div>
                  <div className="text-sm font-medium">
                    {selectedFlat.apartment_name}
                  </div>
                  <div className="text-xs opacity-90">
                    Flat {selectedFlat.flat_number}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </div>
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600 text-sm">
                You'll see payment updates, reminders, and announcements here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    notification.is_read ? 'bg-white' : 'bg-blue-50'
                  } hover:bg-gray-50`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${getNotificationColor(notification.type, notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
