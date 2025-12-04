import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, PlusCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { supabase, ExpectedCollection } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

type PaymentType = 'maintenance' | 'contingency' | 'emergency';
type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  maintenance: 'Maintenance Collection',
  contingency: 'Contingency Fund',
  emergency: 'Emergency Fund',
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
  payment_quarter: string | null;
  payment_date: string | null;
  status: string | null; // 'Received' | 'Reviewed' | 'Approved'
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
  // Tooltip information for temporary comparison
  paymentStatus?: string | null; // 'Approved', 'Reviewed', 'Received', or null
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
  const month = now.getMonth(); // 0-based
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

// Sort flats in ascending order by flat number (handles numeric sorting like "101" < "102" < "2A" < "2B")
function sortFlats<T extends { flat_number: string }>(flats: T[]): T[] {
  return [...flats].sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true }));
}



function matchesCollection(payment: PaymentSnapshot, collection: ExpectedCollection) {
  // Direct match via expected_collection_id
  if (payment.expected_collection_id && payment.expected_collection_id === collection.id) {
    return true;
  }

  // Check payment type matches
  const paymentType = payment.payment_type?.toLowerCase() || '';
  const collectionType = collection.payment_type?.toLowerCase() || '';
  const typeMatches = paymentType === collectionType;
  
  if (!typeMatches) {
    // Debug log for type mismatches
    if (payment.payment_type || collection.payment_type) {
      console.debug('[PaymentStatus] Type mismatch:', {
        payment_type: payment.payment_type,
        expected_type: collection.payment_type,
      });
    }
    return false;
  }

  // Check quarter matches
  // payment_quarter format: "Q1-2025" or "Q2-2026"
  // collection.quarter format: "Q1", "Q2", etc.
  // collection.financial_year format: "FY25", "FY26", etc. (or just "2025", "2026")
  
  if (!payment.payment_quarter) {
    console.debug('[PaymentStatus] Missing payment_quarter:', {
      payment_id: payment.flat_id,
      payment_type: payment.payment_type,
    });
    return false;
  }
  
  if (!collection.quarter || !collection.financial_year) {
    console.debug('[PaymentStatus] Missing collection quarter/year:', {
      collection_id: collection.id,
      quarter: collection.quarter,
      financial_year: collection.financial_year,
    });
    return false;
  }
  
  const paymentQuarterLower = payment.payment_quarter.toLowerCase();
  const collectionQuarterLower = collection.quarter.toLowerCase();
  const financialYearLower = collection.financial_year.toLowerCase();
  
  // Extract year from financial_year (handle both "FY25" and "2025" formats)
  let yearToMatch: string;
  if (financialYearLower.startsWith('fy')) {
    // "FY25" -> extract "25" and convert to full year
    const yearSuffix = financialYearLower.replace('fy', '');
    // Assume 2000s if year suffix is 2 digits
    if (yearSuffix.length === 2) {
      const fullYear = '20' + yearSuffix;
      yearToMatch = fullYear;
    } else {
      yearToMatch = financialYearLower.replace('fy', '20');
    }
  } else {
    // Already a full year like "2025"
    yearToMatch = financialYearLower;
  }
  
  // Check if payment_quarter includes the quarter (e.g., "Q1" in "Q1-2025")
  const quarterMatches = paymentQuarterLower.includes(collectionQuarterLower);
  
  // Check if payment_quarter includes the year (e.g., "2025" in "Q1-2025")
  const yearMatches = paymentQuarterLower.includes(yearToMatch);
  
  // Debug log for mismatches
  if (!quarterMatches || !yearMatches) {
    console.debug('[PaymentStatus] Quarter/Year mismatch:', {
      payment_quarter: payment.payment_quarter,
      expected_quarter: collection.quarter,
      expected_year: collection.financial_year,
      year_to_match: yearToMatch,
      quarter_matches: quarterMatches,
      year_matches: yearMatches,
    });
  }
  
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
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ExpectedCollectionFormState>({
    payment_type: 'maintenance',
    financial_year: getDefaultFinancialYearLabel(),
    quarter: getCurrentFinancialQuarter(),
    quarter_basis: 'financial',
    due_date: new Date().toISOString().split('T')[0],
    amount_due: '',
    daily_fine: '0',
    notes: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          .order('due_date', { ascending: true }),
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

      if (!selectedCollectionId && expectedRes.data && expectedRes.data.length > 0) {
        setSelectedCollectionId(expectedRes.data[0].id);
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

    // Admin view can query the table directly
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('flat_id, expected_collection_id, payment_amount, payment_type, payment_quarter, payment_date, status, created_at')
      .eq('apartment_id', apartmentId);

    if (error) throw error;
    setPayments(data || []);

    if (!selectedCollectionId && collections.length > 0) {
      setSelectedCollectionId(collections[0].id);
    }
  }

  const selectedCollection = useMemo(
    () => expectedCollections.find((c) => c.id === selectedCollectionId) || expectedCollections[0] || null,
    [expectedCollections, selectedCollectionId],
  );

  const blockStatuses = useMemo(() => {
    if (!selectedCollection) return [];

    const baseAmount = Number(selectedCollection.amount_due || 0);
    const dailyFine = Number(selectedCollection.daily_fine || 0);
    const dueDate = new Date(selectedCollection.due_date);
    dueDate.setHours(0, 0, 0, 0);

    // Debug logging
    console.debug('[PaymentStatus] Status calculation:', {
      collection_id: selectedCollection.id,
      payment_type: selectedCollection.payment_type,
      quarter: selectedCollection.quarter,
      financial_year: selectedCollection.financial_year,
      base_amount: baseAmount,
      due_date: selectedCollection.due_date,
      daily_fine: dailyFine,
      total_payments: payments.length,
    });

    return blocks.map((block) => {
      const flats = (block.flats || []).map((flat) => {
        // Find all payments for this flat that match the selected collection
        const relevantPayments = payments.filter(
          (payment) => payment.flat_id === flat.id && matchesCollection(payment, selectedCollection),
        );

        // UNPAID: No entry in payments table for the active maintenance quarter collection
        if (relevantPayments.length === 0) {
          return {
            id: flat.id,
            flat_number: flat.flat_number,
            status: 'pending' as FlatStatus,
            paidAmount: 0,
            expectedAmount: baseAmount,
          } as FlatStatusDisplay;
        }

        // Filter payments that have valid amount (not null/empty)
        // Criteria: payment_amount field value is not empty or null
        const validPayments = relevantPayments.filter(
          (payment) => payment.payment_amount != null && payment.payment_amount !== '',
        );

        // If no valid payments, status is UNPAID
        if (validPayments.length === 0) {
          return {
            id: flat.id,
            flat_number: flat.flat_number,
            status: 'pending' as FlatStatus,
            paidAmount: 0,
            expectedAmount: baseAmount,
          } as FlatStatusDisplay;
        }

        // Check each valid payment against PAID criteria
        let paidStatusFound = false;
        let partialStatusFound = false;
        let latestPaymentDate: Date | null = null;

        for (const payment of validPayments) {
          const paymentAmount = Number(payment.payment_amount || 0);
          
          // Skip if payment amount is 0 or invalid
          if (paymentAmount <= 0) continue;

          const paymentDate = payment.payment_date ? new Date(payment.payment_date) : null;
          
          // Track latest payment date for PARTIAL status calculation
          if (paymentDate) {
            paymentDate.setHours(0, 0, 0, 0);
            if (!latestPaymentDate || paymentDate > latestPaymentDate) {
              latestPaymentDate = paymentDate;
            }
          }

          // Calculate days late (inclusive: payment date > due date means late)
          // If payment_date is missing, we cannot determine if it's on time or late
          let isOnTime = false;
          let isLate = false;
          let daysLate = 0;
          let expectedAmountWithFine = baseAmount;

          if (paymentDate) {
            daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            isOnTime = daysLate <= 0; // payment_date <= due_date
            isLate = daysLate > 0;    // payment_date > due_date
            
            if (isLate) {
              // Fine is inclusive: each day from due date
              // If due date is Jan 1 and payment is Jan 2, that's 1 day late
              const fineAmount = daysLate * dailyFine;
              expectedAmountWithFine = baseAmount + fineAmount;
            }
          }

          // PAID Criteria 1:
          // 1. Payment date <= payment due date
          // 2. Payment_amount field value is not empty or null (already filtered)
          // 3. Payment amount field value is equal to expected maintenance amount
          // 4. Status is approved
          if (isOnTime && payment.status === 'Approved') {
            // Use exact equality check (allowing for floating point precision)
            if (Math.abs(paymentAmount - baseAmount) < 0.01) {
              paidStatusFound = true;
              // Found a payment that meets PAID criteria, stop checking
              break;
            }
          }

          // PAID Criteria 2:
          // 1. Payment date > payment due date
          // 2. Payment_amount field value is not empty or null (already filtered)
          // 3. Payment amount should be equal to maintenance amount plus inclusive fine
          // 4. Status is approved
          if (isLate && payment.status === 'Approved') {
            // Use exact equality check (allowing for floating point precision)
            if (Math.abs(paymentAmount - expectedAmountWithFine) < 0.01) {
              paidStatusFound = true;
              // Found a payment that meets PAID criteria, stop checking
              break;
            }
          }

          // PARTIAL Criteria 1:
          // 1. Payment date <= payment due date
          // 2. Payment_amount field value is not empty or null (already filtered)
          // 3. Payment amount field value is less than the expected maintenance amount
          if (isOnTime) {
            if (paymentAmount < baseAmount) {
              partialStatusFound = true;
              // Continue checking other payments in case one meets PAID criteria
            }
          }

          // PARTIAL Criteria 2:
          // 1. Payment date > payment due date
          // 2. Payment_amount field value is not empty or null (already filtered)
          // 3. Payment amount is not equal to expected maintenance amount plus inclusive fine
          if (isLate) {
            if (Math.abs(paymentAmount - expectedAmountWithFine) >= 0.01) {
              partialStatusFound = true;
              // Continue checking other payments in case one meets PAID criteria
            }
          }

          // If payment_date is missing, we can't determine on-time/late, but we can check PARTIAL
          // if amount doesn't match base amount exactly
          if (!paymentDate && payment.status !== 'Approved') {
            // Without payment_date, we can't determine PAID status
            // But if amount doesn't match base, it's likely PARTIAL
            if (Math.abs(paymentAmount - baseAmount) >= 0.01) {
              partialStatusFound = true;
            }
          }
        }

        // Determine final status
        let status: FlatStatus = 'pending';
        let paidAmount = 0;
        let expectedAmount = baseAmount;
        
        // Get payment details for tooltip (use the most recent valid payment)
        let paymentStatus: string | null = null;
        let paymentDate: string | null = null;
        let transactionAmount: number | null = null;
        
        if (validPayments.length > 0) {
          // Get the most recent payment (by payment_date or created_at)
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
          // At least one payment meets PAID criteria
          status = 'paid';
          // Sum all valid payments for display
          paidAmount = validPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
          // Expected is base amount (fine already included in payment if late)
          expectedAmount = baseAmount;
        } else if (partialStatusFound || validPayments.length > 0) {
          // At least one payment exists but doesn't meet PAID criteria
          status = 'partial';
          // Sum all valid payments for display
          paidAmount = validPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
          
          // Calculate expected based on latest payment date (if available)
          if (latestPaymentDate) {
            const daysLate = Math.floor((latestPaymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLate > 0) {
              const fineAmount = daysLate * dailyFine;
              expectedAmount = baseAmount + fineAmount;
            } else {
              expectedAmount = baseAmount;
            }
          } else {
            // No payment_date available, use base amount
            expectedAmount = baseAmount;
          }
        } else {
          // No valid payments (shouldn't reach here, but safety check)
          status = 'pending';
          paidAmount = 0;
          expectedAmount = baseAmount;
        }

        // Debug logging for each flat
        console.debug('[PaymentStatus] Flat status:', {
          flat_number: flat.flat_number,
          block_name: block.block_name,
          matching_payments: relevantPayments.length,
          valid_payments: validPayments.length,
          paid_amount: paidAmount,
          expected_amount: expectedAmount,
          base_amount: baseAmount,
          due_date: selectedCollection.due_date,
          difference: expectedAmount - paidAmount,
          final_status: status,
          paid_criteria_met: paidStatusFound,
          partial_criteria_met: partialStatusFound,
          payments: validPayments.map(p => {
            const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
            if (paymentDate) paymentDate.setHours(0, 0, 0, 0);
            const daysLate = paymentDate ? Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isOnTime = paymentDate ? daysLate! <= 0 : false;
            const isLate = paymentDate ? daysLate! > 0 : false;
            const fineAmount = (daysLate && daysLate > 0) ? daysLate * dailyFine : 0;
            const expectedForThisPayment = baseAmount + fineAmount;
            const paymentAmount = Number(p.payment_amount || 0);
            return {
              amount: p.payment_amount,
              status: p.status,
              type: p.payment_type,
              quarter: p.payment_quarter,
              payment_date: p.payment_date,
              days_late: daysLate,
              is_on_time: isOnTime,
              is_late: isLate,
              fine_amount: fineAmount,
              expected_for_this_payment: expectedForThisPayment,
              meets_paid_criteria_1: isOnTime && p.status === 'Approved' && Math.abs(paymentAmount - baseAmount) < 0.01,
              meets_paid_criteria_2: isLate && p.status === 'Approved' && Math.abs(paymentAmount - expectedForThisPayment) < 0.01,
              meets_partial_criteria_1: isOnTime && paymentAmount < baseAmount,
              meets_partial_criteria_2: isLate && Math.abs(paymentAmount - expectedForThisPayment) >= 0.01,
            };
          }),
        });

        return {
          id: flat.id,
          flat_number: flat.flat_number,
          status,
          paidAmount,
          expectedAmount: expectedAmount,
          paymentStatus: paymentStatus,
          paymentDate: paymentDate,
          maintenanceDueDate: selectedCollection.due_date,
          transactionAmount: transactionAmount,
        } as FlatStatusDisplay;
      });

      // Sort flats in ascending order by flat number (numeric sort)
      const sortedFlats = sortFlats(flats);

      return { ...block, flats: sortedFlats };
    });
  }, [blocks, payments, selectedCollection]);

  const summary = useMemo(() => {
    const counts = { paid: 0, partial: 0, pending: 0 };
    let totalCollected = 0;
    let totalExpected = 0;

    blockStatuses.forEach((block) => {
      block.flats.forEach((flat) => {
        counts[flat.status] += 1;
        totalCollected += flat.paidAmount || 0;
        totalExpected += flat.expectedAmount || 0;
      });
    });

    return { counts, totalCollected, totalExpected };
  }, [blockStatuses]);

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

    const isEditing = !!editingId;
    setSaving(true);
    setSuccessMessage(null);
    
    try {
      // Base payload without quarter_basis (in case column doesn't exist yet)
      const basePayload = {
        apartment_id: apartmentId,
        payment_type: form.payment_type,
        financial_year: form.financial_year.trim(),
        quarter: form.quarter,
        due_date: form.due_date,
        amount_due: amountDue,
        daily_fine: Number.isNaN(dailyFine) ? 0 : dailyFine,
        notes: form.notes?.trim() || null,
      };

      // Try with quarter_basis first, fallback to without it if column doesn't exist
      let payload = { ...basePayload, quarter_basis: form.quarter_basis };
      let error;
      let usedFallback = false;
      
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('expected_collections')
          .update(payload)
          .eq('id', editingId);
        error = updateError;
        
        // If error is about missing quarter_basis column, retry without it
        if (error && (error.message?.includes('quarter_basis') || error.code === 'PGRST204')) {
          console.warn('quarter_basis column not found, updating without it. Please run migration.');
          usedFallback = true;
          const { error: retryError } = await supabase
            .from('expected_collections')
            .update(basePayload)
            .eq('id', editingId);
          error = retryError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('expected_collections')
          .insert([payload]);
        error = insertError;
        
        // If error is about missing quarter_basis column, retry without it
        if (error && (error.message?.includes('quarter_basis') || error.code === 'PGRST204')) {
          console.warn('quarter_basis column not found, inserting without it. Please run migration.');
          usedFallback = true;
          const { error: retryError } = await supabase
            .from('expected_collections')
            .insert([basePayload]);
          error = retryError;
        }
      }

      if (error) {
        console.error('Database error:', error);
        console.error('Payload attempted:', payload);
        throw error;
      }
      
      // Show warning if we had to use fallback
      if (usedFallback) {
        console.warn(
          '⚠️ Record saved without quarter_basis. ' +
          'Please run migration: 20251115123000_add_quarter_basis_to_expected_collections.sql'
        );
      }

      // Reset form to defaults
      setForm({
        payment_type: 'maintenance',
        financial_year: getDefaultFinancialYearLabel(),
        quarter: getCurrentFinancialQuarter(),
        quarter_basis: 'financial',
        due_date: new Date().toISOString().split('T')[0],
        amount_due: '',
        daily_fine: '0',
        notes: '',
      });
      
      setEditingId(null);
      setSuccessMessage(
        isEditing 
          ? 'Expected collection updated successfully.' 
          : 'Expected collection created successfully.'
      );

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      await loadData();
    } catch (err) {
      console.error('Error saving expected collection:', err);
      let message = 'Unable to save expected collection';
      
      if (err instanceof Error) {
        message = err.message;
        
        // Check for specific error types
        if (message.includes('duplicate key') || message.includes('unique constraint')) {
          message = 'A collection with this payment type, quarter, and financial year already exists for this apartment. Please use a different combination.';
        } else if (message.includes('quarter_basis') || message.includes('column') && message.includes('does not exist')) {
          message = 'Database migration required: The quarter_basis column is missing. Please run the migration: 20251115123000_add_quarter_basis_to_expected_collections.sql';
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
    if (!confirm('Delete this expected collection? Payments linked to it will remain, but the target will be removed.')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('expected_collections').delete().eq('id', id);
      if (error) throw error;

      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete expected collection';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {showChart ? 'Payment Status' : 'Payment Setup'} · {apartmentName}
            </h2>
            <p className="text-gray-600">
              {showChart
                ? 'Live view of maintenance collections across every flat'
                : 'Define expected maintenance/other collections and fines; this powers the Payment Status dashboard.'}
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
              <h3 className="text-lg font-semibold text-gray-900">Expected Collections</h3>
              <p className="text-sm text-gray-600">Define the dues per quarter and payment type.</p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-900">
              {successMessage}
            </div>
          )}

          {editingId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
              <strong>Editing mode:</strong> You are currently editing an expected collection. Click "Update Expected Collection" to save changes or "Cancel Edit" to discard.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Payment Type</label>
              <select
                value={form.payment_type}
                onChange={(e) => setForm({ ...form, payment_type: e.target.value as PaymentType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PAYMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Quarter Type</label>
              <select
                value={form.quarter_basis}
                onChange={(e) => setForm({ ...form, quarter_basis: e.target.value as 'financial' | 'yearly' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="financial">Financial-year quarters (Apr–Mar)</option>
                <option value="yearly">Calendar-year quarters (Jan–Dec)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Financial Year</label>
              <input
                type="text"
                value={form.financial_year}
                onChange={(e) => setForm({ ...form, financial_year: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="FY25"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Quarter</label>
              <select
                value={form.quarter}
                onChange={(e) => setForm({ ...form, quarter: e.target.value as QuarterType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {QUARTERS.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Amount Due / Flat (₹)</label>
              <input
                type="number"
                min="0"
                value={form.amount_due}
                onChange={(e) => setForm({ ...form, amount_due: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Daily Fine After Due Date (₹)</label>
              <input
                type="number"
                min="0"
                value={form.daily_fine}
                onChange={(e) => setForm({ ...form, daily_fine: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Includes clubhouse upgrade"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateExpectedCollection}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {saving ? 'Saving...' : editingId ? 'Update Expected Collection' : 'Add Expected Collection'}
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
                  });
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {expectedCollections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full mt-4 text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="text-left px-4 py-2">Period</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Due Date</th>
                    <th className="text-left px-4 py-2">Amount</th>
                    <th className="text-left px-4 py-2">Daily Fine</th>
                    <th className="text-left px-4 py-2">Selected</th>
                    <th className="text-left px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expectedCollections.map((collection) => (
                    <tr 
                      key={collection.id}
                      className={editingId === collection.id ? 'bg-amber-50' : ''}
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {collection.quarter} · {collection.financial_year}
                      </td>
                      <td className="px-4 py-2">{PAYMENT_TYPE_LABELS[collection.payment_type] || collection.payment_type}</td>
                      <td className="px-4 py-2">{formatDate(collection.due_date)}</td>
                      <td className="px-4 py-2">₹{Number(collection.amount_due).toLocaleString()}</td>
                      <td className="px-4 py-2">₹{Number(collection.daily_fine || 0).toLocaleString()}/day</td>
                      <td className="px-4 py-2">
                        <input
                          type="radio"
                          name="selectedCollection"
                          checked={selectedCollection?.id === collection.id}
                          onChange={() => setSelectedCollectionId(collection.id)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3">
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
                              });
                              setSuccessMessage(null);
                              // Scroll to form after a brief delay to allow state update
                              setTimeout(() => {
                                const formElement = document.querySelector('[data-payment-setup-form]');
                                formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            disabled={deletingId === collection.id}
                            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpectedCollection(collection.id)}
                            disabled={deletingId === collection.id}
                            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm">
              No expected collections yet. Add one above to start tracking statuses.
            </div>
          )}
        </div>
      )}

      {showChart && !selectedCollection && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-1 text-amber-600" />
          <div>
            <p className="font-semibold">No expected collections configured</p>
            <p className="text-sm">
              Admins need to define the amount per quarter to enable the Payment Status dashboard.
            </p>
          </div>
        </div>
      )}

      {showChart && selectedCollection && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Selected Collection</p>
              <p className="text-lg font-bold text-gray-900">
                {selectedCollection.quarter} · {selectedCollection.financial_year}
              </p>
              <p className="text-sm text-gray-600">
                {PAYMENT_TYPE_LABELS[selectedCollection.payment_type] || selectedCollection.payment_type}
                {selectedCollection.quarter_basis === 'financial' && ' · Financial-year quarters (Apr–Mar)'}
                {selectedCollection.quarter_basis === 'yearly' && ' · Calendar-year quarters (Jan–Dec)'}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Amount Due / Flat</p>
              <p className="text-lg font-bold text-gray-900">
                ₹{Number(selectedCollection.amount_due).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Due by {formatDate(selectedCollection.due_date)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Daily Fine After Due Date</p>
              <p className="text-lg font-bold text-gray-900">
                ₹{Number(selectedCollection.daily_fine || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Applied per day past due date</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {(['paid', 'partial', 'pending'] as FlatStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${STATUS_META[status].color}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {STATUS_META[status].label}: {summary.counts[status]}
                  </span>
                </div>
              ))}
              <div className="ml-auto text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase">Collected vs Expected</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{summary.totalCollected.toLocaleString()} / ₹{summary.totalExpected.toLocaleString()}
                </p>
              </div>
            </div>

            {blockStatuses.length === 0 && (
              <div className="text-center text-gray-600 py-12">
                No flats configured yet. Add buildings and flats to visualize payment status.
              </div>
            )}

            <div className="space-y-6">
              {blockStatuses.map((block) => (
                <div key={block.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{block.block_name}</h4>
                    <span className="text-sm text-gray-500">{block.flats.length} flats</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {block.flats.map((flat) => {
                      const difference = flat.expectedAmount - flat.paidAmount;
                      const meetsRequirement = flat.paidAmount >= flat.expectedAmount;
                      
                      // Build tooltip with payment details for comparison
                      let tooltipText = `Flat ${flat.flat_number}\n`;
                      tooltipText += `Status: ${flat.status === 'paid' ? '✓ Paid' : flat.status === 'partial' ? '⚠ Partial' : '❌ Unpaid'}\n`;
                      tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                      tooltipText += `Paid: ₹${flat.paidAmount.toLocaleString()}\n`;
                      tooltipText += `Expected: ₹${flat.expectedAmount.toLocaleString()}\n`;
                      tooltipText += `Difference: ₹${Math.abs(difference).toLocaleString()} ${difference >= 0 ? 'short' : 'over'}\n`;
                      tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                      
                      // Add payment details for comparison
                      tooltipText += `Payment Details:\n`;
                      tooltipText += `━━━━━━━━━━━━━━━━━━━━\n`;
                      tooltipText += `Approved Status: ${flat.paymentStatus || 'N/A'}\n`;
                      tooltipText += `Payment Date: ${flat.paymentDate ? formatDate(flat.paymentDate) : 'N/A'}\n`;
                      tooltipText += `Maintenance Due Date: ${flat.maintenanceDueDate ? formatDate(flat.maintenanceDueDate) : 'N/A'}\n`;
                      tooltipText += `Transaction Amount: ${flat.transactionAmount ? `₹${flat.transactionAmount.toLocaleString()}` : 'N/A'}\n`;
                      
                      return (
                        <div
                          key={flat.id}
                          className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg text-xs font-semibold text-gray-800 ${STATUS_META[flat.status].bg} cursor-help`}
                          title={tooltipText}
                        >
                          <span>{flat.flat_number}</span>
                          <span className="text-[10px] font-normal">
                            {flat.status === 'paid'
                              ? 'Paid'
                              : flat.status === 'partial'
                              ? 'Partial'
                              : 'Unpaid'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

