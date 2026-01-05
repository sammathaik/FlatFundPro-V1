import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Building2,
  Filter,
  Search,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Home
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';

interface WhatsAppCommunication {
  id: string;
  apartment_id: string;
  apartment_name: string;
  flat_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_mobile_masked: string | null;
  channel: string;
  type: string;
  related_payment_id: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  subject: string | null;
  preview: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  triggered_by_event: string | null;
  template_name: string | null;
  whatsapp_opt_in_status: boolean | null;
  retry_count: number;
  created_at: string;
}

interface Apartment {
  id: string;
  apartment_name: string;
}

export default function WhatsAppCommunicationAudit() {
  const { adminData, superAdminData, isSuperAdmin } = useAuth();

  // Super Admin state
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);

  // Data state
  const [communications, setCommunications] = useState<WhatsAppCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [optInFilter, setOptInFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Load apartments for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      loadApartments();
    } else if (adminData?.apartment_id) {
      // For regular admins, auto-set the apartment
      setSelectedApartmentId(adminData.apartment_id);
    }
  }, [isSuperAdmin, adminData]);

  // Load communications when apartment is selected
  useEffect(() => {
    if (selectedApartmentId) {
      loadCommunications();
    }
  }, [selectedApartmentId, dateRange]);

  async function loadApartments() {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, apartment_name')
        .order('apartment_name');

      if (error) throw error;
      setApartments(data || []);
    } catch (error) {
      console.error('Error loading apartments:', error);
    }
  }

  async function loadCommunications() {
    if (!selectedApartmentId) return;

    try {
      setLoading(true);

      let dateFilter = '';
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter = `AND cl.created_at >= '${startDate.toISOString()}'`;
      }

      const { data, error } = await supabase.rpc('get_whatsapp_communications', {
        p_apartment_id: selectedApartmentId,
        p_date_filter: dateFilter,
        p_limit: 500
      });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error loading WhatsApp communications:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredCommunications() {
    return communications.filter(comm => {
      const matchesSearch = searchTerm === '' ||
        comm.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.recipient_mobile_masked?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
      const matchesTrigger = triggerFilter === 'all' || comm.type === triggerFilter;

      const matchesOptIn = optInFilter === 'all' ||
        (optInFilter === 'opted_in' && comm.whatsapp_opt_in_status === true) ||
        (optInFilter === 'not_opted_in' && comm.whatsapp_opt_in_status === false);

      return matchesSearch && matchesStatus && matchesTrigger && matchesOptIn;
    });
  }

  function getPaginatedCommunications() {
    const filtered = getFilteredCommunications();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  }

  const totalFilteredRecords = getFilteredCommunications().length;
  const totalPages = Math.ceil(totalFilteredRecords / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, triggerFilter, optInFilter, dateRange, pageSize]);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DELIVERED':
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status === 'DELIVERED' ? 'Sent via Sandbox' : 'Sent via Sandbox'}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Sandbox Failed
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Not Sent - No Opt-in
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Clock className="w-3.5 h-3.5" />
            Pending
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

  function getOptInBadge(optedIn: boolean | null) {
    if (optedIn === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Opted In
        </span>
      );
    } else if (optedIn === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
          <XCircle className="w-3.5 h-3.5" />
          No Opt-in
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
          <AlertCircle className="w-3.5 h-3.5" />
          Unknown
        </span>
      );
    }
  }

  function getTriggerLabel(type: string) {
    const labels: Record<string, string> = {
      payment_acknowledgment: 'Payment Received',
      payment_approval: 'Payment Approved',
      payment_reminder: 'Payment Reminder',
      payment_rejection: 'Payment Rejected',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function exportToCSV() {
    const filtered = getFilteredCommunications();
    const csv = [
      ['Date', 'Time', 'Flat', 'Resident', 'Mobile', 'Opt-in', 'Trigger', 'Status', 'Payment Amount'].join(','),
      ...filtered.map(comm => [
        new Date(comm.created_at).toLocaleDateString(),
        new Date(comm.created_at).toLocaleTimeString(),
        comm.flat_number,
        comm.recipient_name || 'N/A',
        comm.recipient_mobile_masked || 'N/A',
        comm.whatsapp_opt_in_status ? 'Yes' : 'No',
        getTriggerLabel(comm.type),
        comm.status,
        comm.payment_amount ? `₹${comm.payment_amount}` : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-audit-${selectedApartmentName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const filteredCommunications = getFilteredCommunications();
  const selectedApartmentName = apartments.find(a => a.id === selectedApartmentId)?.apartment_name || 'Unknown';

  const uniqueStatuses = Array.from(new Set(communications.map(c => c.status)));
  const uniqueTriggers = Array.from(new Set(communications.map(c => c.type)));

  // Statistics
  const stats = {
    total: filteredCommunications.length,
    sent: filteredCommunications.filter(c => c.status === 'SENT' || c.status === 'DELIVERED').length,
    failed: filteredCommunications.filter(c => c.status === 'FAILED').length,
    skipped: filteredCommunications.filter(c => c.status === 'SKIPPED').length,
    optedIn: filteredCommunications.filter(c => c.whatsapp_opt_in_status === true).length,
    notOptedIn: filteredCommunications.filter(c => c.whatsapp_opt_in_status === false).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WhatsApp Communication Audit
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Complete audit trail of WhatsApp communications with opt-in visibility and governance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedApartmentId && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Sandbox Mode Banner */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">
                Gupshup Sandbox Mode
              </h3>
              <p className="text-sm text-amber-700">
                All WhatsApp communications shown here are sent via <strong>GUPSHUP_SANDBOX</strong>.
                This is a test environment. Delivery confirmations may not reflect actual receipt by users.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Apartment Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Apartment</h3>
          </div>
          <div className="max-w-md">
            <select
              value={selectedApartmentId || ''}
              onChange={(e) => setSelectedApartmentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose apartment to view WhatsApp communications...</option>
              {apartments.map(apt => (
                <option key={apt.id} value={apt.id}>{apt.apartment_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Empty State - No Apartment Selected */}
      {!selectedApartmentId && (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select an Apartment to View WhatsApp Communications
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              WhatsApp notifications will be displayed after selecting an apartment.
              {isSuperAdmin && ' Use the dropdown above to choose an apartment.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Show when apartment is selected */}
      {selectedApartmentId && (
        <>
          {/* Filters Section */}
          {showFilters && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-900">Filter Communications</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search flat, name, mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                {/* Trigger Filter */}
                <select
                  value={triggerFilter}
                  onChange={(e) => setTriggerFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Triggers</option>
                  {uniqueTriggers.map(trigger => (
                    <option key={trigger} value={trigger}>{getTriggerLabel(trigger)}</option>
                  ))}
                </select>

                {/* Opt-in Filter */}
                <select
                  value={optInFilter}
                  onChange={(e) => setOptInFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Opt-in Status</option>
                  <option value="opted_in">Opted In</option>
                  <option value="not_opted_in">No Opt-in</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div className="flex gap-2">
                  {(['7d', '30d', '90d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        dateRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : 'All Time'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTriggerFilter('all');
                    setOptInFilter('all');
                    setDateRange('30d');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Sent</div>
              <div className="text-2xl font-bold text-green-900">{stats.sent}</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600 mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Skipped</div>
              <div className="text-2xl font-bold text-gray-900">{stats.skipped}</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Opted In</div>
              <div className="text-2xl font-bold text-green-900">{stats.optedIn}</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">No Opt-in</div>
              <div className="text-2xl font-bold text-gray-900">{stats.notOptedIn}</div>
            </div>
          </div>

          {/* Communications Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading communications...</p>
              </div>
            ) : totalFilteredRecords === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No WhatsApp Communications Found</h3>
                <p className="text-gray-600">
                  {communications.length === 0
                    ? `No WhatsApp communications have been sent for ${selectedApartmentName} yet.`
                    : 'No communications match the selected filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resident
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opt-in
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trigger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getPaginatedCommunications().map((comm) => (
                      <React.Fragment key={comm.id}>
                        <tr className={`transition-colors ${expandedId === comm.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(comm.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(comm.created_at).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {comm.flat_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {comm.recipient_name || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 font-mono">
                                {comm.recipient_mobile_masked || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getOptInBadge(comm.whatsapp_opt_in_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {getTriggerLabel(comm.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(comm.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              {expandedId === comm.id ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  <span>Details</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {expandedId === comm.id && (
                          <tr>
                            <td colSpan={8} className="px-0 py-0">
                              <div className="bg-gray-50 border-t border-b border-gray-200 p-6">
                      <div className="max-w-4xl mx-auto space-y-4">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Apartment
                            </label>
                            <div className="mt-1 text-sm text-gray-900">{comm.apartment_name}</div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Template
                            </label>
                            <div className="mt-1 text-sm text-gray-600 font-mono">{comm.template_name || 'N/A'}</div>
                          </div>
                          {comm.sent_at && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sent At
                              </label>
                              <div className="mt-1 text-sm text-gray-900">{formatDateTime(comm.sent_at)}</div>
                            </div>
                          )}
                          {comm.payment_amount && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Amount
                              </label>
                              <div className="mt-1 text-sm text-gray-900 font-semibold">
                                ₹{comm.payment_amount.toLocaleString()}
                              </div>
                            </div>
                          )}
                          {comm.payment_date && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Date
                              </label>
                              <div className="mt-1 text-sm text-gray-900">
                                {new Date(comm.payment_date).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                          {comm.retry_count > 0 && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Retry Count
                              </label>
                              <div className="mt-1 text-sm text-gray-900">{comm.retry_count}</div>
                            </div>
                          )}
                        </div>

                        {/* Error Message */}
                        {comm.error_message && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-red-900 mb-1">Error Details</div>
                                <div className="text-sm text-red-700">{comm.error_message}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message Preview */}
                        {comm.preview && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                              Message Content
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans leading-relaxed">
                                {comm.full_message_data?.message || comm.preview}
                              </pre>
                            </div>
                            <div className="mt-2 text-xs text-gray-600 italic">
                              This is the WhatsApp message that was sent via Gupshup Sandbox.
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedId(null)}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Close Details
                        </button>
                      </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
