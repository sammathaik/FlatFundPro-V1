import { supabase } from './supabase';

export interface FraudIndicator {
  type: string;
  severity: string;
  message: string;
  points: number;
}

export interface FraudAnalysisRecord {
  id: string;
  name: string;
  email: string;
  payment_amount: number;
  payment_date: string;
  status: string;
  fraud_score: number;
  is_fraud_flagged: boolean;
  fraud_indicators: FraudIndicator[];
  fraud_checked_at: string | null;
  transaction_reference: string | null;
  sender_upi_id: string | null;
  apartments: {
    apartment_name: string;
  } | null;
}

export async function getFraudAnalysisForPayment(
  paymentSubmissionId: string
): Promise<FraudAnalysisRecord | null> {
  try {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select(`
        id,
        name,
        email,
        payment_amount,
        payment_date,
        status,
        fraud_score,
        is_fraud_flagged,
        fraud_indicators,
        fraud_checked_at,
        transaction_reference,
        sender_upi_id,
        apartments(apartment_name)
      `)
      .eq('id', paymentSubmissionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching fraud analysis:', error);
      return null;
    }

    return data as any;
  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    return null;
  }
}

export async function getAllFlaggedPayments(apartmentId?: string) {
  try {
    let query = supabase
      .from('payment_submissions')
      .select(`
        id,
        name,
        email,
        payment_amount,
        payment_date,
        status,
        fraud_score,
        is_fraud_flagged,
        fraud_indicators,
        fraud_checked_at,
        transaction_reference,
        sender_upi_id,
        other_text,
        bank_name,
        payer_name,
        narration,
        screenshot_source,
        apartments(apartment_name)
      `)
      .eq('is_fraud_flagged', true)
      .order('fraud_score', { ascending: false });

    if (apartmentId) {
      query = query.eq('apartment_id', apartmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching flagged payments:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching flagged payments:', error);
    return [];
  }
}

export async function getNonFlaggedPaymentsWithIndicators(apartmentId?: string) {
  try {
    let query = supabase
      .from('payment_submissions')
      .select(`
        id,
        name,
        email,
        payment_amount,
        payment_date,
        status,
        fraud_score,
        is_fraud_flagged,
        fraud_indicators,
        fraud_checked_at,
        transaction_reference,
        sender_upi_id,
        apartments(apartment_name)
      `)
      .eq('is_fraud_flagged', false)
      .not('fraud_indicators', 'is', null)
      .order('fraud_score', { ascending: false });

    if (apartmentId) {
      query = query.eq('apartment_id', apartmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching non-flagged payments:', error);
      return [];
    }

    return (data || []).filter(payment =>
      Array.isArray(payment.fraud_indicators) && payment.fraud_indicators.length > 0
    );
  } catch (error) {
    console.error('Error fetching non-flagged payments:', error);
    return [];
  }
}

export async function getFraudStatistics(apartmentId?: string) {
  try {
    let query = supabase
      .from('payment_submissions')
      .select('fraud_score, is_fraud_flagged, fraud_indicators, fraud_checked_at');

    if (apartmentId) {
      query = query.eq('apartment_id', apartmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fraud statistics:', error);
      return null;
    }

    const checked = data.filter(d => d.fraud_checked_at !== null).length;
    const flagged = data.filter(d => d.is_fraud_flagged).length;

    const indicatorTypes = {
      FUTURE_DATE: 0,
      OLD_DATE: 0,
      SUSPICIOUS_TRANSACTION_ID: 0,
      SUSPICIOUS_UPI_ID: 0,
      INVALID_UPI_FORMAT: 0,
      SUSPICIOUS_TYPO: 0,
      TEMPLATE_TEXT: 0,
      SUSPICIOUS_NARRATION: 0,
      SUSPICIOUS_BANK_NAME: 0,
      EDITING_SOFTWARE_DETECTED: 0,
    };

    data.forEach(record => {
      if (record.fraud_indicators && Array.isArray(record.fraud_indicators)) {
        record.fraud_indicators.forEach((indicator: FraudIndicator) => {
          if (indicator.type in indicatorTypes) {
            indicatorTypes[indicator.type as keyof typeof indicatorTypes]++;
          }
        });
      }
    });

    const avgRiskScore = checked > 0
      ? Math.round(
          data
            .filter(d => d.fraud_checked_at !== null)
            .reduce((sum, d) => sum + (d.fraud_score || 0), 0) / checked
        )
      : 0;

    return {
      total: data.length,
      checked,
      flagged,
      avgRiskScore,
      flaggedPercentage: checked > 0 ? Math.round((flagged / checked) * 100) : 0,
      indicatorTypes,
    };
  } catch (error) {
    console.error('Error calculating fraud statistics:', error);
    return null;
  }
}

export function getRiskLevelLabel(score: number): string {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Minimal';
}

export function getRiskLevelColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-indigo-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-blue-600';
  return 'text-green-600';
}

export function getRiskLevelBgColor(score: number): string {
  if (score >= 80) return 'bg-red-100';
  if (score >= 60) return 'bg-indigo-100';
  if (score >= 40) return 'bg-yellow-100';
  if (score >= 20) return 'bg-blue-100';
  return 'bg-green-100';
}
