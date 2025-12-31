import { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  IndianRupee,
  FileText,
  Shield,
  Edit3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import DocumentClassificationBadge from './DocumentClassificationBadge';

interface PaymentReviewPanelProps {
  paymentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PaymentDetails {
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
  apartment_id: string;
  block_id: string;
  flat_id: string;
  submission_source: string;
  admin_action_type: string | null;
  committee_action_reason: string | null;
  original_values: any;
  committee_verified: boolean;
  approved_by: string | null;
  approved_at: string | null;
  occupant_type: string | null;
  payment_type: string | null;
  payment_source: string | null;
  platform: string | null;
  payer_name: string | null;
  fraud_score: number | null;
  is_fraud_flagged: boolean | null;
  block: { block_name: string };
  flat: { flat_number: string };
}

interface AuditEntry {
  id: string;
  action_type: string;
  performed_by_email: string;
  performed_by_role: string;
  before_values: any;
  after_values: any;
  reason: string;
  created_at: string;
}

type CommitteeAction = 'approve_as_is' | 'edit_and_approve' | 'submit_on_behalf' | 'rejected';

export default function PaymentReviewPanel({ paymentId, onClose, onSuccess }: PaymentReviewPanelProps) {
  const { adminData } = useAuth();
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [selectedAction, setSelectedAction] = useState<CommitteeAction | null>(null);
  const [committeeReason, setCommitteeReason] = useState('');
  const [editedPayment, setEditedPayment] = useState({
    payment_date: '',
    payment_amount: '',
    transaction_reference: '',
    payment_source: '',
    status: 'Approved' as 'Approved' | 'Received' | 'Reviewed',
  });

  useEffect(() => {
    loadPaymentDetails();
    loadAuditHistory();
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          block:buildings_blocks_phases(block_name),
          flat:flat_numbers(flat_number)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      setPayment(data);

      setEditedPayment({
        payment_date: data.payment_date || '',
        payment_amount: data.payment_amount?.toString() || '',
        transaction_reference: data.transaction_reference || '',
        payment_source: data.payment_source || '',
        status: 'Approved',
      });
    } catch (error) {
      console.error('Error loading payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_payment_audit_history', {
        p_payment_id: paymentId,
      });

      if (error) throw error;
      setAuditHistory(data || []);
    } catch (error) {
      console.error('Error loading audit history:', error);
    }
  };

  const handleActionChange = (action: CommitteeAction) => {
    setSelectedAction(action);
    setCommitteeReason('');
    setValidationErrors({});
    setErrorMessage(null);

    if (action === 'approve_as_is') {
      setEditedPayment({
        ...editedPayment,
        status: 'Approved',
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedAction) {
      setErrorMessage('Please select a committee action before submitting');
      return false;
    }

    if (selectedAction !== 'approve_as_is' && !committeeReason.trim()) {
      errors.reason = 'Reason is required for this committee action';
    }

    if ((selectedAction === 'edit_and_approve' || selectedAction === 'submit_on_behalf')) {
      if (!editedPayment.payment_amount || parseFloat(editedPayment.payment_amount) <= 0) {
        errors.amount = 'Please enter a valid payment amount';
      }
      if (!editedPayment.payment_date) {
        errors.date = 'Please select a payment date';
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setErrorMessage('Please correct the errors below before submitting');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleSubmitClick = () => {
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!payment || !adminData) return;
    if (!validateForm()) return;

    try {
      setSaving(true);

      const originalValues = {
        payment_date: payment.payment_date,
        payment_amount: payment.payment_amount,
        transaction_reference: payment.transaction_reference,
        payment_source: payment.payment_source,
        status: payment.status,
      };

      const updateData: any = {
        admin_action_type: selectedAction,
        committee_action_reason: committeeReason || null,
        committee_verified: true,
        approved_by: adminData.id,
        approved_at: new Date().toISOString(),
      };

      if (selectedAction === 'approve_as_is') {
        updateData.status = 'Approved';
      } else if (selectedAction === 'edit_and_approve' || selectedAction === 'submit_on_behalf') {
        updateData.original_values = originalValues;
        updateData.payment_date = editedPayment.payment_date;
        updateData.payment_amount = parseFloat(editedPayment.payment_amount);
        updateData.transaction_reference = editedPayment.transaction_reference;
        updateData.payment_source = editedPayment.payment_source;
        updateData.status = 'Approved';

        if (selectedAction === 'submit_on_behalf') {
          updateData.submission_source = 'admin_on_behalf';
        }
      } else if (selectedAction === 'rejected') {
        updateData.status = 'Received';
      }

      const { error: updateError } = await supabase
        .from('payment_submissions')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) throw updateError;

      if (selectedAction === 'approve_as_is' || selectedAction === 'edit_and_approve' || selectedAction === 'submit_on_behalf') {
        const { data: flatMapping } = await supabase
          .from('flat_email_mappings')
          .select('whatsapp_opt_in, mobile, name')
          .eq('flat_id', payment.flat_id)
          .eq('apartment_id', payment.apartment_id)
          .maybeSingle();

        const { data: apartmentData } = await supabase
          .from('apartments')
          .select('apartment_name')
          .eq('id', payment.apartment_id)
          .single();

        const notificationPayload = {
          payment_submission_id: paymentId,
          recipient_email: payment.email,
          recipient_name: flatMapping?.name || payment.name,
          recipient_mobile: flatMapping?.mobile || payment.contact_number,
          flat_number: payment.flat.flat_number,
          apartment_name: apartmentData?.apartment_name || 'Your Apartment',
          approved_amount: selectedAction === 'approve_as_is'
            ? payment.payment_amount
            : parseFloat(editedPayment.payment_amount),
          approved_date: selectedAction === 'approve_as_is'
            ? payment.payment_date
            : editedPayment.payment_date,
          whatsapp_opt_in: flatMapping?.whatsapp_opt_in || false,
        };

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
        ]).catch(error => {
          console.error('Notification send failed (non-blocking):', error);
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating payment:', error);
      setErrorMessage(
        error instanceof Error
          ? `Failed to update payment: ${error.message}`
          : 'Failed to update payment. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const isFieldEditable = selectedAction === 'edit_and_approve' || selectedAction === 'submit_on_behalf';

  if (loading || !payment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  const getActionBadgeColor = () => {
    if (payment.submission_source === 'admin_on_behalf') return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Reviewed': return 'bg-blue-100 text-blue-800';
      case 'Received': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full my-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7" />
            Committee Payment Review
          </h2>
          <p className="text-blue-100 mt-2">Review and take action on payment submission</p>
        </div>

        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-8">
            <section className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Original Submission Summary
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getActionBadgeColor()}`}>
                  {payment.submission_source === 'admin_on_behalf' ? 'Submitted by Committee' : 'Submitted by Resident'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resident Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{payment.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Flat Number</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {payment.block.block_name} - {payment.flat.flat_number}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Occupant Type</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{payment.occupant_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getStatusBadgeColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Amount</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {payment.payment_amount ? `₹${payment.payment_amount.toLocaleString()}` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Transaction Reference</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{payment.transaction_reference || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{payment.payment_source || payment.platform || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {payment.screenshot_url && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Uploaded Payment Proof</label>
                  <a
                    href={payment.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ImageIcon className="w-4 h-4" />
                    View Payment Screenshot
                  </a>
                  <DocumentClassificationBadge paymentSubmissionId={payment.id} />
                </div>
              )}

              {payment.is_fraud_flagged && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">Fraud Detection Alert</p>
                        <p className="text-sm text-red-700 mt-1">
                          Fraud Score: {payment.fraud_score}/100 - This payment has been flagged for review
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Committee Action Panel
              </h3>

              <div className="space-y-3">
                <label className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="committeeAction"
                    value="approve_as_is"
                    checked={selectedAction === 'approve_as_is'}
                    onChange={(e) => handleActionChange(e.target.value as CommitteeAction)}
                    className="mt-1 w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-gray-900">Approve as submitted</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Accept the payment details exactly as submitted by the resident
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="committeeAction"
                    value="edit_and_approve"
                    checked={selectedAction === 'edit_and_approve'}
                    onChange={(e) => handleActionChange(e.target.value as CommitteeAction)}
                    className="mt-1 w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-gray-900">Edit and approve</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Correct details based on bank statement or resident confirmation
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="committeeAction"
                    value="submit_on_behalf"
                    checked={selectedAction === 'submit_on_behalf'}
                    onChange={(e) => handleActionChange(e.target.value as CommitteeAction)}
                    className="mt-1 w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-gray-900">Submit on behalf of owner/tenant</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Enter payment details confirmed through bank reconciliation
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-red-500 transition-colors">
                  <input
                    type="radio"
                    name="committeeAction"
                    value="rejected"
                    checked={selectedAction === 'rejected'}
                    onChange={(e) => handleActionChange(e.target.value as CommitteeAction)}
                    className="mt-1 w-5 h-5 text-red-600 cursor-pointer"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-gray-900">Mark as unverifiable</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Unable to verify payment - requires resident follow-up
                    </p>
                  </div>
                </label>
              </div>

              {selectedAction && selectedAction !== 'approve_as_is' && (
                <div className="mt-6 pt-6 border-t border-blue-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reason for Committee Action <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={committeeReason}
                    onChange={(e) => {
                      setCommitteeReason(e.target.value);
                      if (validationErrors.reason) {
                        const newErrors = { ...validationErrors };
                        delete newErrors.reason;
                        setValidationErrors(newErrors);
                      }
                    }}
                    placeholder="Example: Confirmed via bank statement, OCR extraction error, Resident confirmation received"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.reason ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={3}
                  />
                  {validationErrors.reason && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    This reason will be logged in the audit trail and is mandatory for governance.
                  </p>
                </div>
              )}
            </section>

            {isFieldEditable && (
              <section className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  Editable Payment Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Payment Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={editedPayment.payment_date}
                      onChange={(e) => {
                        setEditedPayment({ ...editedPayment, payment_date: e.target.value });
                        if (validationErrors.date) {
                          const newErrors = { ...validationErrors };
                          delete newErrors.date;
                          setValidationErrors(newErrors);
                        }
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.date && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Payment Amount (₹) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedPayment.payment_amount}
                      onChange={(e) => {
                        setEditedPayment({ ...editedPayment, payment_amount: e.target.value });
                        if (validationErrors.amount) {
                          const newErrors = { ...validationErrors };
                          delete newErrors.amount;
                          setValidationErrors(newErrors);
                        }
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter amount"
                    />
                    {validationErrors.amount && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.amount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Transaction Reference / UTR
                    </label>
                    <input
                      type="text"
                      value={editedPayment.transaction_reference}
                      onChange={(e) => setEditedPayment({ ...editedPayment, transaction_reference: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter transaction reference"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={editedPayment.payment_source}
                      onChange={(e) => setEditedPayment({ ...editedPayment, payment_source: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select method</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Check">Check</option>
                      <option value="Cash">Cash</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Payment proof is optional for committee-entered submissions. Changes will be logged in the audit trail.
                  </p>
                </div>
              </section>
            )}

            {auditHistory.length > 0 && (
              <section className="bg-gray-50 rounded-xl border-2 border-gray-200">
                <button
                  onClick={() => setShowAuditHistory(!showAuditHistory)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Audit History ({auditHistory.length} entries)
                  </h3>
                  {showAuditHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showAuditHistory && (
                  <div className="px-6 pb-6 space-y-3">
                    {auditHistory.map((entry) => (
                      <div key={entry.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            {entry.action_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          By: <span className="font-semibold">{entry.performed_by_email || 'System'}</span>
                          {entry.performed_by_role && ` (${entry.performed_by_role})`}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            <strong>Reason:</strong> {entry.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-6 rounded-b-2xl border-t-2 border-gray-200">
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Committee actions are logged for transparency</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={saving || !selectedAction}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                title={!selectedAction ? 'Please select a committee action first' : ''}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Committee Action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Committee Action</h3>
              </div>

              <p className="text-gray-700 mb-4">
                Are you sure you want to proceed with this committee action?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Action:</strong>{' '}
                  {selectedAction === 'approve_as_is' && 'Approve as submitted'}
                  {selectedAction === 'edit_and_approve' && 'Edit and approve'}
                  {selectedAction === 'submit_on_behalf' && 'Submit on behalf of resident'}
                  {selectedAction === 'rejected' && 'Mark as unverifiable'}
                </p>
                {committeeReason && (
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {committeeReason}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-6">
                This action will be logged in the audit trail and notifications will be sent to the resident.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
