import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Eye, Loader2, PlusCircle, Power, PowerOff, RefreshCcw, Trash2 } from 'lucide-react';
import { supabase, ExpectedCollection } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

type PaymentType = 'maintenance' | 'contingency' | 'emergency';
type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

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
  flats: { id: string; flat_number: string }[];
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

type FlatStatus = 'paid' | 'partial' | 'pending';

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
  expectedAmount: number;
  paymentStatus?: string | null;
  paymentDate?: string | null;
  maintenanceDueDate?: string;
  transactionAmount?: number | null;
}

interface ExpectedCollectionFormState {
  payment_type: PaymentType;
  financial_year: string;
  quarter: QuarterType;
  quarter_basis: 'financial' | 'yearly';
  due_date: string;
  amount_due: string;
  daily_fine: string;
  notes: string;
  collection_name: string;
  payment_frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  is_active: boolean;
}

const STATUS_META: Record<FlatStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'Paid', color: 'bg-green-500', bg: 'bg-green-100' },
  partial: { label: 'Partial', color: 'bg-amber-500', bg: 'bg-amber-100' },
  pending: { label: 'Not Paid', color: 'bg-red-500', bg: 'bg-red-100' },
};

const PAYMENT_TYPES: PaymentType[] = ['maintenance', 'contingency', 'emergency'];
const QUARTERS: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function getDefaultFinancialYearLabel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth();
  const fyEndYear = month >= 3 ? currentYear + 1 : currentYear;
  return `FY${String(fyEndYear).slice(-2)}`;
}

function getCurrentFinancialQuarter(): QuarterType {
  const month = new Date().getMonth();
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4';
}

function sortFlats<T extends { flat_number: string }>(flats: T[]): T[] {
  return [...flats].sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true }));
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
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpectedCollectionFormState>({
    payment_type: 'maintenance',
    financial_year: getDefaultFinancialYearLabel(),
    quarter: getCurrentFinancialQuarter(),
    quarter_basis: 'financial',
    due_date: new Date().toISOString().split('T')[0],
    amount_due: '',
    daily_fine: '0',
    notes: '',
    collection_name: '',
    payment_frequency: 'quarterly',
    is_active: false,
  });

  useEffect(() => {
    loadData();
  }, [apartmentId, accessCode]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [expectedRes, blockRes] = await Promise.all([
        supabase
          .from('expected_collections')
          .select('*')
          .eq('apartment_id', apartmentId)
          .order('due_date', { ascending: false }),
        supabase
          .from('buildings_blocks_phases')
          .select('id, block_name, flats:flat_numbers(id, flat_number)')
          .eq('apartment_id', apartmentId)
          .order('block_name'),
      ]);

      if (expectedRes.error) throw expectedRes.error;
      if (blockRes.error) throw blockRes.error;

      setExpectedCollections(expectedRes.data || []);
      setBlocks(
        (blockRes.data || []).map((block) => ({
          ...block,
          flats: sortFlats(block.flats || []),
        })),
      );

      const activeCollections = (expectedRes.data || []).filter(c => c.is_active);
      if (activeCollections.length > 0) {
        setExpandedCollections(new Set([activeCollections[0].id]));
      }

      await loadPayments(expectedRes.data || []);
    } catch (err) {
      console.error('Error loading payment status data', err);
      const message = err instanceof Error ? err.message : 'Unable to load payment status data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments(collections: ExpectedCollection[]) {
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

  function getCollectionStats(collection: ExpectedCollection) {
    const baseAmount = Number(collection.amount_due || 0);
    const dailyFine = Number(collection.daily_fine || 0);
    const dueDate = new Date(collection.due_date);
    dueDate.setHours(0, 0, 0, 0);

    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let totalCollected = 0;
    let totalExpected = 0;

    blocks.forEach(block => {
      block.flats.forEach(flat => {
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

        let paidStatusFound = false;
        let partialStatusFound = false;
        let latestPaymentDate: Date | null = null;

        for (const payment of validPayments) {
          const paymentAmount = Number(payment.payment_amount || 0);
          if (paymentAmount <= 0) continue;

          const paymentDate = payment.payment_date ? new Date(payment.payment_date) : null;

          if (paymentDate) {
            paymentDate.setHours(0, 0, 0, 0);
            if (!latestPaymentDate || paymentDate > latestPaymentDate) {
              latestPaymentDate = paymentDate;
            }
          }

          let isOnTime = false;
          let isLate = false;
          let daysLate = 0;
          let expectedAmountWithFine = baseAmount;

          if (paymentDate) {
            daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            isOnTime = daysLate <= 0;
            isLate = daysLate > 0;

            if (isLate) {
              const fineAmount = daysLate * dailyFine;
              expectedAmountWithFine = baseAmount + fineAmount;
            }
          }

          if (isOnTime && payment.status === 'Approved') {
            if (Math.abs(paymentAmount - baseAmount) < 0.01) {
              paidStatusFound = true;
              break;
            }
          }

          if (isLate && payment.status === 'Approved') {
            if (Math.abs(paymentAmount - expectedAmountWithFine) < 0.01) {
              paidStatusFound = true;
              break;
            }
          }

          if (isOnTime && paymentAmount < baseAmount) {
            partialStatusFound = true;
          }

          if (isLate && Math.abs(paymentAmount - expectedAmountWithFine) >= 0.01) {
            partialStatusFound = true;
          }
        }

        const paidAmount = validPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
        totalCollected += paidAmount;

        if (paidStatusFound) {
          paidCount++;
          totalExpected += baseAmount;
        } else if (partialStatusFound || validPayments.length > 0) {
          partialCount++;
          if (latestPaymentDate) {
            const daysLate = Math.floor((latestPaymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLate > 0) {
              const fineAmount = daysLate * dailyFine;
              totalExpected += baseAmount + fineAmount;
            } else {
              totalExpected += baseAmount;
            }
          } else {
            totalExpected += baseAmount;
          }
        } else {
          pendingCount++;
          totalExpected += baseAmount;
        }
      });
    });

    return { paidCount, partialCount, pendingCount, totalCollected, totalExpected };
  }

  function getBlockStatuses(collection: ExpectedCollection) {
    const baseAmount = Number(collection.amount_due || 0);
    const dailyFine = Number(collection.daily_fine || 0);
    const dueDate = new Date(collection.due_date);
    dueDate.setHours(0, 0, 0, 0);

    return blocks.map((block) => {
      const flats = (block.flats || []).map((flat) => {
        const relevantPayments = payments.filter(
          (payment) => payment.flat_id === flat.id && matchesCollection(payment, collection),
        );

        if (relevantPayments.length === 0) {
          return {
            id: flat.id,
            flat_number: flat.flat_number,
            status: 'pending' as FlatStatus,
            paidAmount: 0,
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
            expectedAmount: baseAmount,
          } as FlatStatusDisplay;
        }

        let paidStatusFound = false;
        let partialStatusFound = false;
        let latestPaymentDate: Date | null = null;

        for (const payment of validPayments) {
          const paymentAmount = Number(payment.payment_amount || 0);

          if (paymentAmount <= 0) continue;

          const paymentDate = payment.payment_date ? new Date(payment.payment_date) : null;

          if (paymentDate) {
            paymentDate.setHours(0, 0, 0, 0);
            if (!latestPaymentDate || paymentDate > latestPaymentDate) {
              latestPaymentDate = paymentDate;
            }
          }

          let isOnTime = false;
          let isLate = false;
          let daysLate = 0;
          let expectedAmountWithFine = baseAmount;

          if (paymentDate) {
            daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            isOnTime = daysLate <= 0;
            isLate = daysLate > 0;

            if (isLate) {
              const fineAmount = daysLate * dailyFine;
              expectedAmountWithFine = baseAmount + fineAmount;
            }
          }

          if (isOnTime && payment.status === 'Approved') {
            if (Math.abs(paymentAmount - baseAmount) < 0.01) {
              paidStatusFound = true;
              break;
            }
          }

          if (isLate && payment.status === 'Approved') {
            if (Math.abs(paymentAmount - expectedAmountWithFine) < 0.01) {
              paidStatusFound = true;
              break;
            }
          }

          if (isOnTime) {
            if (paymentAmount < baseAmount) {
              partialStatusFound = true;
            }
          }

          if (isLate) {
            if (Math.abs(paymentAmount - expectedAmountWithFine) >= 0.01) {
              partialStatusFound = true;
            }
          }

          if (!paymentDate && payment.status !== 'Approved') {
            if (Math.abs(paymentAmount - baseAmount) >= 0.01) {
              partialStatusFound = true;
            }
          }
        }

        let status: FlatStatus = 'pending';
        let paidAmount = 0;
        let expectedAmount = baseAmount;

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

        if (paidStatusFound) {
          status = 'paid';
          paidAmount = validPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
          expectedAmount = baseAmount;
        } else if (partialStatusFound || validPayments.length > 0) {
          status = 'partial';
          paidAmount = validPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);

          if (latestPaymentDate) {
            const daysLate = Math.floor((latestPaymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLate > 0) {
              const fineAmount = daysLate * dailyFine;
              expectedAmount = baseAmount + fineAmount;
            } else {
              expectedAmount = baseAmount;
            }
          } else {
            expectedAmount = baseAmount;
          }
        } else {
          status = 'pending';
          paidAmount = 0;
          expectedAmount = baseAmount;
        }

        return {
          id: flat.id,
          flat_number: flat.flat_number,
          status,
          paidAmount,
          expectedAmount: expectedAmount,
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

      setSuccessMessage(`Collection ${action}d successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Unable to ${action} collection`;
      alert(message);
    } finally {
      setActivatingId(null);
    }
  }

  async function handleCreateExpectedCollection() {
    if (!form.amount_due) {
      alert('Please enter the amount due per flat.');
      return;
    }

    const amountDue = Number(form.amount_due);
    const dailyFine = Number(form.daily_fine || 0);

    if (Number.isNaN(amountDue) || amountDue <= 0) {
      alert('Amount due must be a positive number.');
      return;
    }

    if (!form.due_date) {
      alert('Please select a due date.');
      return;
    }

    if (!form.financial_year.trim()) {
      alert('Please enter a financial year (e.g., FY25).');
      return;
    }

    if (!form.collection_name.trim()) {
      alert('Please enter a collection name.');
      return;
    }

    const isEditing = !!editingId;
    setSaving(true);
    setSuccessMessage(null);

    try {
      const payload = {
        apartment_id: apartmentId,
        payment_type: form.payment_type,
        financial_year: form.financial_year.trim(),
        quarter: form.quarter,
        quarter_basis: form.quarter_basis,
        due_date: form.due_date,
        amount_due: amountDue,
        daily_fine: Number.isNaN(dailyFine) ? 0 : dailyFine,
        notes: form.notes?.trim() || null,
        collection_name: form.collection_name.trim(),
        payment_frequency: form.payment_frequency,
        is_active: form.is_active,
        start_date: form.due_date,
      };

      let error;

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('expected_collections')
          .update(payload)
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('expected_collections')
          .insert([payload]);
        error = insertError;
      }

      if (error) {
        console.error('Database error:', error);
        console.error('Payload attempted:', payload);
        throw error;
      }

      setForm({
        payment_type: 'maintenance',
        financial_year: getDefaultFinancialYearLabel(),
        quarter: getCurrentFinancialQuarter(),
        quarter_basis: 'financial',
        due_date: new Date().toISOString().split('T')[0],
        amount_due: '',
        daily_fine: '0',
        notes: '',
        collection_name: '',
        payment_frequency: 'quarterly',
        is_active: false,
      });

      setEditingId(null);
      setSuccessMessage(
        isEditing
          ? 'Collection updated successfully.'
          : 'Collection created successfully.'
      );

      setTimeout(() => setSuccessMessage(null), 5000);

      await loadData();
    } catch (err) {
      console.error('Error saving expected collection:', err);
      let message = 'Unable to save expected collection';

      if (err instanceof Error) {
        message = err.message;

        if (message.includes('duplicate key') || message.includes('unique constraint')) {
          message = 'A collection with this payment type, quarter, and financial year already exists for this apartment. Please use a different combination.';
        } else if (message.includes('violates check constraint')) {
          message = 'Invalid data: Please check that all fields have valid values (payment type, quarter, etc.).';
        } else if (message.includes('permission denied') || message.includes('policy')) {
          message = 'Permission denied: You may not have access to modify this collection. Please refresh and try again.';
        }
      }

      alert(`Error: ${message}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setSaving(false);
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {showChart ? 'Payment Status' : 'Payment Setup'} · {apartmentName}
            </h2>
            <p className="text-gray-600">
              {showChart
                ? 'Live view of maintenance collections across every flat'
                : 'Define expected maintenance/other collections and fines'}
            </p>
          </div>
        </div>
        {showChart && publicAccessCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold mb-1">Guest link</p>
            <p className="text-blue-800 break-all">
              {`${window.location.origin}/admin/payment-status?apartment=${publicAccessCode}`}
            </p>
            <p className="text-blue-700 mt-1">Share this link with residents to let them track payment status.</p>
          </div>
        )}
      </div>

      {allowManagement && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4" data-payment-setup-form>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Collection' : 'Add New Collection'}
              </h3>
              <p className="text-sm text-gray-600">
                {editingId ? 'Update the collection details' : 'Define dues per quarter and payment type'}
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {editingId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
              <strong>Editing mode:</strong> You are currently editing a collection. Click "Update Collection" to save changes or "Cancel Edit" to discard.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Collection Name</label>
              <input
                type="text"
                value={form.collection_name}
                onChange={(e) => setForm({ ...form, collection_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Annual Maintenance 2025"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Payment Type</label>
              <select
                value={form.payment_type}
                onChange={(e) => setForm({ ...form, payment_type: e.target.value as PaymentType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PAYMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Frequency</label>
              <select
                value={form.payment_frequency}
                onChange={(e) => setForm({ ...form, payment_frequency: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Quarter Type</label>
              <select
                value={form.quarter_basis}
                onChange={(e) => setForm({ ...form, quarter_basis: e.target.value as 'financial' | 'yearly' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="financial">Financial-year (Apr–Mar)</option>
                <option value="yearly">Calendar-year (Jan–Dec)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Financial Year</label>
              <input
                type="text"
                value={form.financial_year}
                onChange={(e) => setForm({ ...form, financial_year: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="FY25"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Quarter</label>
              <select
                value={form.quarter}
                onChange={(e) => setForm({ ...form, quarter: e.target.value as QuarterType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {QUARTERS.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Amount Due / Flat</label>
              <input
                type="number"
                min="0"
                value={form.amount_due}
                onChange={(e) => setForm({ ...form, amount_due: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Daily Fine</label>
              <input
                type="number"
                min="0"
                value={form.daily_fine}
                onChange={(e) => setForm({ ...form, daily_fine: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase block mb-2">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Includes clubhouse upgrade"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Activate immediately</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateExpectedCollection}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {saving ? 'Saving...' : editingId ? 'Update Collection' : 'Add Collection'}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    payment_type: 'maintenance',
                    financial_year: getDefaultFinancialYearLabel(),
                    quarter: getCurrentFinancialQuarter(),
                    quarter_basis: 'financial',
                    due_date: new Date().toISOString().split('T')[0],
                    amount_due: '',
                    daily_fine: '0',
                    notes: '',
                    collection_name: '',
                    payment_frequency: 'quarterly',
                    is_active: false,
                  });
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      )}

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
                              <span>₹{Number(collection.amount_due).toLocaleString()}/flat</span>
                              {collection.daily_fine && collection.daily_fine > 0 && (
                                <span>Fine: ₹{Number(collection.daily_fine).toLocaleString()}/day</span>
                              )}
                            </div>
                          </div>
                          {allowManagement && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleCollectionExpansion(collection.id)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                                {isExpanded ? 'Hide' : 'View'} Details
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleToggleActivation(collection.id, true)}
                                disabled={activatingId === collection.id}
                                className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                title="Deactivate collection"
                              >
                                <PowerOff className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(collection.id);
                                  setForm({
                                    payment_type: collection.payment_type,
                                    financial_year: collection.financial_year,
                                    quarter: collection.quarter,
                                    quarter_basis: collection.quarter_basis || 'financial',
                                    due_date: collection.due_date,
                                    amount_due: String(collection.amount_due ?? ''),
                                    daily_fine: String(collection.daily_fine ?? '0'),
                                    notes: collection.notes || '',
                                    collection_name: collection.collection_name || '',
                                    payment_frequency: collection.payment_frequency || 'quarterly',
                                    is_active: collection.is_active || false,
                                  });
                                  setSuccessMessage(null);
                                  setTimeout(() => {
                                    const formElement = document.querySelector('[data-payment-setup-form]');
                                    formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                disabled={deletingId === collection.id}
                                className="text-sm text-gray-600 hover:text-blue-600 px-2"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Paid</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.paidCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Partial</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.partialCount}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
                              ₹{stats.totalCollected.toLocaleString()} / ₹{stats.totalExpected.toLocaleString()}
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

                                      let tooltipText = `Flat ${flat.flat_number}\n`;
                                      tooltipText += `Status: ${flat.status === 'paid' ? '✓ Paid' : flat.status === 'partial' ? '⚠ Partial' : '❌ Unpaid'}\n`;
                                      tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                                      tooltipText += `Paid: ₹${flat.paidAmount.toLocaleString()}\n`;
                                      tooltipText += `Expected: ₹${flat.expectedAmount.toLocaleString()}\n`;
                                      tooltipText += `Difference: ₹${Math.abs(difference).toLocaleString()} ${difference >= 0 ? 'short' : 'over'}\n`;

                                      return (
                                        <div
                                          key={flat.id}
                                          className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg text-xs font-semibold text-gray-800 ${STATUS_META[flat.status].bg} cursor-help`}
                                          title={tooltipText}
                                        >
                                          <span>{flat.flat_number}</span>
                                          <span className="text-[10px] font-normal">
                                            {flat.status === 'paid' ? 'Paid' : flat.status === 'partial' ? 'Part' : 'Unpaid'}
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
                                <span>₹{Number(collection.amount_due).toLocaleString()}/flat</span>
                                <span className="text-gray-500">
                                  {collectionProgress}% collected (₹{stats.totalCollected.toLocaleString()})
                                </span>
                              </div>
                            </div>
                            {allowManagement && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleCollectionExpansion(collection.id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4" />
                                  {isExpanded ? 'Hide' : 'View'}
                                </button>
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
                              </div>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Paid</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{stats.paidCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Partial</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{stats.partialCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase">Unpaid</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{stats.pendingCount}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Rate</p>
                                <p className="text-xl font-bold text-gray-700">{collectionProgress}%</p>
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

                                        let tooltipText = `Flat ${flat.flat_number}\n`;
                                        tooltipText += `Status: ${flat.status === 'paid' ? '✓ Paid' : flat.status === 'partial' ? '⚠ Partial' : '❌ Unpaid'}\n`;
                                        tooltipText += `Paid: ₹${flat.paidAmount.toLocaleString()}\n`;
                                        tooltipText += `Expected: ₹${flat.expectedAmount.toLocaleString()}\n`;

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
    </div>
  );
}
