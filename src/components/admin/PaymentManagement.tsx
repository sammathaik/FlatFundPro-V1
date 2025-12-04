import { useState, useEffect } from 'react';
import React from 'react';
import { Download, Trash2, Eye, Search, Filter, RefreshCw, Check, ChevronDown, ChevronUp, MoreVertical, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV, logAudit, formatDateTime, formatDate } from '../../lib/utils';

interface PaymentWithDetails {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  transaction_reference: string | null;
  payment_quarter: string | null;
  comments: string | null;
  screenshot_url: string;
  screenshot_filename: string;
  status: 'Received' | 'Reviewed' | 'Approved';
  created_at: string;
  block: { block_name: string };
  flat: { flat_number: string };
  payer_name?: string | null;
  payee_name?: string | null;
  bank_name?: string | null;
  currency?: string | null;
  platform?: string | null;
  payment_type?: string | null;
  sender_upi_id?: string | null;
  receiver_account?: string | null;
  ifsc_code?: string | null;
  narration?: string | null;
  screenshot_source?: string | null;
  other_text?: string | null;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  contingency: 'Contingency',
  emergency: 'Emergency',
};

export default function PaymentManagement() {
  const { adminData } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'Received' | 'Reviewed' | 'Approved'>('Received');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const toggleRow = (paymentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelect = (paymentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPayments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayments.map(p => p.id)));
    }
  };

  useEffect(() => {
    if (adminData?.apartment_id) {
      loadPayments();
    }
  }, [adminData]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, quarterFilter, paymentTypeFilter]);

  async function loadPayments() {
    if (!adminData?.apartment_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          block:buildings_blocks_phases(block_name),
          flat:flat_numbers(flat_number)
        `)
        .eq('apartment_id', adminData.apartment_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPayments() {
    let filtered = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.flat?.flat_number.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (quarterFilter !== 'all') {
      filtered = filtered.filter((p) => p.payment_quarter === quarterFilter);
    }

    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter((p) => (p.payment_type || '').toLowerCase() === paymentTypeFilter.toLowerCase());
    }

    setFilteredPayments(filtered);
  }

  function openStatusModal(payment: PaymentWithDetails) {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setShowStatusModal(true);
    setActionMenuOpen(null);
  }

  async function updateStatus() {
    if (!selectedPayment || !adminData) return;

    try {
      const { error } = await supabase
        .from('payment_submissions')
        .update({
          status: newStatus,
          reviewed_by: adminData.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      await logAudit('status_update', 'payment_submissions', selectedPayment.id, {
        old_status: selectedPayment.status,
        new_status: newStatus,
        payment_name: selectedPayment.name,
      });

      setShowStatusModal(false);
      loadPayments();
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  }

  async function deletePayment(payment: PaymentWithDetails) {
    if (!confirm(`Delete payment submission from ${payment.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_submissions')
        .delete()
        .eq('id', payment.id);

      if (error) throw error;

      await logAudit('delete', 'payment_submissions', payment.id, {
        name: payment.name,
        email: payment.email,
      });

      setActionMenuOpen(null);
      loadPayments();
    } catch (error: any) {
      alert('Error deleting payment: ' + error.message);
    }
  }

  async function deleteSelectedPayments() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Delete ${count} payment submission${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds);
      const { error } = await supabase
        .from('payment_submissions')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      // Log audit for each deleted payment
      for (const id of idsToDelete) {
        const payment = payments.find(p => p.id === id);
        if (payment) {
          await logAudit('delete', 'payment_submissions', id, {
            name: payment.name,
            email: payment.email,
            bulk_delete: true,
          });
        }
      }

      setSelectedIds(new Set());
      loadPayments();
    } catch (error: any) {
      alert('Error deleting payments: ' + error.message);
    }
  }

  function handleExport() {
    const exportData = filteredPayments.map((payment) => ({
      building_block: payment.block?.block_name || '',
      flat_number: payment.flat?.flat_number || '',
      name: payment.name,
      email: payment.email,
      contact_number: payment.contact_number || '',
      payment_amount: payment.payment_amount || '',
      payment_date: payment.payment_date || '',
      transaction_reference: payment.transaction_reference || '',
      quarter: payment.payment_quarter || '',
      comments: payment.comments || '',
      status: payment.status,
      submitted_at: payment.created_at,
      screenshot_url: payment.screenshot_url,
      payer_name: payment.payer_name || '',
      payee_name: payment.payee_name || '',
      bank_name: payment.bank_name || '',
      currency: payment.currency || '',
      platform: payment.platform || '',
      payment_type: payment.payment_type || '',
      sender_upi_id: payment.sender_upi_id || '',
      receiver_account: payment.receiver_account || '',
      ifsc_code: payment.ifsc_code || '',
      narration: payment.narration || '',
      screenshot_source: payment.screenshot_source || '',
      other_text: payment.other_text || '',
    }));

    exportToCSV(exportData, 'payment_submissions');
    logAudit('export', 'payment_submissions', undefined, { count: exportData.length });
  }

  const statusOptions: Array<'Received' | 'Reviewed' | 'Approved'> = ['Received', 'Reviewed', 'Approved'];
  const allSelected = filteredPayments.length > 0 && selectedIds.size === filteredPayments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredPayments.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Submissions</h2>
          <p className="text-gray-600 mt-1">Review and manage payment proofs from residents</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelectedPayments}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadPayments}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or flat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Quarters</option>
            {Array.from(new Set(payments.map(p => p.payment_quarter).filter(Boolean))).sort().reverse().map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div className="sm:w-48 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Status</option>
            <option value="Received">Received</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
        <div className="sm:w-60 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Payment Types</option>
            <option value="maintenance">Maintenance</option>
            <option value="contingency">Contingency</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-800">
          Showing {filteredPayments.length} of {payments.length} payment submissions
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                  ) : someSelected ? (
                    <div className="w-5 h-5 border-2 border-amber-600 bg-amber-50 rounded"></div>
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Resident
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPayments.map((payment) => (
              <React.Fragment key={payment.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelect(payment.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedIds.has(payment.id) ? (
                        <CheckSquare className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{payment.block?.block_name}</div>
                    <div className="text-gray-500 text-xs">{payment.flat?.flat_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{payment.name}</div>
                    <div className="text-xs text-gray-500">{payment.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {payment.payment_amount ? `₹${payment.payment_amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'Reviewed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.payment_date ? formatDate(payment.payment_date) : formatDate(payment.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleRow(payment.id)}
                        className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={expandedRows.has(payment.id) ? "Collapse" : "Expand"}
                      >
                        {expandedRows.has(payment.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === payment.id ? null : payment.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === payment.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            ></div>
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => openStatusModal(payment)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Update Status
                              </button>
                              <button
                                onClick={() => deletePayment(payment)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(payment.id) && (
                  <tr key={`${payment.id}-details`} className="bg-amber-50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="bg-white rounded-lg border border-amber-200 p-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-1 h-4 bg-amber-600 rounded"></span>
                          Complete Payment Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Contact Number</label>
                            <p className="text-sm text-gray-900">{payment.contact_number || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Quarter</label>
                            <p className="text-sm text-gray-900">{payment.payment_quarter || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Transaction Ref</label>
                            <p className="text-sm text-gray-900 font-mono text-xs">{payment.transaction_reference || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Submitted On</label>
                            <p className="text-sm text-gray-900">{formatDateTime(payment.created_at)}</p>
                          </div>
                          {payment.payer_name && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payer Name</label>
                              <p className="text-sm text-gray-900">{payment.payer_name}</p>
                            </div>
                          )}
                          {payment.payee_name && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payee Name</label>
                              <p className="text-sm text-gray-900">{payment.payee_name}</p>
                            </div>
                          )}
                          {payment.bank_name && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Bank Name</label>
                              <p className="text-sm text-gray-900">{payment.bank_name}</p>
                            </div>
                          )}
                          {payment.currency && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Currency</label>
                              <p className="text-sm text-gray-900">{payment.currency}</p>
                            </div>
                          )}
                          {payment.platform && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Platform</label>
                              <p className="text-sm text-gray-900">{payment.platform}</p>
                            </div>
                          )}
                          {payment.sender_upi_id && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Sender UPI ID</label>
                              <p className="text-sm text-gray-900 font-mono text-xs">{payment.sender_upi_id}</p>
                            </div>
                          )}
                          {payment.receiver_account && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Receiver Account</label>
                              <p className="text-sm text-gray-900 font-mono text-xs">{payment.receiver_account}</p>
                            </div>
                          )}
                          {payment.ifsc_code && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">IFSC Code</label>
                              <p className="text-sm text-gray-900 font-mono text-xs">{payment.ifsc_code}</p>
                            </div>
                          )}
                          {payment.screenshot_source && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Screenshot Source</label>
                              <p className="text-sm text-gray-900">{payment.screenshot_source}</p>
                            </div>
                          )}
                        </div>
                        {(payment.narration || payment.comments || payment.other_text) && (
                          <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                            {payment.narration && (
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Narration</label>
                                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">{payment.narration}</p>
                              </div>
                            )}
                            {payment.comments && (
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Comments</label>
                                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">{payment.comments}</p>
                              </div>
                            )}
                            {payment.other_text && (
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Other Information</label>
                                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">{payment.other_text}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {payment.screenshot_url && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Payment Screenshot</label>
                            <a
                              href={payment.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
                            >
                              View Screenshot →
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment submissions found matching your criteria.
          </div>
        )}
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {filteredPayments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleSelect(payment.id)}
                    className="mt-1 p-1"
                  >
                    {selectedIds.has(payment.id) ? (
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{payment.name}</h3>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                          payment.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Reviewed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{payment.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="font-medium">{payment.block?.block_name}</span>
                      <span>•</span>
                      <span>{payment.flat?.flat_number}</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === payment.id ? null : payment.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {actionMenuOpen === payment.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActionMenuOpen(null)}
                      ></div>
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setActionMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => openStatusModal(payment)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Update Status
                        </button>
                        <button
                          onClick={() => deletePayment(payment)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Amount</label>
                  <p className="text-sm font-semibold text-gray-900">
                    {payment.payment_amount ? `₹${payment.payment_amount.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Type</label>
                  <p className="text-sm text-gray-900">
                    {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Date</label>
                  <p className="text-sm text-gray-900">
                    {payment.payment_date ? formatDate(payment.payment_date) : formatDate(payment.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Quarter</label>
                  <p className="text-sm text-gray-900">{payment.payment_quarter || '-'}</p>
                </div>
              </div>

              <button
                onClick={() => toggleRow(payment.id)}
                className="w-full mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                {expandedRows.has(payment.id) ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show All Details
                  </>
                )}
              </button>

              {expandedRows.has(payment.id) && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {payment.contact_number && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Contact</label>
                        <p className="text-sm text-gray-900">{payment.contact_number}</p>
                      </div>
                    )}
                    {payment.transaction_reference && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Txn Ref</label>
                        <p className="text-sm text-gray-900 font-mono text-xs break-all">{payment.transaction_reference}</p>
                      </div>
                    )}
                    {payment.payer_name && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payer</label>
                        <p className="text-sm text-gray-900">{payment.payer_name}</p>
                      </div>
                    )}
                    {payment.payee_name && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payee</label>
                        <p className="text-sm text-gray-900">{payment.payee_name}</p>
                      </div>
                    )}
                    {payment.bank_name && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Bank</label>
                        <p className="text-sm text-gray-900">{payment.bank_name}</p>
                      </div>
                    )}
                    {payment.platform && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Platform</label>
                        <p className="text-sm text-gray-900">{payment.platform}</p>
                      </div>
                    )}
                    {payment.sender_upi_id && (
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Sender UPI</label>
                        <p className="text-sm text-gray-900 font-mono text-xs break-all">{payment.sender_upi_id}</p>
                      </div>
                    )}
                    {payment.receiver_account && (
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Receiver Account</label>
                        <p className="text-sm text-gray-900 font-mono text-xs break-all">{payment.receiver_account}</p>
                      </div>
                    )}
                    {payment.ifsc_code && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">IFSC</label>
                        <p className="text-sm text-gray-900 font-mono text-xs">{payment.ifsc_code}</p>
                      </div>
                    )}
                  </div>
                  {payment.narration && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Narration</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{payment.narration}</p>
                    </div>
                  )}
                  {payment.comments && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Comments</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{payment.comments}</p>
                    </div>
                  )}
                  {payment.other_text && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Other Info</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{payment.other_text}</p>
                    </div>
                  )}
                  {payment.screenshot_url && (
                    <div>
                      <a
                        href={payment.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
                      >
                        View Screenshot →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment submissions found matching your criteria.
          </div>
        )}
      </div>

      {selectedPayment && !showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Building/Block</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.block?.block_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Flat Number</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.flat?.flat_number}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.contact_number || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.payment_amount
                      ? `₹${selectedPayment.payment_amount.toLocaleString()}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Payment Date</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.payment_date || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Transaction Ref</label>
                  <p className="text-sm font-medium text-gray-900 mt-1 font-mono">
                    {selectedPayment.transaction_reference || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Quarter</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.payment_quarter || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Submitted On</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDateTime(selectedPayment.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.status}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Comments</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200 min-h-[60px]">
                  {selectedPayment.comments || 'No comments'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                  Payment Screenshot
                </label>
                <a
                  href={selectedPayment.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
                >
                  View Screenshot →
                </a>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => openStatusModal(selectedPayment)}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Update Payment Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Current Status: <span className="text-amber-600">{selectedPayment.status}</span>
                </label>
                <div className="space-y-2">
                  {statusOptions.map((status) => (
                    <label
                      key={status}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        newStatus === status
                          ? 'border-amber-600 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={newStatus === status}
                        onChange={(e) => setNewStatus(e.target.value as 'Received' | 'Reviewed' | 'Approved')}
                        className="mr-3"
                      />
                      <span className="font-medium text-gray-900">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Status changes are logged for compliance and audit purposes.
                  Email notifications will be sent to the resident.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={updateStatus}
                  disabled={newStatus === selectedPayment.status}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
