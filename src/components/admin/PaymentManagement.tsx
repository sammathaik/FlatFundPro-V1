import { useState, useEffect } from 'react';
import React from 'react';
import { Download, Trash2, Eye, Search, Filter, RefreshCw, Check, ChevronDown, ChevronUp, MoreVertical, CheckSquare, Square, Shield, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV, logAudit, formatDateTime, formatDate } from '../../lib/utils';
import DocumentClassificationBadge from './DocumentClassificationBadge';
import PaymentReviewPanel from './PaymentReviewPanel';
import AdminManualPaymentEntry from './AdminManualPaymentEntry';

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
  expected_collection?: { collection_name: string } | null;
  payer_name?: string | null;
  payee_name?: string | null;
  bank_name?: string | null;
  currency?: string | null;
  platform?: string | null;
  payment_type?: string | null;
  payment_source?: string | null;
  sender_upi_id?: string | null;
  receiver_account?: string | null;
  ifsc_code?: string | null;
  narration?: string | null;
  screenshot_source?: string | null;
  other_text?: string | null;
  fraud_score?: number | null;
  is_fraud_flagged?: boolean | null;
  fraud_indicators?: any[] | null;
  fraud_checked_at?: string | null;
  ocr_confidence_score?: number | null;
  ocr_text?: string | null;
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
  const [fraudFilter, setFraudFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'Received' | 'Reviewed' | 'Approved'>('Received');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [recheckingFraud, setRecheckingFraud] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithDetails | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [fraudCheckResult, setFraudCheckResult] = useState<{
    score: number;
    isFlagged: boolean;
    indicators?: any[];
  } | null>(null);
  const [showFraudResultModal, setShowFraudResultModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

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
  }, [payments, searchTerm, statusFilter, quarterFilter, paymentTypeFilter, fraudFilter]);

  useEffect(() => {
    const handleOpenPaymentReview = (event: CustomEvent) => {
      const { paymentId } = event.detail;
      if (paymentId) {
        setReviewingPaymentId(paymentId);
        setShowReviewPanel(true);
      }
    };

    window.addEventListener('openPaymentReview', handleOpenPaymentReview as EventListener);

    return () => {
      window.removeEventListener('openPaymentReview', handleOpenPaymentReview as EventListener);
    };
  }, []);

  async function loadPayments() {
    if (!adminData?.apartment_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          block:buildings_blocks_phases(block_name),
          flat:flat_numbers(flat_number),
          expected_collection:expected_collections(collection_name)
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

    if (fraudFilter !== 'all') {
      if (fraudFilter === 'flagged') {
        filtered = filtered.filter((p) => p.is_fraud_flagged === true);
      } else if (fraudFilter === 'critical') {
        filtered = filtered.filter((p) => (p.fraud_score || 0) >= 80);
      } else if (fraudFilter === 'high') {
        filtered = filtered.filter((p) => (p.fraud_score || 0) >= 60 && (p.fraud_score || 0) < 80);
      } else if (fraudFilter === 'medium') {
        filtered = filtered.filter((p) => (p.fraud_score || 0) >= 40 && (p.fraud_score || 0) < 60);
      } else if (fraudFilter === 'clean') {
        filtered = filtered.filter((p) => (p.fraud_score || 0) < 40);
      }
    }

    setFilteredPayments(filtered);
  }

  function openStatusModal(payment: PaymentWithDetails) {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setShowStatusModal(true);
    setActionMenuOpen(null);
  }

  function openReviewPanel(paymentId: string) {
    setReviewingPaymentId(paymentId);
    setShowReviewPanel(true);
    setActionMenuOpen(null);
  }

  function handleReviewSuccess() {
    setShowReviewPanel(false);
    setReviewingPaymentId(null);
    loadPayments();
    setSuccessMessage('Payment reviewed and action taken successfully');
    setTimeout(() => setSuccessMessage(null), 5000);
  }

  async function updateStatus() {
    if (!selectedPayment || !adminData) return;

    try {
      setUpdatingStatus(true);
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

      // Send notifications if status is changed to "Approved"
      if (newStatus === 'Approved') {
        try {
          // Get flat email mapping for mobile and opt-in status
          const { data: flatMapping } = await supabase
            .from('flat_email_mappings')
            .select('whatsapp_opt_in, mobile, name')
            .eq('flat_id', selectedPayment.flat_id)
            .eq('apartment_id', selectedPayment.apartment_id)
            .maybeSingle();

          // Get apartment name
          const { data: apartmentData } = await supabase
            .from('apartments')
            .select('apartment_name')
            .eq('id', selectedPayment.apartment_id)
            .single();

          // Prepare notification payload
          const notificationPayload = {
            payment_submission_id: selectedPayment.id,
            recipient_email: selectedPayment.email,
            recipient_name: flatMapping?.name || selectedPayment.name,
            recipient_mobile: flatMapping?.mobile || selectedPayment.contact_number,
            flat_number: selectedPayment.flat.flat_number,
            apartment_name: apartmentData?.apartment_name || 'Your Apartment',
            approved_amount: selectedPayment.payment_amount,
            approved_date: selectedPayment.payment_date,
            whatsapp_opt_in: flatMapping?.whatsapp_opt_in || false,
          };

          // Send notifications (non-blocking with timeout)
          Promise.race([
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-approval-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(notificationPayload),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Notification timeout')), 10000)
            ),
          ]).then(async (response) => {
            if (response && 'ok' in response && response.ok) {
              const result = await response.json();
              console.log('Notifications sent:', result);
            }
          }).catch(error => {
            console.error('Notification send failed (non-blocking):', error);
          });
        } catch (notificationError) {
          // Log but don't fail the status update
          console.error('Error preparing notifications:', notificationError);
        }
      }

      setShowStatusModal(false);
      setSelectedPayment(null);
      await loadPayments();

      // Show success message
      const successMsg = newStatus === 'Approved'
        ? `Payment approved and notifications sent to ${selectedPayment.name}!`
        : `Payment status updated to "${newStatus}" successfully!`;
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDeletePayment(payment: PaymentWithDetails) {
    setPaymentToDelete(payment);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  }

  async function deletePayment() {
    if (!paymentToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('payment_submissions')
        .delete()
        .eq('id', paymentToDelete.id);

      if (error) throw error;

      await logAudit('delete', 'payment_submissions', paymentToDelete.id, {
        name: paymentToDelete.name,
        email: paymentToDelete.email,
      });

      setShowDeleteModal(false);
      setPaymentToDelete(null);
      await loadPayments();
    } catch (error: any) {
      alert('Error deleting payment: ' + error.message);
    } finally {
      setDeleting(false);
    }
  }

  function confirmBulkDelete() {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteModal(true);
  }

  async function deleteSelectedPayments() {
    if (selectedIds.size === 0) return;

    try {
      setDeleting(true);
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

      setShowBulkDeleteModal(false);
      setSelectedIds(new Set());
      await loadPayments();
    } catch (error: any) {
      alert('Error deleting payments: ' + error.message);
    } finally {
      setDeleting(false);
    }
  }

  async function recheckFraud(paymentId: string) {
    setRecheckingFraud(paymentId);
    try {
      const { data, error } = await supabase.rpc('manual_fraud_recheck', {
        p_payment_id: paymentId
      });

      if (error) throw error;

      if (data?.success) {
        await loadPayments();

        // Show fraud result in modal
        setFraudCheckResult({
          score: data.fraud_score,
          isFlagged: data.is_flagged,
          indicators: data.fraud_indicators
        });
        setShowFraudResultModal(true);
      } else {
        alert('Error: ' + (data?.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error rechecking fraud:', error);
      alert('Error rechecking fraud: ' + error.message);
    } finally {
      setRecheckingFraud(null);
    }
  }

  function getFraudRiskLabel(score: number | null | undefined): string {
    if (!score) return 'Not Checked';
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Clean';
  }

  function getFraudRiskColor(score: number | null | undefined): string {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-red-700';
    if (score >= 60) return 'text-indigo-700';
    if (score >= 40) return 'text-yellow-700';
    return 'text-green-700';
  }

  function getFraudRiskBgColor(score: number | null | undefined): string {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-red-100';
    if (score >= 60) return 'bg-indigo-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-green-100';
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
      collection_name: payment.expected_collection?.collection_name || '',
      payment_source: payment.payment_source || '',
      sender_upi_id: payment.sender_upi_id || '',
      receiver_account: payment.receiver_account || '',
      ifsc_code: payment.ifsc_code || '',
      narration: payment.narration || '',
      screenshot_source: payment.screenshot_source || '',
      other_text: payment.other_text || '',
      fraud_score: payment.fraud_score || '',
      is_fraud_flagged: payment.is_fraud_flagged ? 'Yes' : 'No',
      fraud_checked_at: payment.fraud_checked_at || '',
    }));

    exportToCSV(exportData, 'payment_submissions');
    logAudit('export', 'payment_submissions', undefined, { count: exportData.length });
  }

  const statusOptions: Array<'Received' | 'Reviewed' | 'Approved'> = ['Received', 'Reviewed', 'Approved'];
  const allSelected = filteredPayments.length > 0 && selectedIds.size === filteredPayments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredPayments.length;

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, quarterFilter, paymentTypeFilter, fraudFilter]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
              onClick={confirmBulkDelete}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadPayments}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or flat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-shadow"
            >
              <option value="all">All Quarters</option>
              {Array.from(new Set(payments.map(p => p.payment_quarter).filter(Boolean))).sort().reverse().map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-shadow"
            >
              <option value="all">All Status</option>
              <option value="Received">Received</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-shadow"
            >
              <option value="all">All Types</option>
              <option value="maintenance">Maintenance</option>
              <option value="contingency">Contingency</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-1 relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={fraudFilter}
              onChange={(e) => setFraudFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-shadow"
            >
              <option value="all">All Risk Levels</option>
              <option value="flagged">Flagged Only</option>
              <option value="critical">Critical (80+)</option>
              <option value="high">High (60-79)</option>
              <option value="medium">Medium (40-59)</option>
              <option value="clean">Clean (&lt;40)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-800">
            <span className="font-semibold">{filteredPayments.length}</span> of{' '}
            <span className="font-semibold">{payments.length}</span> payment{payments.length !== 1 ? 's' : ''} shown
            {selectedIds.size > 0 && (
              <span className="ml-2 text-blue-700 font-semibold">
                · {selectedIds.size} selected
              </span>
            )}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-gray-600">
              Page <span className="font-semibold">{currentPage}</span> of{' '}
              <span className="font-semibold">{totalPages}</span>
            </p>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : someSelected ? (
                    <div className="w-5 h-5 border-2 border-blue-600 bg-blue-50 rounded"></div>
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-24">
                Actions
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Flat
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Resident
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedPayments.map((payment) => (
              <React.Fragment key={payment.id}>
                <tr className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelect(payment.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedIds.has(payment.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(payment.id)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
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
                            <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
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
                                onClick={() => openReviewPanel(payment.id)}
                                className="w-full text-left px-4 py-2 text-sm text-blue-700 font-semibold hover:bg-blue-50 flex items-center gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Committee Review
                              </button>
                              <button
                                onClick={() => openStatusModal(payment)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Update Status
                              </button>
                              <button
                                onClick={() => {
                                  recheckFraud(payment.id);
                                  setActionMenuOpen(null);
                                }}
                                disabled={recheckingFraud === payment.id}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Shield className="w-4 h-4" />
                                {recheckingFraud === payment.id ? 'Checking...' : 'Recheck Fraud'}
                              </button>
                              <button
                                onClick={() => confirmDeletePayment(payment)}
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
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="font-semibold">{payment.flat?.flat_number}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{payment.block?.block_name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]" title={payment.name}>{payment.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]" title={payment.email}>{payment.email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900">
                    {payment.payment_amount ? `₹${payment.payment_amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'Reviewed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                    {payment.payment_date ? formatDate(payment.payment_date) : formatDate(payment.created_at)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                      </div>
                      {payment.expected_collection?.collection_name && (
                        <div className="text-xs text-gray-600 font-medium truncate max-w-[150px]" title={payment.expected_collection.collection_name}>
                          {payment.expected_collection.collection_name}
                        </div>
                      )}
                      {payment.fraud_score !== null && payment.fraud_score !== undefined && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded ${getFraudRiskBgColor(
                              payment.fraud_score
                            )} ${getFraudRiskColor(payment.fraud_score)}`}
                          >
                            {payment.is_fraud_flagged && <AlertTriangle className="w-3 h-3 mr-0.5" />}
                            {payment.fraud_score}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows.has(payment.id) && (
                  <tr key={`${payment.id}-details`} className="bg-blue-50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-4">
                        {payment.is_fraud_flagged && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-900 mb-2">FRAUD WARNING</h4>
                                <p className="text-sm text-red-800 mb-3">
                                  This payment has been flagged with a {getFraudRiskLabel(payment.fraud_score)} risk score of {payment.fraud_score}
                                </p>
                                {payment.fraud_indicators && payment.fraud_indicators.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-red-900 uppercase">Fraud Indicators:</p>
                                    {payment.fraud_indicators.map((indicator: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className={`p-2 rounded border text-xs ${
                                          indicator.severity === 'CRITICAL'
                                            ? 'bg-red-100 border-red-300 text-red-900'
                                            : indicator.severity === 'HIGH'
                                            ? 'bg-indigo-100 border-orange-300 text-orange-900'
                                            : 'bg-yellow-100 border-yellow-300 text-yellow-900'
                                        }`}
                                      >
                                        <div className="font-semibold">{indicator.type.replace(/_/g, ' ')}</div>
                                        <div className="mt-1">{indicator.message}</div>
                                        <div className="mt-1 flex items-center justify-between">
                                          <span className="font-semibold">{indicator.severity}</span>
                                          <span>+{indicator.points} points</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {payment.fraud_score !== null && payment.fraud_score !== undefined && !payment.is_fraud_flagged && payment.fraud_indicators && payment.fraud_indicators.length > 0 && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                            <div className="flex items-start gap-3">
                              <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-yellow-900 mb-2">Fraud Indicators Detected (Not Flagged)</h4>
                                <p className="text-sm text-yellow-800 mb-3">
                                  Risk Score: {payment.fraud_score} - Below flagging threshold but has {payment.fraud_indicators.length} indicator(s)
                                </p>
                                <div className="space-y-2">
                                  {payment.fraud_indicators.map((indicator: any, idx: number) => (
                                    <div key={idx} className="p-2 rounded border border-yellow-300 bg-yellow-100 text-xs text-yellow-900">
                                      <div className="font-semibold">{indicator.type.replace(/_/g, ' ')}</div>
                                      <div className="mt-1">{indicator.message}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <DocumentClassificationBadge
                          paymentId={payment.id}
                          ocrText={payment.other_text}
                          compact={false}
                        />

                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-1 h-4 bg-blue-600 rounded"></span>
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
                          {payment.payment_source && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payment Method</label>
                              <p className="text-sm text-gray-900">{payment.payment_source}</p>
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
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
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
        </div>

        {paginatedPayments.length === 0 && filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment submissions found matching your criteria.
          </div>
        )}
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-5">
        {paginatedPayments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleSelect(payment.id)}
                    className="mt-1 p-1"
                  >
                    {selectedIds.has(payment.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
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
                            : 'bg-blue-100 text-blue-800'
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
                          onClick={() => openReviewPanel(payment.id)}
                          className="w-full text-left px-4 py-2 text-sm text-blue-700 font-semibold hover:bg-blue-50 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Committee Review
                        </button>
                        <button
                          onClick={() => openStatusModal(payment)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Update Status
                        </button>
                        <button
                          onClick={() => {
                            recheckFraud(payment.id);
                            setActionMenuOpen(null);
                          }}
                          disabled={recheckingFraud === payment.id}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Shield className="w-4 h-4" />
                          {recheckingFraud === payment.id ? 'Checking...' : 'Recheck Fraud'}
                        </button>
                        <button
                          onClick={() => confirmDeletePayment(payment)}
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
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Collection Name</label>
                  <p className="text-sm text-gray-900">
                    {payment.expected_collection?.collection_name || '-'}
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
                className="w-full mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                    {payment.payment_source && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payment Method</label>
                        <p className="text-sm text-gray-900">{payment.payment_source}</p>
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
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
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

        {paginatedPayments.length === 0 && filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment submissions found matching your criteria.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredPayments.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-4 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Showing <span className="font-bold text-blue-700">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-blue-700">{Math.min(endIndex, filteredPayments.length)}</span> of{' '}
              <span className="font-bold text-blue-700">{filteredPayments.length}</span> results
              {selectedIds.size > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">
                  · {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="perPage" className="text-sm text-gray-700 font-medium whitespace-nowrap">
                Per page:
              </label>
              <select
                id="perPage"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">

            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
              title="First page"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
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
                    onClick={() => goToPage(pageNum)}
                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
              title="Last page"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Screenshot →
                </a>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => openStatusModal(selectedPayment)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
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
                  Current Status: <span className="text-blue-600">{selectedPayment.status}</span>
                </label>
                <div className="space-y-2">
                  {statusOptions.map((status) => (
                    <label
                      key={status}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        newStatus === status
                          ? 'border-blue-600 bg-blue-50'
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
                  disabled={newStatus === selectedPayment.status || updatingStatus}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  {updatingStatus ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && paymentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Delete Payment Submission</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPaymentToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
                disabled={deleting}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">
                    Are you sure you want to delete the payment submission from <strong>{paymentToDelete.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. All data associated with this submission will be permanently removed.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Flat:</span>
                    <span className="ml-2 font-medium text-gray-900">{paymentToDelete.flat?.flat_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {paymentToDelete.payment_amount ? `₹${paymentToDelete.payment_amount.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">{paymentToDelete.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPaymentToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={deletePayment}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Delete Multiple Submissions</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
                disabled={deleting}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">
                    Are you sure you want to delete <strong>{selectedIds.size}</strong> payment submission{selectedIds.size > 1 ? 's' : ''}?
                  </p>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. All data associated with these submissions will be permanently removed.
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-xs text-red-800 font-medium">
                  Warning: You are about to delete {selectedIds.size} payment{selectedIds.size > 1 ? 's' : ''} at once.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSelectedPayments}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFraudResultModal && fraudCheckResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Fraud Check Results</h3>
              <button
                onClick={() => {
                  setShowFraudResultModal(false);
                  setFraudCheckResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${getFraudRiskBgColor(
                    fraudCheckResult.score
                  )}`}
                >
                  {fraudCheckResult.isFlagged && (
                    <AlertTriangle className={`w-8 h-8 ${getFraudRiskColor(fraudCheckResult.score)}`} />
                  )}
                  {!fraudCheckResult.isFlagged && (
                    <Shield className={`w-8 h-8 ${getFraudRiskColor(fraudCheckResult.score)}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fraud Risk Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{fraudCheckResult.score}</span>
                    <span className="text-sm text-gray-500">/ 100</span>
                  </div>
                  <p className={`text-sm font-semibold mt-1 ${getFraudRiskColor(fraudCheckResult.score)}`}>
                    {getFraudRiskLabel(fraudCheckResult.score)} Risk
                  </p>
                </div>
              </div>

              <div
                className={`border-l-4 p-3 rounded ${
                  fraudCheckResult.isFlagged
                    ? 'bg-red-50 border-red-500'
                    : 'bg-green-50 border-green-500'
                }`}
              >
                <p className={`text-sm font-medium ${fraudCheckResult.isFlagged ? 'text-red-800' : 'text-green-800'}`}>
                  {fraudCheckResult.isFlagged
                    ? 'This payment has been flagged for review'
                    : 'No significant fraud indicators detected'}
                </p>
              </div>

              {fraudCheckResult.indicators && fraudCheckResult.indicators.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Detected Issues:</p>
                  {fraudCheckResult.indicators.map((indicator: any, index: number) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{indicator.type}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            indicator.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : indicator.severity === 'HIGH'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {indicator.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{indicator.message}</p>
                      <p className="text-xs text-gray-500 mt-1">Impact: +{indicator.points} points</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowFraudResultModal(false);
                    setFraudCheckResult(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewPanel && reviewingPaymentId && (
        <PaymentReviewPanel
          paymentId={reviewingPaymentId}
          onClose={() => {
            setShowReviewPanel(false);
            setReviewingPaymentId(null);
          }}
          onSuccess={handleReviewSuccess}
        />
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <Check className="w-5 h-5" />
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {showManualEntry && (
        <AdminManualPaymentEntry
          onClose={() => setShowManualEntry(false)}
          onSuccess={() => {
            setShowManualEntry(false);
            setSuccessMessage('Payment successfully recorded and notifications queued!');
            setTimeout(() => setSuccessMessage(null), 5000);
            loadPayments();
          }}
        />
      )}
    </div>
  );
}
