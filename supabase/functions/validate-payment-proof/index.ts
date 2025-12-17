import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createWorker } from 'npm:tesseract.js@5.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ValidationRequest {
  payment_submission_id: string;
  file_url: string;
  file_type: string;
}

interface PaymentSignals {
  hasAmount: boolean;
  hasTransactionRef: boolean;
  hasDate: boolean;
  hasStatusKeyword: boolean;
  hasPaymentKeyword: boolean;
  hasBankName: boolean;
  extractedAmount: number | null;
  extractedDate: string | null;
  extractedTransactionRef: string | null;
  paymentType: string | null;
  platform: string | null;
}

interface AIClassification {
  classification: string;
  confidence: number;
  reason: string;
}

interface OCRResult {
  text: string;
  confidence: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'FAILED';
  attempts: Array<{
    method: string;
    success: boolean;
    textLength: number;
    confidence: number;
  }>;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: ValidationRequest = await req.json();
    const { payment_submission_id, file_url, file_type } = requestData;

    if (!payment_submission_id || !file_url || !file_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ocrResult = await extractTextFromFile(file_url, file_type);

    console.log('OCR Result:', {
      quality: ocrResult.quality,
      confidence: ocrResult.confidence,
      textLength: ocrResult.text.length,
      attempts: ocrResult.attempts.length
    });

    const signals = detectPaymentSignals(ocrResult.text);

    let aiClassification: AIClassification | null = null;
    if (openaiApiKey) {
      if (ocrResult.quality === 'FAILED' || ocrResult.quality === 'LOW') {
        aiClassification = await classifyWithAIVision(file_url, openaiApiKey);
      } else {
        aiClassification = await classifyWithAI(ocrResult.text, openaiApiKey);
      }
    }

    const confidenceResult = calculateConfidenceScore(
      signals,
      aiClassification,
      ocrResult.quality,
      ocrResult.confidence
    );

    let validationStatus = 'MANUAL_REVIEW';
    let requiresManualReview = false;
    let manualReviewReason = '';

    if (ocrResult.quality === 'FAILED' && !aiClassification) {
      validationStatus = 'MANUAL_REVIEW';
      requiresManualReview = true;
      manualReviewReason = 'OCR extraction failed completely. AI vision analysis not available.';
    } else if (confidenceResult.score >= 70) {
      validationStatus = 'AUTO_APPROVED';
      requiresManualReview = false;
    } else if (confidenceResult.score >= 40) {
      validationStatus = 'MANUAL_REVIEW';
      requiresManualReview = true;
      manualReviewReason = `Moderate confidence (${confidenceResult.score}%). ${confidenceResult.reason}`;
    } else {
      validationStatus = 'REJECTED';
      requiresManualReview = true;
      manualReviewReason = `Low confidence (${confidenceResult.score}%). ${confidenceResult.reason}`;
    }

    await updateValidationStatus(supabase, payment_submission_id, {
      ocr_text: ocrResult.text,
      ocr_quality: ocrResult.quality,
      ocr_confidence_score: ocrResult.confidence,
      ocr_attempts: ocrResult.attempts,
      extracted_amount: signals.extractedAmount,
      extracted_date: signals.extractedDate,
      extracted_transaction_ref: signals.extractedTransactionRef,
      payment_type: signals.paymentType,
      payment_platform: signals.platform,
      validation_status: validationStatus,
      validation_confidence_score: confidenceResult.score,
      validation_reason: confidenceResult.reason,
      requires_manual_review: requiresManualReview,
      manual_review_reason: manualReviewReason,
      ai_classification: aiClassification,
      validation_performed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        validation_status: validationStatus,
        confidence_score: confidenceResult.score,
        ocr_quality: ocrResult.quality,
        ocr_confidence: ocrResult.confidence,
        requires_manual_review: requiresManualReview,
        reason: confidenceResult.reason,
        extracted_data: {
          amount: signals.extractedAmount,
          date: signals.extractedDate,
          transaction_ref: signals.extractedTransactionRef,
          payment_type: signals.paymentType,
          platform: signals.platform,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function extractTextFromFile(fileUrl: string, fileType: string): Promise<OCRResult> {
  const attempts: Array<{
    method: string;
    success: boolean;
    textLength: number;
    confidence: number;
  }> = [];

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const buffer = await response.arrayBuffer();
    const imageBuffer = new Uint8Array(buffer);

    console.log('OCR Attempt 1: Direct extraction');
    let result = await extractTextWithOCR(imageBuffer);
    attempts.push({
      method: 'direct',
      success: result.text.length > 20,
      textLength: result.text.length,
      confidence: result.confidence
    });

    if (result.text.length > 50 && result.confidence > 70) {
      return {
        text: result.text,
        confidence: result.confidence,
        quality: 'HIGH',
        attempts
      };
    }

    console.log('OCR Attempt 2: Grayscale + contrast');
    const enhancedBuffer = await preprocessImage(imageBuffer, 'enhance');
    result = await extractTextWithOCR(enhancedBuffer);
    attempts.push({
      method: 'grayscale_contrast',
      success: result.text.length > 20,
      textLength: result.text.length,
      confidence: result.confidence
    });

    if (result.text.length > 50 && result.confidence > 70) {
      return {
        text: result.text,
        confidence: result.confidence,
        quality: 'HIGH',
        attempts
      };
    }

    console.log('OCR Attempt 3: Color inversion for dark theme');
    const invertedBuffer = await preprocessImage(imageBuffer, 'invert');
    const invertResult = await extractTextWithOCR(invertedBuffer);
    attempts.push({
      method: 'color_invert',
      success: invertResult.text.length > 20,
      textLength: invertResult.text.length,
      confidence: invertResult.confidence
    });

    const bestResult = [result, invertResult].reduce((best, current) => {
      const bestScore = best.text.length * (best.confidence / 100);
      const currentScore = current.text.length * (current.confidence / 100);
      return currentScore > bestScore ? current : best;
    });

    let quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'FAILED';
    if (bestResult.text.length === 0) {
      quality = 'FAILED';
    } else if (bestResult.text.length > 50 && bestResult.confidence > 60) {
      quality = 'HIGH';
    } else if (bestResult.text.length > 20 && bestResult.confidence > 40) {
      quality = 'MEDIUM';
    } else {
      quality = 'LOW';
    }

    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      quality,
      attempts
    };
  } catch (error) {
    console.error('Text extraction error:', error);
    return {
      text: '',
      confidence: 0,
      quality: 'FAILED',
      attempts
    };
  }
}

async function preprocessImage(imageBuffer: Uint8Array, mode: 'enhance' | 'invert'): Promise<Uint8Array> {
  try {
    console.log(`Preprocessing mode: ${mode} (placeholder - returning original)`);
    return imageBuffer;
  } catch (error) {
    console.error('Preprocessing error:', error);
    return imageBuffer;
  }
}

async function extractTextWithOCR(imageBuffer: Uint8Array): Promise<{ text: string; confidence: number }> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();

    const avgConfidence = data.confidence || 0;

    return {
      text: data.text || '',
      confidence: Math.round(avgConfidence)
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      text: '',
      confidence: 0
    };
  }
}

function detectPaymentSignals(text: string): PaymentSignals {
  const textUpper = text.toUpperCase();
  const textLower = text.toLowerCase();

  const amountPatterns = [
    /₹\s*([\d,]+\.?\d*)/,
    /INR\s*([\d,]+\.?\d*)/i,
    /RS\.?\s*([\d,]+\.?\d*)/i,
    /AMOUNT[:\s]*₹?\s*([\d,]+\.?\d*)/i,
  ];
  let extractedAmount: number | null = null;
  let hasAmount = false;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      extractedAmount = parseFloat(amountStr);
      hasAmount = true;
      break;
    }
  }

  const transactionPatterns = [
    /(?:UTR|UPI|TXN|TRANSACTION)[\s#:]*([A-Z0-9]{10,20})/i,
    /(?:REF|REFERENCE)[\s#:]*([A-Z0-9]{10,20})/i,
    /\b([0-9]{12,16})\b/,
  ];
  let extractedTransactionRef: string | null = null;
  let hasTransactionRef = false;
  for (const pattern of transactionPatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedTransactionRef = match[1];
      hasTransactionRef = true;
      break;
    }
  }

  const datePatterns = [
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
    /\d{4}-\d{2}-\d{2}/,
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}/i,
  ];
  let extractedDate: string | null = null;
  let hasDate = false;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedDate = match[0];
      hasDate = true;
      break;
    }
  }

  const statusKeywords = ['PAID', 'PAYMENT SUCCESSFUL', 'COMPLETED', 'SUCCESS', 'CREDITED'];
  const hasStatusKeyword = statusKeywords.some(keyword => textUpper.includes(keyword));

  const paymentKeywords = [
    'UPI', 'IMPS', 'NEFT', 'RTGS', 'BHIM', 'GOOGLE PAY', 'GPAY',
    'PHONEPE', 'PAYTM', 'PAYMENT'
  ];
  const hasPaymentKeyword = paymentKeywords.some(keyword => textUpper.includes(keyword));

  const bankNames = [
    'SBI', 'STATE BANK', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'YES BANK',
    'IDFC', 'BANK OF BARODA', 'BOB', 'PNB', 'PUNJAB NATIONAL', 'CANARA',
    'UNION BANK', 'INDIAN BANK', 'BANK OF INDIA'
  ];
  const hasBankName = bankNames.some(bank => textUpper.includes(bank));

  let paymentType: string | null = null;
  if (textUpper.includes('UPI')) paymentType = 'UPI';
  else if (textUpper.includes('NEFT')) paymentType = 'NEFT';
  else if (textUpper.includes('IMPS')) paymentType = 'IMPS';
  else if (textUpper.includes('RTGS')) paymentType = 'RTGS';
  else if (textUpper.includes('BANK TRANSFER')) paymentType = 'BANK_TRANSFER';

  let platform: string | null = null;
  if (textLower.includes('mygate')) platform = 'MyGate';
  else if (textLower.includes('nobroker')) platform = 'NoBroker';
  else if (textLower.includes('adda')) platform = 'Adda';
  else if (textLower.includes('google pay') || textLower.includes('gpay')) platform = 'Google Pay';
  else if (textLower.includes('phonepe')) platform = 'PhonePe';
  else if (textLower.includes('paytm')) platform = 'Paytm';
  else if (textLower.includes('bhim')) platform = 'BHIM';
  else if (hasBankName) platform = 'Bank';

  return {
    hasAmount,
    hasTransactionRef,
    hasDate,
    hasStatusKeyword,
    hasPaymentKeyword,
    hasBankName,
    extractedAmount,
    extractedDate,
    extractedTransactionRef,
    paymentType,
    platform,
  };
}

async function classifyWithAIVision(
  imageUrl: string,
  apiKey: string
): Promise<AIClassification> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing payment receipt screenshots. Look at the image and determine if it is a valid payment receipt. Extract any visible payment details like amount, date, transaction ID, payer name, and bank/platform.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this payment screenshot and respond with JSON: {"classification": "Valid payment receipt" or "Invalid/Unclear", "confidence": 0-100, "reason": "explanation", "extracted_data": {"amount": number or null, "has_transaction_id": boolean, "payment_platform": string or null}}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      classification: result.classification || 'Unknown',
      confidence: result.confidence || 0,
      reason: result.reason || 'Vision analysis performed',
    };
  } catch (error) {
    console.error('AI vision classification error:', error);
    return {
      classification: 'Error',
      confidence: 0,
      reason: 'AI vision analysis failed',
    };
  }
}

async function classifyWithAI(
  text: string,
  apiKey: string
): Promise<AIClassification> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at classifying Indian payment receipts. Analyze the provided text and classify it into one of: "Valid UPI payment receipt", "Valid bank transfer receipt", "Maintenance platform receipt (MyGate/NoBroker/Adda)", "Non-payment document", or "Unclear or insufficient data". Provide your classification, confidence (0-100), and a brief reason.'
          },
          {
            role: 'user',
            content: `Classify this payment document text:\n\n${text}\n\nRespond with JSON: {"classification": "...", "confidence": 0-100, "reason": "..."}`,
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      classification: result.classification || 'Unknown',
      confidence: result.confidence || 0,
      reason: result.reason || 'No reason provided',
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return {
      classification: 'Error',
      confidence: 0,
      reason: 'AI classification failed',
    };
  }
}

function calculateConfidenceScore(
  signals: PaymentSignals,
  aiClassification: AIClassification | null,
  ocrQuality: string,
  ocrConfidence: number
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (ocrQuality === 'HIGH') {
    score += 10;
    reasons.push(`OCR quality: HIGH (${ocrConfidence}%)`);
  } else if (ocrQuality === 'MEDIUM') {
    score += 5;
    reasons.push(`OCR quality: MEDIUM (${ocrConfidence}%)`);
  } else if (ocrQuality === 'LOW') {
    reasons.push(`OCR quality: LOW (${ocrConfidence}%)`);
  } else {
    reasons.push('OCR failed - relying on AI vision analysis');
  }

  if (signals.hasAmount) {
    score += 20;
    reasons.push(`Amount: ₹${signals.extractedAmount}`);
  } else {
    reasons.push('No amount detected (-20)');
  }

  if (signals.hasDate) {
    score += 15;
    reasons.push(`Date: ${signals.extractedDate}`);
  } else {
    reasons.push('No date (-15)');
  }

  if (signals.hasTransactionRef) {
    score += 30;
    reasons.push(`Transaction ref: ${signals.extractedTransactionRef}`);
  } else {
    reasons.push('No transaction reference (-30)');
  }

  if (signals.hasPaymentKeyword || signals.hasBankName) {
    score += 15;
    reasons.push('Payment keywords detected');
  }

  if (aiClassification && aiClassification.confidence > 80) {
    score += 20;
    reasons.push(`AI confidence: ${aiClassification.confidence}% - ${aiClassification.classification}`);
  } else if (aiClassification && aiClassification.confidence > 60) {
    score += 10;
    reasons.push(`AI confidence: ${aiClassification.confidence}%`);
  }

  if (!signals.hasAmount && !signals.hasTransactionRef && ocrQuality !== 'HIGH') {
    score -= 20;
    reasons.push('Critical data missing and low OCR quality (-20)');
  }

  score = Math.max(0, Math.min(100, score));

  const reason = reasons.join('. ');
  return { score, reason };
}

async function updateValidationStatus(
  supabase: any,
  paymentId: string,
  data: any
) {
  const { error } = await supabase
    .from('payment_submissions')
    .update(data)
    .eq('id', paymentId);

  if (error) {
    console.error('Database update error:', error);
    throw new Error('Failed to update validation status');
  }
}
