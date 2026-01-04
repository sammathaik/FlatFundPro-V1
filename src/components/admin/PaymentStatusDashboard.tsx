import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Bell, CheckCircle2, ChevronDown, ChevronUp, Eye, Loader2, Mail, Power, PowerOff, RefreshCcw, Trash2 } from 'lucide-react';
import { supabase, ExpectedCollection } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

type PaymentType = 'maintenance' | 'contingency' | 'emergency';

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  maintenance: 'Maintenance Collection',
  contingency: 'Contingency Fund',
  emergency: 'Emergency Fund',
};

const FREQUENCY_LABELS: Record<string, string> = {
  'one-time': 'One-Time',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'yearly': 'Yearly',
};

type BlockWithFlats = {
  id: string;
  block_name: string;
  flats: { id: string; flat_number: string; flat_type: string | null; built_up_area: number | null }[];
};

type PaymentSnapshot = {
  flat_id: string | null;
  expected_collection_id: string | null;
  payment_amount: number | null;
  payment_type: string | null;
  payment_source: string | null;
  payment_quarter: string | null;
  payment_date: string | null;
  status: string | null;
  created_at: string | null;
};

type FlatStatus = 'paid' | 'under_review' | 'partial' | 'overpaid' | 'pending';

interface PaymentStatusDashboardProps {
  apartmentId: string;
  apartmentName: string;
  allowManagement?: boolean;
  accessCode?: string;
  publicAccessCode?: string;
  showChart?: boolean;
}

interface FlatStatusDisplay {
  id: string;
  flat_number: string;
  status: FlatStatus;
  paidAmount: number;
  pendingAmount: number;
  expectedAmount: number;
  paymentStatus?: string | null;
  paymentDate?: string | null;
  maintenanceDueDate?: string;
  transactionAmount?: number | null;
}

const STATUS_META: Record<FlatStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'Paid & Approved', color: 'bg-green-500', bg: 'bg-green-100' },
  under_review: { label: 'Under Review', color: 'bg-blue-500', bg: 'bg-blue-100' },
  partial: { label: 'Partially Paid', color: 'bg-orange-500', bg: 'bg-orange-100' },
  overpaid: { label: 'Overpaid', color: 'bg-cyan-500', bg: 'bg-cyan-100' },
  pending: { label: 'Not Paid', color: 'bg-gray-500', bg: 'bg-gray-100' },
};

function sortFlats<T extends { flat_number: string }>(flats: T[]): T[] {
  return [...flats].sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true }));
}

function getCurrencySymbol(country: string | null): string {
  if (!country) return '₹'; // Default to INR

  const countryLower = country.toLowerCase();

  // Country to currency mapping
  const currencyMap: Record<string, string> = {
    'india': '₹',
    'united states': '$',
    'usa': '$',
    'us': '$',
    'canada': 'C$',
    'united kingdom': '£',
    'uk': '£',
    'europe': '€',
    'european union': '€',
    'germany': '€',
    'france': '€',
    'spain': '€',
    'italy': '€',
    'netherlands': '€',
    'australia': 'A$',
    'singapore': 'S$',
    'japan': '¥',
    'china': '¥',
    'south korea': '₩',
    'brazil': 'R$',
    'mexico': 'Mex$',
    'uae': 'AED',
    'saudi arabia': 'SAR',
  };

  return currencyMap[countryLower] || '₹'; // Default to INR if country not found
}

function matchesCollection(payment: PaymentSnapshot, collection: ExpectedCollection) {
  if (payment.expected_collection_id && payment.expected_collection_id === collection.id) {
    return true;
  }

  const paymentType = payment.payment_type?.toLowerCase() || '';
  const collectionType = collection.payment_type?.toLowerCase() || '';
  const typeMatches = paymentType === collectionType;

  if (!typeMatches) {
    return false;
  }

  if (!payment.payment_quarter) {
    return false;
  }

  if (!collection.quarter || !collection.financial_year) {
    return false;
  }

  const paymentQuarterLower = payment.payment_quarter.toLowerCase();
  const collectionQuarterLower = collection.quarter.toLowerCase();
  const financialYearLower = collection.financial_year.toLowerCase();

  let yearToMatch: string;
  if (financialYearLower.startsWith('fy')) {
    const yearSuffix = financialYearLower.replace('fy', '');
    if (yearSuffix.length === 2) {
      const fullYear = '20' + yearSuffix;
      yearToMatch = fullYear;
    } else {
      yearToMatch = financialYearLower.replace('fy', '20');
    }
  } else {
    yearToMatch = financialYearLower;
  }

  const quarterMatches = paymentQuarterLower.includes(collectionQuarterLower);
  const yearMatches = paymentQuarterLower.includes(yearToMatch);

  return quarterMatches && yearMatches;
}

export default function PaymentStatusDashboard({
  apartmentId,
  apartmentName,
  allowManagement = false,
  accessCode,
  publicAccessCode,
  showChart = true,
}: PaymentStatusDashboardProps) {
  const [blocks, setBlocks] = useState<BlockWithFlats[]>([]);
  const [expectedCollections, setExpectedCollections] = useState<ExpectedCollection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<PaymentSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [apartmentCountry, setApartmentCountry] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [selectedCollectionForReminder, setSelectedCollectionForReminder] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currencySymbol = useMemo(() => getCurrencySymbol(apartmentCountry), [apartmentCountry]);

  useEffect(() => {
    loadData();
  }, [apartmentId, accessCode]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [expectedRes, blockRes, apartmentRes] = await Promise.all([
        supabase
          .from('expected_collections')
          .select('*')
          .eq('apartment_id', apartmentId)
          .order('due_date', { ascending: false }),
        supabase
          .from('buildings_blocks_phases')
          .select('id, block_name, flats:flat_numbers(id, flat_number, flat_type, built_up_area)')
          .eq('apartment_id', apartmentId)
          .order('block_name'),
        supabase
          .from('apartments')
          .select('country')
          .eq('id', apartmentId)
          .single(),
      ]);

      if (expectedRes.error) throw expectedRes.error;
      if (blockRes.error) throw blockRes.error;
      if (apartmentRes.error) throw apartmentRes.error;

      setApartmentCountry(apartmentRes.data?.country || null);
      setExpectedCollections(expectedRes.data || []);
      setBlocks(
        (blockRes.data || []).map((block) => ({
          ...block,
          flats: sortFlats(block.flats || []),
        })),
      );

      const activeCollectionsList = (expectedRes.data || []).filter(c => c.is_active);
      if (activeCollectionsList.length > 0) {
        setExpandedCollections(new Set([activeCollectionsList[0].id]));
      }

      await loadPayments();
    } catch (err) {
      console.error('Error loading payment status data', err);
      const message = err instanceof Error ? err.message : 'Unable to load payment status data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    if (accessCode) {
      const { data, error } = await supabase.rpc('get_payment_status_data', {
        access_code: accessCode,
      });
      if (error) throw error;
      setPayments(data || []);
      return;
    }

    const { data, error } = await supabase
      .from('payment_submissions')
      .select('flat_id, expected_collection_id, payment_amount, payment_type, payment_quarter, payment_date, status, created_at, payment_source')
      .eq('apartment_id', apartmentId);

    if (error) throw error;
    setPayments(data || []);
  }

  const activeCollections = useMemo(
    () => expectedCollections.filter(c => c.is_active === true).sort((a, b) =>
      new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    ),
    [expectedCollections]
  );

  const archivedCollections = useMemo(
    () => expectedCollections.filter(c => c.is_active !== true).sort((a, b) =>
      new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    ),
    [expectedCollections]
  );

  function getExpectedAmountForFlat(
    collection: ExpectedCollection,
    flat: { flat_type: string | null; built_up_area: number | null }
  ): number {
    if (collection.flat_type_rates && flat.flat_type) {
      const rate = collection.flat_type_rates[flat.flat_type];
      if (rate !== undefined) {
        return rate;
      }
    }

    if (collection.rate_per_sqft && flat.built_up_area) {
      return collection.rate_per_sqft * flat.built_up_area;
    }

    return Number(collection.amount_due || 0);
  }

  function getCollectionStats(collection: ExpectedCollection) {
    const dailyFine = Number(collection.daily_fine || 0);
    const dueDate = new Date(collection.due_date);
    dueDate.setHours(0, 0, 0, 0);

    let paidCount = 0;
    let underReviewCount = 0;
    let partialCount = 0;
    let overpaidCount = 0;
    let pendingCount = 0;
    let totalCollected = 0;
    let totalExpected = 0;

    blocks.forEach(block => {
      block.flats.forEach(flat => {
        const baseAmount = getExpectedAmountForFlat(collection, flat);

        const relevantPayments = payments.filter(
          payment => payment.flat_id === flat.id && matchesCollection(payment, collection)
        );

        const validPayments = relevantPayments.filter(
          payment => payment.payment_amount != null && payment.payment_amount !== ''
        );

        if (validPayments.length === 0) {
          pendingCount++;
          totalExpected += baseAmount;
          return;
        }

        const approvedPayments = validPayments.filter(p => p.status === 'Approved');
        const pendingReviewPayments = validPayments.filter(p => p.status === 'Received' || p.status === 'Reviewed');

        const totalApproved = approvedPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
        const totalPendingReview = pendingReviewPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
        const totalPaid = totalApproved + totalPendingReview;

        totalCollected += totalApproved;
        totalExpected += baseAmount;

        if (totalApproved >= baseAmount) {
          if (totalApproved > baseAmount + 0.01) {
            overpaidCount++;
          } else {
            paidCount++;
          }
        } else if (totalPendingReview > 0) {
          underReviewCount++;
        } else if (totalApproved > 0) {
          partialCount++;
        } else {
          pendingCount++;
        }
      });
    });

    return { paidCount, underReviewCount, partialCount, overpaidCount, pendingCount, totalCollected, totalExpected };
  }

  function getBlockStatuses(collection: ExpectedCollection) {
    const dailyFine = Number(collection.daily_fine || 0);
    const dueDate = new Date(collection.due_date);
    dueDate.setHours(0, 0, 0, 0);

    return blocks.map((block) => {
      const flats = (block.flats || []).map((flat) => {
        const baseAmount = getExpectedAmountForFlat(collection, flat);

        const relevantPayments = payments.filter(
          (payment) => payment.flat_id === flat.id && matchesCollection(payment, collection),
        );

        if (relevantPayments.length === 0) {
          return {
            id: flat.id,
            flat_number: flat.flat_number,
            status: 'pending' as FlatStatus,
            paidAmount: 0,
            pendingAmount: 0,
            expectedAmount: baseAmount,
          } as FlatStatusDisplay;
        }

        const validPayments = relevantPayments.filter(
          (payment) => payment.payment_amount != null && payment.payment_amount !== '',
        );

        if (validPayments.length === 0) {
          return {
            id: flat.id,
            flat_number: flat.flat_number,
            status: 'pending' as FlatStatus,
            paidAmount: 0,
            pendingAmount: 0,
            expectedAmount: baseAmount,
          } as FlatStatusDisplay;
        }

        const approvedPayments = validPayments.filter(p => p.status === 'Approved');
        const pendingReviewPayments = validPayments.filter(p => p.status === 'Received' || p.status === 'Reviewed');

        const totalApproved = approvedPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
        const totalPendingReview = pendingReviewPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);

        let status: FlatStatus = 'pending';
        let paymentStatus: string | null = null;
        let paymentDate: string | null = null;
        let transactionAmount: number | null = null;

        if (validPayments.length > 0) {
          const mostRecentPayment = validPayments.reduce((latest, current) => {
            const currentDate = current.payment_date ? new Date(current.payment_date) : null;
            const latestDate = latest.payment_date ? new Date(latest.payment_date) : null;
            if (!latestDate) return current;
            if (!currentDate) return latest;
            return currentDate > latestDate ? current : latest;
          }, validPayments[0]);

          paymentStatus = mostRecentPayment.status || null;
          paymentDate = mostRecentPayment.payment_date || null;
          transactionAmount = mostRecentPayment.payment_amount ? Number(mostRecentPayment.payment_amount) : null;
        }

        if (totalApproved >= baseAmount) {
          if (totalApproved > baseAmount + 0.01) {
            status = 'overpaid';
          } else {
            status = 'paid';
          }
        } else if (totalPendingReview > 0) {
          status = 'under_review';
        } else if (totalApproved > 0) {
          status = 'partial';
        } else {
          status = 'pending';
        }

        return {
          id: flat.id,
          flat_number: flat.flat_number,
          status,
          paidAmount: totalApproved,
          pendingAmount: totalPendingReview,
          expectedAmount: baseAmount,
          paymentStatus: paymentStatus,
          paymentDate: paymentDate,
          maintenanceDueDate: collection.due_date,
          transactionAmount: transactionAmount,
        } as FlatStatusDisplay;
      });

      const sortedFlats = sortFlats(flats);
      return { ...block, flats: sortedFlats };
    });
  }

  async function handleToggleActivation(collectionId: string, currentStatus: boolean) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this collection?`)) {
      return;
    }

    setActivatingId(collectionId);
    try {
      const { error } = await supabase
        .from('expected_collections')
        .update({ is_active: !currentStatus })
        .eq('id', collectionId);

      if (error) throw error;

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Unable to ${action} collection`;
      alert(message);
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeleteExpectedCollection(id: string) {
    if (!confirm('Delete this collection? Payments linked to it will remain, but the target will be removed.')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('expected_collections').delete().eq('id', id);
      if (error) throw error;

      setSuccessMessage('Collection deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete collection';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleCollectionExpansion(collectionId: string) {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  }

  function openReminderConfirm(collectionId: string) {
    setSelectedCollectionForReminder(collectionId);
    setShowReminderConfirm(true);
  }

  function closeReminderConfirm() {
    setShowReminderConfirm(false);
    setSelectedCollectionForReminder(null);
  }

  async function handleSendReminders() {
    if (!selectedCollectionForReminder) return;

    closeReminderConfirm();
    setSendingReminders(selectedCollectionForReminder);
    setReminderMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-reminders`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartment_id: apartmentId,
          expected_collection_id: selectedCollectionForReminder,
          reminder_type: 'manual',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reminders');
      }

      setReminderMessage({
        type: 'success',
        text: result.message || `Reminders sent successfully! Sent: ${result.sent}, Failed: ${result.failed}`,
      });

      setTimeout(() => setReminderMessage(null), 8000);
    } catch (err) {
      console.error('Error sending reminders:', err);
      const message = err instanceof Error ? err.message : 'Unable to send reminders';
      setReminderMessage({
        type: 'error',
        text: message,
      });
      setTimeout(() => setReminderMessage(null), 8000);
    } finally {
      setSendingReminders(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-600">Loading payment status dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-red-900">Unable to load dashboard</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showChart ? 'Payment Status' : 'Fund Collection Setup'} · {apartmentName}
          </h2>
          <p className="text-gray-600">
            {showChart
              ? 'Live view of maintenance collections across every flat'
              : 'Define expected maintenance/other collections and fines'}
          </p>
        </div>
      </div>

      {showChart && activeCollections.length === 0 && archivedCollections.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-1 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-900">No collections configured</p>
            <p className="text-sm text-blue-800">
              Admins need to define the amount per quarter to enable the Payment Status dashboard.
            </p>
          </div>
        </div>
      )}

      {showChart && (
        <>
          {reminderMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              reminderMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}>
              {reminderMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {reminderMessage.text}
            </div>
          )}

          {activeCollections.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-900">Active Collections</h3>
                </div>
                <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {activeCollections.length}
                </span>
              </div>

              <div className="space-y-4">
                {activeCollections.map((collection) => {
                  const stats = getCollectionStats(collection);
                  const isExpanded = expandedCollections.has(collection.id);
                  const blockStatuses = isExpanded ? getBlockStatuses(collection) : [];
                  const collectionProgress = stats.totalExpected > 0
                    ? ((stats.totalCollected / stats.totalExpected) * 100).toFixed(1)
                    : '0';

                  return (
                    <div key={collection.id} className="bg-white border-2 border-green-200 rounded-xl overflow-hidden">
                      <div className="p-5 bg-gradient-to-r from-green-50 to-white">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-gray-900">
                                {collection.collection_name || `${PAYMENT_TYPE_LABELS[collection.payment_type]} - ${collection.quarter} ${collection.financial_year}`}
                              </h4>
                              <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                Active
                              </span>
                              <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                                {FREQUENCY_LABELS[collection.payment_frequency || 'quarterly']}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Due: {formatDate(collection.due_date)}</span>
                              <span>{currencySymbol}{Number(collection.amount_due).toLocaleString()}/flat</span>
                              {collection.daily_fine && collection.daily_fine > 0 && (
                                <span>Fine: {currencySymbol}{Number(collection.daily_fine).toLocaleString()}/day</span>
                              )}
                            </div>
                            {collection.notes && (
                              <div className="mt-2 text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                                <span className="font-semibold">Note:</span> {collection.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {allowManagement && (
                              <button
                                onClick={() => openReminderConfirm(collection.id)}
                                disabled={sendingReminders === collection.id}
                                className="inline-flex items-center gap-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                title="Send email reminders to flats without payment confirmation"
                              >
                                <Mail className="w-4 h-4" />
                                {sendingReminders === collection.id ? 'Sending...' : 'Send Reminders'}
                              </button>
                            )}
                            <button
                              onClick={() => toggleCollectionExpansion(collection.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                              {isExpanded ? 'Hide' : 'View'} Details
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {allowManagement && (
                              <>
                                <button
                                  onClick={() => handleToggleActivation(collection.id, true)}
                                  disabled={activatingId === collection.id}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                  title="Deactivate collection"
                                >
                                  <PowerOff className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Paid</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.paidCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Under Review</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.underReviewCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Partial</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.partialCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Overpaid</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.overpaidCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Unpaid</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.pendingCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Collection Rate</p>
                            <p className="text-2xl font-bold text-green-600">{collectionProgress}%</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">Collected vs Expected</span>
                            <span className="font-bold text-gray-900">
                              {currencySymbol}{stats.totalCollected.toLocaleString()} / {currencySymbol}{stats.totalExpected.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${Math.min(parseFloat(collectionProgress), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-5 border-t border-gray-200 bg-gray-50">
                          {blockStatuses.length === 0 ? (
                            <div className="text-center text-gray-600 py-8">
                              No flats configured yet. Add buildings and flats to visualize payment status.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {blockStatuses.map((block) => (
                                <div key={block.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-semibold text-gray-900">{block.block_name}</h5>
                                    <span className="text-sm text-gray-500">{block.flats.length} flats</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {block.flats.map((flat) => {
                                      const difference = flat.expectedAmount - flat.paidAmount;
                                      const dueDate = flat.maintenanceDueDate ? new Date(flat.maintenanceDueDate) : null;
                                      const paymentDate = flat.paymentDate ? new Date(flat.paymentDate) : null;
                                      const dailyFine = Number(collection.daily_fine || 0);

                                      // Calculate days late and fine
                                      let daysLate = 0;
                                      let fineAmount = 0;
                                      if (dueDate && paymentDate) {
                                        dueDate.setHours(0, 0, 0, 0);
                                        paymentDate.setHours(0, 0, 0, 0);
                                        const timeDiff = paymentDate.getTime() - dueDate.getTime();
                                        daysLate = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
                                        fineAmount = daysLate * dailyFine;
                                      }

                                      let tooltipText = `Flat ${flat.flat_number}\n`;
                                      tooltipText += `Status: ${
                                        flat.status === 'paid' ? '✓ Paid & Approved' :
                                        flat.status === 'under_review' ? '⏳ Under Review' :
                                        flat.status === 'partial' ? '⚠ Partially Paid' :
                                        flat.status === 'overpaid' ? '↑ Overpaid' :
                                        '❌ Not Paid'
                                      }\n`;
                                      tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                                      tooltipText += `Approved: ${currencySymbol}${flat.paidAmount.toLocaleString()}\n`;
                                      if (flat.pendingAmount > 0) {
                                        tooltipText += `Pending Review: ${currencySymbol}${flat.pendingAmount.toLocaleString()}\n`;
                                      }
                                      tooltipText += `Expected: ${currencySymbol}${flat.expectedAmount.toLocaleString()}\n`;
                                      tooltipText += `Difference: ${currencySymbol}${Math.abs(difference).toLocaleString()} ${difference >= 0 ? 'short' : 'over'}\n`;

                                      // Add due date
                                      if (dueDate) {
                                        tooltipText += `Due Date: ${dueDate.toLocaleDateString()}\n`;
                                      }

                                      // Add payment date and late fee info
                                      if (paymentDate) {
                                        tooltipText += `Payment Date: ${paymentDate.toLocaleDateString()}\n`;
                                        if (daysLate > 0 && dailyFine > 0) {
                                          tooltipText += `Days Late: ${daysLate}\n`;
                                          tooltipText += `Late Fine: ${currencySymbol}${fineAmount.toLocaleString()}\n`;
                                        } else if (daysLate === 0) {
                                          tooltipText += `✓ Paid On Time\n`;
                                        }
                                      }

                                      // Add admin approval status
                                      if (flat.paymentStatus) {
                                        const statusLabel = flat.paymentStatus === 'Approved' ? '✓ Approved' :
                                                          flat.paymentStatus === 'Reviewed' ? '⚠ Reviewed' :
                                                          '⏳ Received';
                                        tooltipText += `Admin Status: ${statusLabel}\n`;
                                      }

                                      return (
                                        <div
                                          key={flat.id}
                                          className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg text-xs font-semibold text-gray-800 ${STATUS_META[flat.status].bg} cursor-help`}
                                          title={tooltipText}
                                        >
                                          <span>{flat.flat_number}</span>
                                          <span className="text-[10px] font-normal">
                                            {flat.status === 'paid' ? 'Paid' :
                                             flat.status === 'under_review' ? 'Review' :
                                             flat.status === 'partial' ? 'Part' :
                                             flat.status === 'overpaid' ? 'Over' :
                                             'Unpaid'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {archivedCollections.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowArchivedSection(!showArchivedSection)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">Archived Collections</h3>
                  </div>
                  <span className="bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
                    {archivedCollections.length}
                  </span>
                </div>
                {showArchivedSection ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </button>

              {showArchivedSection && (
                <div className="space-y-3">
                  {archivedCollections.map((collection) => {
                    const stats = getCollectionStats(collection);
                    const isExpanded = expandedCollections.has(collection.id);
                    const blockStatuses = isExpanded ? getBlockStatuses(collection) : [];
                    const collectionProgress = stats.totalExpected > 0
                      ? ((stats.totalCollected / stats.totalExpected) * 100).toFixed(1)
                      : '0';

                    return (
                      <div key={collection.id} className="bg-white border border-gray-300 rounded-xl overflow-hidden">
                        <div className="p-4 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-base font-bold text-gray-900">
                                  {collection.collection_name || `${PAYMENT_TYPE_LABELS[collection.payment_type]} - ${collection.quarter} ${collection.financial_year}`}
                                </h4>
                                <span className="bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
                                  Archived
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Due: {formatDate(collection.due_date)}</span>
                                <span>{currencySymbol}{Number(collection.amount_due).toLocaleString()}/flat</span>
                                <span className="text-gray-500">
                                  {collectionProgress}% collected ({currencySymbol}{stats.totalCollected.toLocaleString()})
                                </span>
                              </div>
                              {collection.notes && (
                                <div className="mt-2 text-sm text-gray-600 italic bg-white p-2 rounded">
                                  <span className="font-semibold">Note:</span> {collection.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleCollectionExpansion(collection.id)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4" />
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                              {allowManagement && (
                                <>
                                  <button
                                    onClick={() => handleToggleActivation(collection.id, false)}
                                    disabled={activatingId === collection.id}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                                    title="Reactivate collection"
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpectedCollection(collection.id)}
                                    disabled={deletingId === collection.id}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-gray-100"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Paid</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{stats.paidCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Review</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{stats.underReviewCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Partial</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{stats.partialCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Over</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{stats.overpaidCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Unpaid</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{stats.pendingCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Rate</p>
                                <p className="text-lg font-bold text-gray-700">{collectionProgress}%</p>
                              </div>
                            </div>

                            {blockStatuses.length === 0 ? (
                              <div className="text-center text-gray-600 py-6 text-sm">
                                No flats configured
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {blockStatuses.map((block) => (
                                  <div key={block.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-semibold text-gray-900 text-sm">{block.block_name}</h5>
                                      <span className="text-xs text-gray-500">{block.flats.length} flats</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {block.flats.map((flat) => {
                                        const difference = flat.expectedAmount - flat.paidAmount;
                                        const dueDate = flat.maintenanceDueDate ? new Date(flat.maintenanceDueDate) : null;
                                        const paymentDate = flat.paymentDate ? new Date(flat.paymentDate) : null;
                                        const dailyFine = Number(collection.daily_fine || 0);

                                        // Calculate days late and fine
                                        let daysLate = 0;
                                        let fineAmount = 0;
                                        if (dueDate && paymentDate) {
                                          dueDate.setHours(0, 0, 0, 0);
                                          paymentDate.setHours(0, 0, 0, 0);
                                          const timeDiff = paymentDate.getTime() - dueDate.getTime();
                                          daysLate = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
                                          fineAmount = daysLate * dailyFine;
                                        }

                                        let tooltipText = `Flat ${flat.flat_number}\n`;
                                        tooltipText += `Status: ${
                                          flat.status === 'paid' ? '✓ Paid & Approved' :
                                          flat.status === 'under_review' ? '⏳ Under Review' :
                                          flat.status === 'partial' ? '⚠ Partially Paid' :
                                          flat.status === 'overpaid' ? '↑ Overpaid' :
                                          '❌ Not Paid'
                                        }\n`;
                                        tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                                        tooltipText += `Approved: ${currencySymbol}${flat.paidAmount.toLocaleString()}\n`;
                                        if (flat.pendingAmount > 0) {
                                          tooltipText += `Pending Review: ${currencySymbol}${flat.pendingAmount.toLocaleString()}\n`;
                                        }
                                        tooltipText += `Expected: ${currencySymbol}${flat.expectedAmount.toLocaleString()}\n`;
                                        tooltipText += `Difference: ${currencySymbol}${Math.abs(difference).toLocaleString()} ${difference >= 0 ? 'short' : 'over'}\n`;

                                        // Add due date
                                        if (dueDate) {
                                          tooltipText += `Due Date: ${dueDate.toLocaleDateString()}\n`;
                                        }

                                        // Add payment date and late fee info
                                        if (paymentDate) {
                                          tooltipText += `Payment Date: ${paymentDate.toLocaleDateString()}\n`;
                                          if (daysLate > 0 && dailyFine > 0) {
                                            tooltipText += `Days Late: ${daysLate}\n`;
                                            tooltipText += `Late Fine: ${currencySymbol}${fineAmount.toLocaleString()}\n`;
                                          } else if (daysLate === 0) {
                                            tooltipText += `✓ Paid On Time\n`;
                                          }
                                        }

                                        // Add admin approval status
                                        if (flat.paymentStatus) {
                                          const statusLabel = flat.paymentStatus === 'Approved' ? '✓ Approved' :
                                                            flat.paymentStatus === 'Reviewed' ? '⚠ Reviewed' :
                                                            '⏳ Received';
                                          tooltipText += `Admin Status: ${statusLabel}\n`;
                                        }

                                        return (
                                          <div
                                            key={flat.id}
                                            className={`w-10 h-10 flex flex-col items-center justify-center rounded text-[10px] font-semibold text-gray-800 ${STATUS_META[flat.status].bg} cursor-help`}
                                            title={tooltipText}
                                          >
                                            <span>{flat.flat_number}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showReminderConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Send Payment Reminders</h3>
                  <p className="text-sm text-gray-600">Confirm email notification</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-800">
                  This will send email reminders to all flats that have <strong>not submitted payment confirmation</strong> for this collection.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Emails will be sent immediately and cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeReminderConfirm}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReminders}
                  className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Send Reminders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChart && publicAccessCode && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Public Access</p>
            <p className="text-sm text-gray-700 mb-2">
              Share this link with residents to allow them to track payment status:
            </p>
            <div className="bg-white border border-gray-200 rounded px-3 py-2">
              <code className="text-xs text-gray-600 break-all">
                {`${window.location.origin}/admin/payment-status?apartment=${publicAccessCode}`}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
