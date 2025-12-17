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

    // Step 1: Extract text from file
    const extractedText = await extractTextFromFile(file_url, file_type);
    
    if (!extractedText || extractedText.trim().length === 0) {
      await updateValidationStatus(supabase, payment_submission_id, {
        validation_status: 'REJECTED',
        validation_confidence_score: 0,
        validation_reason: 'No text could be extracted from the file. Please upload a clear payment screenshot.',
        ocr_text: '',
        validation_performed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: false,
          validation_status: 'REJECTED',
          message: 'No text could be extracted'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Detect payment signals (rule-based)
    const signals = detectPaymentSignals(extractedText);

    // Step 3: AI Classification (if OpenAI key is available)
    let aiClassification: AIClassification | null = null;
    if (openaiApiKey) {
      aiClassification = await classifyWithAI(extractedText, openaiApiKey);
    }

    // Step 4: Calculate confidence score
    const confidenceResult = calculateConfidenceScore(signals, aiClassification);

    // Step 5: Determine validation status
    let validationStatus = 'MANUAL_REVIEW';
    if (confidenceResult.score >= 70) {
      validationStatus = 'AUTO_APPROVED';
    } else if (confidenceResult.score < 40) {
      validationStatus = 'REJECTED';
    }

    // Step 6: Update database
    await updateValidationStatus(supabase, payment_submission_id, {
      ocr_text: extractedText,
      extracted_amount: signals.extractedAmount,
      extracted_date: signals.extractedDate,
      extracted_transaction_ref: signals.extractedTransactionRef,
      payment_type: signals.paymentType,
      payment_platform: signals.platform,
      validation_status: validationStatus,
      validation_confidence_score: confidenceResult.score,
      validation_reason: confidenceResult.reason,
      ai_classification: aiClassification,
      validation_performed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        validation_status: validationStatus,
        confidence_score: confidenceResult.score,
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

// Extract text from image or PDF
async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const buffer = await response.arrayBuffer();

    if (fileType === 'application/pdf') {
      // For PDF: Try to extract text directly
      // For now, we'll use OCR on PDFs too (Tesseract can handle PDF)
      return await extractTextWithOCR(new Uint8Array(buffer));
    } else {
      // For images: Use OCR
      return await extractTextWithOCR(new Uint8Array(buffer));
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
}

// OCR using Tesseract.js
async function extractTextWithOCR(imageBuffer: Uint8Array): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  }
}

// Detect payment signals using pattern matching
function detectPaymentSignals(text: string): PaymentSignals {
  const textUpper = text.toUpperCase();
  const textLower = text.toLowerCase();

  // Amount detection (INR or ₹)
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

  // Transaction reference detection (UTR/Txn ID)
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

  // Date detection
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

  // Status keywords
  const statusKeywords = ['PAID', 'PAYMENT SUCCESSFUL', 'COMPLETED', 'SUCCESS', 'CREDITED'];
  const hasStatusKeyword = statusKeywords.some(keyword => textUpper.includes(keyword));

  // Payment rail keywords
  const paymentKeywords = [
    'UPI', 'IMPS', 'NEFT', 'RTGS', 'BHIM', 'GOOGLE PAY', 'GPAY', 
    'PHONEPE', 'PAYTM', 'PAYMENT'
  ];
  const hasPaymentKeyword = paymentKeywords.some(keyword => textUpper.includes(keyword));

  // Bank names
  const bankNames = [
    'SBI', 'STATE BANK', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'YES BANK',
    'IDFC', 'BANK OF BARODA', 'BOB', 'PNB', 'PUNJAB NATIONAL', 'CANARA',
    'UNION BANK', 'INDIAN BANK', 'BANK OF INDIA'
  ];
  const hasBankName = bankNames.some(bank => textUpper.includes(bank));

  // Detect payment type
  let paymentType: string | null = null;
  if (textUpper.includes('UPI')) paymentType = 'UPI';
  else if (textUpper.includes('NEFT')) paymentType = 'NEFT';
  else if (textUpper.includes('IMPS')) paymentType = 'IMPS';
  else if (textUpper.includes('RTGS')) paymentType = 'RTGS';
  else if (textUpper.includes('BANK TRANSFER')) paymentType = 'BANK_TRANSFER';

  // Detect platform
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

// AI Classification using OpenAI
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

// Calculate confidence score
function calculateConfidenceScore(
  signals: PaymentSignals,
  aiClassification: AIClassification | null
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Amount found → +20
  if (signals.hasAmount) {
    score += 20;
    reasons.push(`Amount detected: ₹${signals.extractedAmount}`);
  } else {
    reasons.push('No amount detected (-20)');
  }

  // Date found → +15
  if (signals.hasDate) {
    score += 15;
    reasons.push(`Date detected: ${signals.extractedDate}`);
  } else {
    reasons.push('No date detected (-15)');
  }

  // Transaction reference found → +30
  if (signals.hasTransactionRef) {
    score += 30;
    reasons.push(`Transaction reference found: ${signals.extractedTransactionRef}`);
  } else {
    reasons.push('No transaction reference (-30)');
  }

  // Bank/UPI keyword found → +15
  if (signals.hasPaymentKeyword || signals.hasBankName) {
    score += 15;
    reasons.push('Payment keywords detected');
  }

  // AI confidence > 80 → +20
  if (aiClassification && aiClassification.confidence > 80) {
    score += 20;
    reasons.push(`AI high confidence (${aiClassification.confidence}%): ${aiClassification.classification}`);
  } else if (aiClassification && aiClassification.confidence > 60) {
    score += 10;
    reasons.push(`AI medium confidence (${aiClassification.confidence}%)`);
  }

  // Penalty: Missing both amount and transaction ref
  if (!signals.hasAmount && !signals.hasTransactionRef) {
    score -= 30;
    reasons.push('Critical: Missing both amount and transaction reference (-30)');
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  const reason = reasons.join('. ');
  return { score, reason };
}

// Update validation status in database
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
