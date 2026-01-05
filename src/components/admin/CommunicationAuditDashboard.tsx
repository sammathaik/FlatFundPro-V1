import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Mail,
  MessageSquare,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CommunicationLog {
  id: string;
  apartment_id: string;
  apartment_name: string;
  flat_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_mobile_masked: string | null;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  type: string;
  payment_id: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  subject: string | null;
  preview: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  triggered_by_event: string | null;
  template_name: string | null;
  created_at: string;
}

interface CommunicationStats {
  total_communications: number;
  email_sent: number;
  email_delivered: number;
  email_failed: number;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_failed: number;
  whatsapp_skipped: number;
  avg_delivery_time_minutes: number;
}

interface CommunicationAuditDashboardProps {
  apartmentId: string;
}

export const CommunicationAuditDashboard: React.FC<CommunicationAuditDashboardProps> = ({ apartmentId }) => {
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchCommunications();
    fetchStatistics();
  }, [apartmentId, dateRange]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('admin_communication_dashboard')
        .select('*')
        .eq('apartment_id', apartmentId)
        .order('created_at', { ascending: false });

      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_communication_statistics', {
        p_apartment_id: apartmentId,
        p_start_date: dateRange === 'all' ? null : new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: new Date().toISOString()
      }).single();

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const getFilteredCommunications = () => {
    return communications.filter(comm => {
      const matchesSearch = searchTerm === '' ||
        comm.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.preview?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChannel = channelFilter === 'all' || comm.channel === channelFilter;
      const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
      const matchesType = typeFilter === 'all' || comm.type === typeFilter;

      return matchesSearch && matchesChannel && matchesStatus && matchesType;
    });
  };

  const getPaginatedCommunications = () => {
    const filtered = getFilteredCommunications();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalFilteredRecords = getFilteredCommunications().length;
  const totalPages = Math.ceil(totalFilteredRecords / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, channelFilter, statusFilter, typeFilter, dateRange, pageSize]);

  const getStatusBadge = (status: string) => {
    const styles = {
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      SENT: 'bg-blue-100 text-blue-800 border-blue-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SKIPPED: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      DELIVERED: <CheckCircle2 className="w-3 h-3" />,
      SENT: <Clock className="w-3 h-3" />,
      FAILED: <XCircle className="w-3 h-3" />,
      PENDING: <Clock className="w-3 h-3" />,
      SKIPPED: <AlertCircle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredCommunications();
    const csv = [
      ['Date', 'Flat', 'Recipient', 'Channel', 'Type', 'Status', 'Subject'].join(','),
      ...filtered.map(comm => [
        new Date(comm.created_at).toLocaleDateString(),
        comm.flat_number,
        comm.recipient_name || comm.recipient_email || comm.recipient_mobile_masked || 'N/A',
        comm.channel,
        comm.type,
        comm.status,
        `"${comm.subject || ''}"`
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communication Audit Trail</h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete history of all resident communications with PII protection
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Communications</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_communications}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Email Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.email_delivered}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.email_failed > 0 && `${stats.email_failed} failed`}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">WhatsApp Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.whatsapp_delivered}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.whatsapp_skipped > 0 && `${stats.whatsapp_skipped} skipped`}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Delivery Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.avg_delivery_time_minutes ? `${stats.avg_delivery_time_minutes.toFixed(1)}m` : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search flat, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="payment_acknowledgment">Payment Acknowledgment</option>
            <option value="payment_approval">Payment Approval</option>
            <option value="payment_reminder">Payment Reminder</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading communications...</p>
          </div>
        ) : totalFilteredRecords === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No communications found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {getPaginatedCommunications().map((comm) => (
              <div key={comm.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
                <div className="p-4 bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getChannelIcon(comm.channel)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">Flat {comm.flat_number}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">{comm.recipient_name || comm.recipient_email || comm.recipient_mobile_masked}</span>
                        </div>
                        <div className="text-sm text-gray-700 font-medium mb-1">
                          {comm.subject || comm.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{comm.preview}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {getStatusBadge(comm.status)}
                      <div className="text-right text-xs text-gray-500">
                        <div>{new Date(comm.created_at).toLocaleDateString()}</div>
                        <div>{new Date(comm.created_at).toLocaleTimeString()}</div>
                      </div>
                      {expandedId === comm.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {expandedId === comm.id && (
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Channel:</span>
                        <span className="ml-2 font-medium">{comm.channel}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-medium">{comm.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sent:</span>
                        <span className="ml-2 font-medium">{comm.sent_at ? new Date(comm.sent_at).toLocaleString() : 'Not sent'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Delivered:</span>
                        <span className="ml-2 font-medium">{comm.delivered_at ? new Date(comm.delivered_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      {comm.payment_id && (
                        <>
                          <div>
                            <span className="text-gray-600">Payment Amount:</span>
                            <span className="ml-2 font-medium">₹{comm.payment_amount?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payment Date:</span>
                            <span className="ml-2 font-medium">{comm.payment_date ? new Date(comm.payment_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </>
                      )}
                      {comm.recipient_mobile_masked && (
                        <div>
                          <span className="text-gray-600">Mobile:</span>
                          <span className="ml-2 font-medium font-mono">{comm.recipient_mobile_masked}</span>
                        </div>
                      )}
                      {comm.template_name && (
                        <div>
                          <span className="text-gray-600">Template:</span>
                          <span className="ml-2 font-medium">{comm.template_name}</span>
                        </div>
                      )}
                    </div>

                    {comm.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-red-900">Error Details</div>
                            <div className="text-xs text-red-700 mt-1">{comm.error_message}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {comm.preview && (
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-2">Message Preview</div>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap">{comm.preview}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pageSize, totalFilteredRecords)}
                    </span>{' '}
                    of <span className="font-medium">{totalFilteredRecords}</span> records
                  </div>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
