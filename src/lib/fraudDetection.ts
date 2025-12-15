import { supabase } from './supabase';

export interface FraudAnalysisResult {
  fraud_risk_score: number;
  is_flagged: boolean;
  phash_duplicate_found: boolean;
  phash_similarity_score: number | null;
  duplicate_of_payment_id: string | null;
  exif_has_editor_metadata: boolean;
  exif_software_detected: string | null;
  visual_consistency_score: number;
  ela_score: number;
  ela_manipulation_detected: boolean;
}

export interface FraudAnalysisRecord {
  id: string;
  payment_submission_id: string;
  image_url: string;
  fraud_risk_score: number;
  is_flagged: boolean;
  status: string;
  phash_value: string;
  phash_duplicate_found: boolean;
  phash_similarity_score: number | null;
  duplicate_of_payment_id: string | null;
  exif_data: any;
  exif_has_editor_metadata: boolean;
  exif_software_detected: string | null;
  exif_modification_detected: boolean;
  visual_consistency_score: number;
  bank_pattern_matched: string | null;
  ela_score: number;
  ela_manipulation_detected: boolean;
  analyzed_at: string;
  created_at: string;
}

export async function analyzePaymentImage(
  paymentSubmissionId: string,
  imageUrl: string
): Promise<{ success: boolean; result?: FraudAnalysisResult; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/analyze-payment-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          payment_submission_id: paymentSubmissionId,
          image_url: imageUrl,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to analyze image',
      };
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    console.error('Error calling fraud analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getFraudAnalysisForPayment(
  paymentSubmissionId: string
): Promise<FraudAnalysisRecord | null> {
  try {
    const { data, error } = await supabase
      .from('image_fraud_analysis')
      .select('*')
      .eq('payment_submission_id', paymentSubmissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching fraud analysis:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    return null;
  }
}

export async function getAllFlaggedPayments(apartmentId?: string) {
  try {
    let query = supabase
      .from('image_fraud_analysis')
      .select(`
        *,
        payment_submissions!inner(
          id,
          name,
          email,
          payment_amount,
          payment_date,
          status,
          apartment_id,
          apartments(apartment_name)
        )
      `)
      .eq('is_flagged', true)
      .order('fraud_risk_score', { ascending: false });

    if (apartmentId) {
      query = query.eq('payment_submissions.apartment_id', apartmentId);
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

export async function getFraudStatistics(apartmentId?: string) {
  try {
    let query = supabase
      .from('image_fraud_analysis')
      .select('fraud_risk_score, is_flagged, status, phash_duplicate_found, exif_has_editor_metadata, ela_manipulation_detected');

    if (apartmentId) {
      query = query.eq('payment_submissions.apartment_id', apartmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fraud statistics:', error);
      return null;
    }

    const total = data.length;
    const flagged = data.filter(d => d.is_flagged).length;
    const duplicates = data.filter(d => d.phash_duplicate_found).length;
    const edited = data.filter(d => d.exif_has_editor_metadata).length;
    const manipulated = data.filter(d => d.ela_manipulation_detected).length;

    const avgRiskScore = total > 0
      ? Math.round(data.reduce((sum, d) => sum + d.fraud_risk_score, 0) / total)
      : 0;

    return {
      total,
      flagged,
      duplicates,
      edited,
      manipulated,
      avgRiskScore,
      flaggedPercentage: total > 0 ? Math.round((flagged / total) * 100) : 0,
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
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-blue-600';
  return 'text-green-600';
}

export function getRiskLevelBgColor(score: number): string {
  if (score >= 80) return 'bg-red-100';
  if (score >= 60) return 'bg-orange-100';
  if (score >= 40) return 'bg-yellow-100';
  if (score >= 20) return 'bg-blue-100';
  return 'bg-green-100';
}
