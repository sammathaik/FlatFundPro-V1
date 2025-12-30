import { useState, useEffect } from 'react';
import { MessageSquare, Eye, X, Filter, Calendar, Phone, User, AlertCircle, CheckCircle, Send, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';

interface WhatsAppNotification {
  id: string;
  payment_submission_id: string;
  recipient_name: string;
  recipient_phone: string;
  channel: string;
  delivery_mode: string;
  template_name: string;
  message_preview: string;
  trigger_reason: string;
  status: string;
  created_at: string;
  sent_at?: string;
  failure_reason?: string;
  delivery_attempts?: number;
}

interface StatusMessage {
  type: 'success' | 'error';
  message: string;
}

export default function WhatsAppNotifications() {
  const { adminData, superAdminData, isSuperAdmin } = useAuth();
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<WhatsAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<WhatsAppNotification | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggerReasonFilter, setTriggerReasonFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [adminData, superAdminData]);

  useEffect(() => {
    applyFilters();
  }, [notifications, statusFilter, triggerReasonFilter, dateRangeFilter]);

  async function loadNotifications() {
    try {
      setLoading(true);

      let query = supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by apartment if not super admin
      if (!isSuperAdmin && adminData?.apartment_id) {
        // Join with payment_submissions to filter by apartment
        const { data: paymentSubmissions } = await supabase
          .from('payment_submissions')
          .select('id')
          .eq('apartment_id', adminData.apartment_id);

        if (paymentSubmissions) {
          const paymentIds = paymentSubmissions.map(p => p.id);
          query = query.in('payment_submission_id', paymentIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading WhatsApp notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...notifications];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(n => n.status === statusFilter);
    }

    // Trigger reason filter
    if (triggerReasonFilter !== 'all') {
      filtered = filtered.filter(n => n.trigger_reason === triggerReasonFilter);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRangeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(n => new Date(n.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(n => new Date(n.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(n => new Date(n.created_at) >= filterDate);
          break;
      }
    }

    setFilteredNotifications(filtered);
  }

  function openMessageModal(notification: WhatsAppNotification) {
    setSelectedNotification(notification);
    setShowMessageModal(true);
  }

  function closeMessageModal() {
    setShowMessageModal(false);
    setSelectedNotification(null);
  }

  async function testSendNotification(notification: WhatsAppNotification) {
    if (sendingNotificationId) return;

    try {
      setSendingNotificationId(notification.id);
      setStatusMessage(null);

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-notification`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          id: notification.id,
          recipient_phone: notification.recipient_phone,
          message_preview: notification.message_preview,
          recipient_name: notification.recipient_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Message sent successfully via Gupshup Sandbox!'
        });
      } else {
        let errorMsg = result.message || 'Unknown error';

        if (errorMsg.includes('API key')) {
          errorMsg += '\n\nPlease configure GUPSHUP_API_KEY in Supabase Edge Functions secrets.\nSee FIX_GUPSHUP_API_KEY_ERROR.md for detailed instructions.';
        } else if (errorMsg.includes('Portal User') || errorMsg.includes('account not found')) {
          errorMsg = 'Invalid Gupshup API key or account not found\n\nPlease configure GUPSHUP_API_KEY in Supabase Edge Functions secrets.\nSee FIX_GUPSHUP_API_KEY_ERROR.md for detailed instructions.';
        }

        setStatusMessage({
          type: 'error',
          message: errorMsg
        });
      }

      await loadNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
      setStatusMessage({
        type: 'error',
        message: 'Error sending notification. Check console for details.'
      });
    } finally {
      setSendingNotificationId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'SIMULATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Simulated
          </span>
        );
      case 'SANDBOX_SENT':
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3.5 h-3.5" />
            {status === 'SANDBOX_SENT' ? 'Sandbox Sent' : 'Sent'}
          </span>
        );
      case 'SANDBOX_FAILED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            <X className="w-3.5 h-3.5" />
            {status === 'SANDBOX_FAILED' ? 'Sandbox Failed' : 'Failed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  }

  const uniqueStatuses = Array.from(new Set(notifications.map(n => n.status)));
  const uniqueTriggerReasons = Array.from(new Set(notifications.map(n => n.trigger_reason)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WhatsApp Notifications (Preview)
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                This screen shows WhatsApp notifications prepared by the system for testing and review purposes.
                Messages are not sent to users yet.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mt-4 p-4 rounded-lg border ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`text-sm font-semibold mb-1 ${
                  statusMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {statusMessage.type === 'success' ? 'Success!' : 'Failed to send message'}
                </h3>
                <p className={`text-sm whitespace-pre-line ${
                  statusMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {statusMessage.message}
                </p>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className={`${
                  statusMessage.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
                } transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Sandbox Mode - Testing Enabled
              </h3>
              <p className="text-sm text-blue-700">
                All notifications shown here are in <strong>GUPSHUP_SANDBOX</strong> mode.
                Use the <strong>Test Send</strong> button to attempt delivery via Gupshup Sandbox API.
                Messages may not reach actual users. This is for testing, review, and audit purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-900">Filter Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Trigger Reason Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Reason
              </label>
              <select
                value={triggerReasonFilter}
                onChange={(e) => setTriggerReasonFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Triggers</option>
                {uniqueTriggerReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setStatusFilter('all');
                setTriggerReasonFilter('all');
                setDateRangeFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Total Notifications</div>
          <div className="text-2xl font-bold text-gray-900">{filteredNotifications.length}</div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Simulated</div>
          <div className="text-2xl font-bold text-blue-900">
            {filteredNotifications.filter(n => n.status === 'SIMULATED').length}
          </div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-600 mb-1">Sent</div>
          <div className="text-2xl font-bold text-green-900">
            {filteredNotifications.filter(n => n.status === 'SENT' || n.status === 'SANDBOX_SENT').length}
          </div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-600 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-900">
            {filteredNotifications.filter(n => n.status === 'FAILED' || n.status === 'SANDBOX_FAILED').length}
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications Found</h3>
            <p className="text-gray-600">
              {notifications.length === 0
                ? 'No WhatsApp notifications have been generated yet.'
                : 'No notifications match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trigger Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDateTime(notification.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {notification.recipient_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 font-mono">
                          {notification.recipient_phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {notification.trigger_reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-mono">
                        {notification.template_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(notification.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        {notification.delivery_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openMessageModal(notification)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View full message"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {notification.status === 'SIMULATED' && (
                          <button
                            onClick={() => testSendNotification(notification)}
                            disabled={sendingNotificationId === notification.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Test send via Gupshup Sandbox"
                          >
                            {sendingNotificationId === notification.id ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Test Send
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Preview Modal */}
      {showMessageModal && selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeMessageModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      WhatsApp Message Preview
                    </h3>
                  </div>
                  <button
                    onClick={closeMessageModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Recipient Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient Name
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {selectedNotification.recipient_name}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-mono text-gray-900">
                        {selectedNotification.recipient_phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notification Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trigger Reason
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedNotification.trigger_reason}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </label>
                    <div className="mt-1 text-sm font-mono text-gray-600">
                      {selectedNotification.template_name}
                    </div>
                  </div>
                </div>

                {/* Status and Mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedNotification.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Mode
                    </label>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        {selectedNotification.delivery_mode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Message Content
                  </label>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 shadow-sm">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans leading-relaxed">
                        {selectedNotification.message_preview}
                      </pre>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    This is a preview of the WhatsApp message that would be sent.
                    No actual message has been delivered.
                  </p>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {formatDateTime(selectedNotification.created_at)}</span>
                  </div>
                  {selectedNotification.sent_at && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Sent: {formatDateTime(selectedNotification.sent_at)}</span>
                    </div>
                  )}
                  {selectedNotification.failure_reason && (
                    <div className="flex items-start gap-2 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>Failure Reason: {selectedNotification.failure_reason}</span>
                    </div>
                  )}
                  {selectedNotification.delivery_attempts && selectedNotification.delivery_attempts > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Send className="w-3.5 h-3.5" />
                      <span>Delivery Attempts: {selectedNotification.delivery_attempts}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={closeMessageModal}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
