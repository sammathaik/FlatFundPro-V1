import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TestRequest {
  test_name: string;
  image_url: string;
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
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: TestRequest = await req.json();
    const { test_name, image_url, file_type } = requestData;

    if (!test_name || !image_url || !file_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: test_name, image_url, file_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(image_url);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const buffer = await response.arrayBuffer();
    const imageBuffer = new Uint8Array(buffer);

    let googleVisionText = '';
    let googleVisionConfidence = 0;
    let googleVisionTime = 0;
    let googleVisionError = null;

    if (googleVisionApiKey) {
      console.log('Testing Google Vision API...');
      const startTime = Date.now();
      try {
        const visionResult = await extractTextWithGoogleVision(imageBuffer, googleVisionApiKey);
        googleVisionText = visionResult.text;
        googleVisionConfidence = visionResult.confidence;
        googleVisionTime = Date.now() - startTime;
        console.log(`Google Vision completed in ${googleVisionTime}ms`);
      } catch (error) {
        googleVisionError = error.message;
        googleVisionTime = Date.now() - startTime;
        console.error('Google Vision error:', error);
      }
    } else {
      googleVisionError = 'Google Vision API key not configured';
    }

    console.log('Tesseract OCR skipped (not supported in edge functions)');
    const tesseractStartTime = Date.now();
    let tesseractText = '';
    let tesseractConfidence = 0;
    let tesseractError = 'Tesseract.js is not supported in Deno Edge Functions (requires Web Workers)';

    const bestText = googleVisionText.length > tesseractText.length ? googleVisionText : tesseractText;
    const signals = detectPaymentSignals(bestText);

    let winner = 'tie';
    if (googleVisionError && tesseractError) {
      winner = 'both_failed';
    } else if (googleVisionError) {
      winner = 'tesseract';
    } else if (tesseractError) {
      winner = 'google_vision';
    } else {
      const googleScore = googleVisionText.length * (googleVisionConfidence / 100);
      const tesseractScore = tesseractText.length * (tesseractConfidence / 100);
      if (Math.abs(googleScore - tesseractScore) > 100) {
        winner = googleScore > tesseractScore ? 'google_vision' : 'tesseract';
      }
    }

    const overallConfidence = Math.max(googleVisionConfidence, tesseractConfidence);
    let fraudRiskLevel = 'NONE';
    if (!signals.hasAmount && !signals.hasTransactionRef) {
      fraudRiskLevel = 'HIGH';
    } else if (!signals.hasAmount || !signals.hasTransactionRef) {
      fraudRiskLevel = 'MEDIUM';
    } else if (!signals.hasDate) {
      fraudRiskLevel = 'LOW';
    }

    const { data: testResult, error: insertError } = await supabase
      .from('ocr_test_results')
      .insert({
        test_name,
        image_url,
        file_type,
        google_vision_text: googleVisionText || null,
        google_vision_confidence: googleVisionConfidence || null,
        google_vision_processing_time: googleVisionTime || null,
        google_vision_error: googleVisionError,
        tesseract_text: tesseractText || null,
        tesseract_confidence: tesseractConfidence || null,
        tesseract_processing_time: Date.now() - tesseractStartTime,
        tesseract_error: tesseractError,
        detected_amount: signals.extractedAmount,
        detected_transaction_ref: signals.extractedTransactionRef,
        detected_date: signals.extractedDate,
        detected_payment_type: signals.paymentType,
        detected_platform: signals.platform,
        has_status_keyword: signals.hasStatusKeyword,
        has_payment_keyword: signals.hasPaymentKeyword,
        has_bank_name: signals.hasBankName,
        winner,
        overall_confidence_score: overallConfidence,
        fraud_risk_level: fraudRiskLevel,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save test results');
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_id: testResult.id,
        results: {
          google_vision: {
            text: googleVisionText,
            confidence: googleVisionConfidence,
            processing_time_ms: googleVisionTime,
            error: googleVisionError,
            text_length: googleVisionText.length,
          },
          tesseract: {
            text: tesseractText,
            confidence: tesseractConfidence,
            processing_time_ms: Date.now() - tesseractStartTime,
            error: tesseractError,
            text_length: tesseractText.length,
          },
          fraud_signals: signals,
          comparison: {
            winner,
            overall_confidence: overallConfidence,
            fraud_risk_level: fraudRiskLevel,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OCR test error:', error);
    return new Response(
      JSON.stringify({
        error: 'OCR test failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function extractTextWithGoogleVision(
  imageBuffer: Uint8Array,
  apiKey: string
): Promise<{ text: string; confidence: number }> {
  const base64Image = btoa(String.fromCharCode(...imageBuffer));

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
    const fullText = data.responses[0].textAnnotations[0]?.description || '';
    let avgConfidence = 90;

    if (data.responses[0].fullTextAnnotation) {
      const pages = data.responses[0].fullTextAnnotation.pages || [];
      const allConfidences: number[] = [];

      pages.forEach((page: any) => {
        page.blocks?.forEach((block: any) => {
          block.paragraphs?.forEach((paragraph: any) => {
            paragraph.words?.forEach((word: any) => {
              if (word.confidence) {
                allConfidences.push(word.confidence * 100);
              }
            });
          });
        });
      });

      if (allConfidences.length > 0) {
        avgConfidence = Math.round(
          allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length
        );
      }
    }

    return {
      text: fullText,
      confidence: avgConfidence,
    };
  }

  return {
    text: '',
    confidence: 0,
  };
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
