import { supabase } from './supabase';

export interface DocumentClassification {
  id: string;
  payment_submission_id: string;
  document_type: string;
  confidence_level: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  payment_method: string | null;
  app_or_bank_name: string | null;
  key_identifiers: Record<string, any>;
  classification_reasoning: string;
  ai_model_used: string;
  ai_tokens_used: number | null;
  ai_cost_cents: number | null;
  ai_processing_time_ms: number | null;
  classified_at: string;
  is_manual_override: boolean;
  admin_notes: string | null;
}

export async function classifyPaymentDocument(
  paymentId: string,
  ocrText: string
): Promise<{ success: boolean; classification?: DocumentClassification; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/classify-payment-document`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        payment_submission_id: paymentId,
        ocr_text: ocrText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Classification failed' };
    }

    const result = await response.json();
    return { success: true, classification: result.result };
  } catch (error: any) {
    console.error('Document classification error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function getPaymentClassification(
  paymentId: string
): Promise<DocumentClassification | null> {
  try {
    const { data, error } = await supabase
      .from('payment_document_classifications')
      .select('*')
      .eq('payment_submission_id', paymentId)
      .order('classified_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching classification:', error);
    return null;
  }
}

export async function getClassificationStatistics(apartmentId?: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_classification_statistics', {
      p_apartment_id: apartmentId || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching classification statistics:', error);
    return null;
  }
}

export function getConfidenceLevelColor(level: string): string {
  switch (level) {
    case 'High':
      return 'text-green-600 bg-green-50';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'Low':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getDocumentTypeIcon(documentType: string): string {
  const type = documentType.toLowerCase();
  if (type.includes('upi')) return '📱';
  if (type.includes('bank')) return '🏦';
  if (type.includes('cheque')) return '💳';
  if (type.includes('cash')) return '💵';
  if (type.includes('non-payment')) return '❌';
  if (type.includes('unclear')) return '❓';
  return '📄';
}
