import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ClassificationRequest {
  payment_submission_id: string;
  ocr_text: string;
}

interface OpenAIClassificationResponse {
  document_type: string;
  confidence_score: number;
  confidence_level: string;
  payment_method: string | null;
  app_or_bank_name: string | null;
  key_identifiers: Record<string, any>;
  classification_reasoning: string;
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: ClassificationRequest = await req.json();
    const { payment_submission_id, ocr_text } = requestData;

    if (!payment_submission_id || !ocr_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: payment_submission_id and ocr_text' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Track start time for processing metrics
    const startTime = Date.now();

    // Call OpenAI GPT-4 for classification
    const classificationResult = await classifyDocument(openaiApiKey, ocr_text);

    // Calculate processing time
    const processingTimeMs = Date.now() - startTime;

    // Calculate cost (GPT-4-turbo-preview pricing: ~$0.01 per 1K tokens input, ~$0.03 per 1K tokens output)
    // Rough estimation: assume 2 cents per classification on average
    const estimatedCostCents = 2;

    // Store classification result in database
    const { data: classificationRecord, error: insertError } = await supabase
      .from('payment_document_classifications')
      .insert({
        payment_submission_id,
        document_type: classificationResult.document_type,
        confidence_level: classificationResult.confidence_level,
        confidence_score: classificationResult.confidence_score,
        payment_method: classificationResult.payment_method,
        app_or_bank_name: classificationResult.app_or_bank_name,
        key_identifiers: classificationResult.key_identifiers,
        classification_reasoning: classificationResult.classification_reasoning,
        ai_model_used: 'gpt-4-turbo-preview',
        ai_tokens_used: classificationResult.tokens_used || null,
        ai_cost_cents: estimatedCostCents,
        ai_processing_time_ms: processingTimeMs,
        ai_raw_response: classificationResult.raw_response,
        classified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store classification: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        classification_id: classificationRecord.id,
        result: {
          document_type: classificationResult.document_type,
          confidence_level: classificationResult.confidence_level,
          confidence_score: classificationResult.confidence_score,
          payment_method: classificationResult.payment_method,
          app_or_bank_name: classificationResult.app_or_bank_name,
          classification_reasoning: classificationResult.classification_reasoning,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error classifying document:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to classify document',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function classifyDocument(
  apiKey: string,
  ocrText: string
): Promise<OpenAIClassificationResponse & { tokens_used?: number; raw_response: any }> {
  const systemPrompt = `You are a payment document classifier for an apartment maintenance payment system.

Analyze the provided OCR text extracted from a payment screenshot and classify it into ONE of these categories:

1. "UPI payment confirmation" - Screenshots from UPI apps (PhonePe, Google Pay, Paytm, BHIM, etc.)
2. "Bank transfer confirmation" - Online banking screenshots (NEFT, RTGS, IMPS)
3. "Cheque image" - Photos of physical cheques
4. "Cash receipt" - Receipts for cash payments
5. "Non-payment document" - Invoices, bills, random images, or unrelated documents
6. "Unclear or insufficient data" - Blurry, incomplete, or unreadable text

Provide your response as a JSON object with these fields:
- document_type: One of the 6 categories above
- confidence_score: Number from 0-100 indicating confidence
- confidence_level: "High" (80-100), "Medium" (50-79), or "Low" (0-49)
- payment_method: e.g., "UPI", "NEFT", "RTGS", "IMPS", "Cheque", "Cash", or null
- app_or_bank_name: e.g., "PhonePe", "Google Pay", "HDFC Bank", "ICICI", or null
- key_identifiers: JSON object with any transaction IDs, reference numbers, UTR, or other identifiers found
- classification_reasoning: Brief explanation of why you classified it this way

Be conservative with confidence scores. Only use "High" confidence when you're very certain.`;

  const userPrompt = `OCR Text to classify:\n\n${ocrText}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsedResult = JSON.parse(content);

    // Map confidence score to level if not provided
    if (!parsedResult.confidence_level && parsedResult.confidence_score !== undefined) {
      const score = parsedResult.confidence_score;
      parsedResult.confidence_level = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';
    }

    return {
      document_type: parsedResult.document_type || 'Unclear or insufficient data',
      confidence_score: parsedResult.confidence_score || 0,
      confidence_level: parsedResult.confidence_level || 'Low',
      payment_method: parsedResult.payment_method || null,
      app_or_bank_name: parsedResult.app_or_bank_name || null,
      key_identifiers: parsedResult.key_identifiers || {},
      classification_reasoning: parsedResult.classification_reasoning || 'Unable to determine',
      tokens_used: data.usage?.total_tokens,
      raw_response: data,
    };
  } catch (error) {
    console.error('OpenAI classification error:', error);
    // Return a safe fallback classification
    return {
      document_type: 'Unclear or insufficient data',
      confidence_score: 0,
      confidence_level: 'Low',
      payment_method: null,
      app_or_bank_name: null,
      key_identifiers: {},
      classification_reasoning: `Classification failed: ${error.message}`,
      raw_response: { error: error.message },
    };
  }
}
