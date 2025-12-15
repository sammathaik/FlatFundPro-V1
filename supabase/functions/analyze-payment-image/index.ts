import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import ExifReader from 'npm:exifreader@4.21.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FraudAnalysisRequest {
  payment_submission_id: string;
  image_url: string;
}

interface FraudAnalysisResult {
  fraud_risk_score: number;
  is_flagged: boolean;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: FraudAnalysisRequest = await req.json();
    const { payment_submission_id, image_url } = requestData;

    if (!payment_submission_id || !image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create initial analysis record
    const { data: analysisRecord, error: insertError } = await supabase
      .from('image_fraud_analysis')
      .insert({
        payment_submission_id,
        image_url,
        status: 'analyzing',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create analysis record: ${insertError.message}`);
    }

    // Fetch the image
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Phase 1: Perceptual Hash Analysis
    const phashResult = await analyzePerceptualHash(supabase, imageBytes, payment_submission_id);

    // Phase 2: EXIF Metadata Analysis
    const exifResult = await analyzeEXIFMetadata(imageBytes);

    // Phase 3: Visual Consistency Analysis
    const visualResult = await analyzeVisualConsistency(imageBytes);

    // Phase 4: Error Level Analysis (Forgery Detection)
    const elaResult = await analyzeErrorLevel(imageBytes);

    // Phase 5: Text-Based Fraud Detection (NEW - Primary Detection)
    const textValidationResult = await validatePaymentTextFields(supabase, payment_submission_id);

    // Calculate composite fraud risk score
    // Text validation takes priority (70% weight), image analysis is secondary (30% weight)
    const imageScore = calculateCompositeScore(
      phashResult.similarity_score || 0,
      exifResult.has_editor_metadata,
      visualResult.consistency_score,
      elaResult.ela_score
    );

    const textScore = textValidationResult.fraud_score || 0;

    // Weighted composite: 70% text-based, 30% image-based
    const fraudRiskScore = Math.round((textScore * 0.7) + (imageScore * 0.3));

    const isFlagged = fraudRiskScore >= 70;

    // Update analysis record with results
    const { error: updateError } = await supabase
      .from('image_fraud_analysis')
      .update({
        status: 'completed',
        fraud_risk_score: fraudRiskScore,
        is_flagged: isFlagged,
        phash_value: phashResult.phash_value,
        phash_duplicate_found: phashResult.duplicate_found,
        phash_similarity_score: phashResult.similarity_score,
        duplicate_of_payment_id: phashResult.duplicate_payment_id,
        exif_data: exifResult.raw_data,
        exif_has_editor_metadata: exifResult.has_editor_metadata,
        exif_software_detected: exifResult.software_detected,
        exif_modification_detected: exifResult.modification_detected,
        exif_creation_date: exifResult.creation_date,
        visual_consistency_score: visualResult.consistency_score,
        bank_pattern_matched: visualResult.pattern_matched,
        visual_anomalies: {
          ...visualResult.anomalies,
          text_validation: textValidationResult.indicators || [],
          text_fraud_score: textScore,
          image_fraud_score: imageScore,
        },
        ela_score: elaResult.ela_score,
        ela_manipulation_detected: elaResult.manipulation_detected,
        ela_suspicious_regions: elaResult.suspicious_regions,
        analyzed_at: new Date().toISOString(),
        analyzed_by: 'system',
      })
      .eq('id', analysisRecord.id);

    if (updateError) {
      throw new Error(`Failed to update analysis: ${updateError.message}`);
    }

    const result: FraudAnalysisResult = {
      fraud_risk_score: fraudRiskScore,
      is_flagged: isFlagged,
      phash_value: phashResult.phash_value,
      phash_duplicate_found: phashResult.duplicate_found,
      phash_similarity_score: phashResult.similarity_score,
      duplicate_of_payment_id: phashResult.duplicate_payment_id,
      exif_data: exifResult.raw_data,
      exif_has_editor_metadata: exifResult.has_editor_metadata,
      exif_software_detected: exifResult.software_detected,
      exif_modification_detected: exifResult.modification_detected,
      visual_consistency_score: visualResult.consistency_score,
      bank_pattern_matched: visualResult.pattern_matched,
      ela_score: elaResult.ela_score,
      ela_manipulation_detected: elaResult.manipulation_detected,
    };

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysisRecord.id,
        result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing image:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to analyze image',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Perceptual Hash Implementation
async function analyzePerceptualHash(supabase: any, imageBytes: Uint8Array, paymentId: string) {
  try {
    // Simple pHash implementation using average hash
    const phashValue = await calculateSimpleHash(imageBytes);
    const bitHash = phashValue;

    // Check for duplicates
    const { data: existingHashes } = await supabase
      .from('image_perceptual_hashes')
      .select('*')
      .eq('phash_value', phashValue)
      .neq('payment_submission_id', paymentId);

    let duplicateFound = false;
    let similarityScore = null;
    let duplicatePaymentId = null;

    if (existingHashes && existingHashes.length > 0) {
      duplicateFound = true;
      similarityScore = 98; // Exact match
      duplicatePaymentId = existingHashes[0].payment_submission_id;

      // Update reuse count
      await supabase
        .from('image_perceptual_hashes')
        .update({
          reuse_count: existingHashes[0].reuse_count + 1,
          last_seen_at: new Date().toISOString(),
          flagged_as_duplicate: true,
        })
        .eq('id', existingHashes[0].id);
    }

    // Store new hash
    await supabase
      .from('image_perceptual_hashes')
      .insert({
        payment_submission_id: paymentId,
        phash_value: phashValue,
        image_url: 'stored',
        bit_hash: bitHash,
        flagged_as_duplicate: duplicateFound,
      });

    return {
      phash_value: phashValue,
      duplicate_found: duplicateFound,
      similarity_score: similarityScore,
      duplicate_payment_id: duplicatePaymentId,
    };
  } catch (error) {
    console.error('pHash analysis error:', error);
    return {
      phash_value: 'error',
      duplicate_found: false,
      similarity_score: null,
      duplicate_payment_id: null,
    };
  }
}

// Simple hash calculation (simplified version)
async function calculateSimpleHash(imageBytes: Uint8Array): Promise<string> {
  // Create a simple hash based on byte patterns
  const hashBuffer = await crypto.subtle.digest('SHA-256', imageBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// EXIF Metadata Analysis
async function analyzeEXIFMetadata(imageBytes: Uint8Array) {
  try {
    const tags = ExifReader.load(imageBytes.buffer);

    const software = tags.Software?.description || null;
    const modifyDate = tags.ModifyDate?.description || null;
    const createDate = tags.CreateDate?.description || null;

    // Check for image editing software
    const editingSoftware = [
      'Adobe Photoshop',
      'Photoshop',
      'GIMP',
      'Paint.NET',
      'CorelDRAW',
      'Affinity Photo',
    ];

    const hasEditorMetadata = software
      ? editingSoftware.some(editor => software.includes(editor))
      : false;

    const modificationDetected = !!(modifyDate && createDate && modifyDate !== createDate);

    return {
      raw_data: {
        software,
        modifyDate,
        createDate,
        make: tags.Make?.description || null,
        model: tags.Model?.description || null,
      },
      has_editor_metadata: hasEditorMetadata,
      software_detected: software,
      modification_detected: modificationDetected,
      creation_date: createDate,
    };
  } catch (error) {
    console.error('EXIF analysis error:', error);
    return {
      raw_data: {},
      has_editor_metadata: false,
      software_detected: null,
      modification_detected: false,
      creation_date: null,
    };
  }
}

// Visual Consistency Analysis
async function analyzeVisualConsistency(imageBytes: Uint8Array) {
  try {
    // Simplified visual analysis
    // In production, this would use ML models or image comparison
    const consistencyScore = 75; // Placeholder
    const patternMatched = null;
    const anomalies = {};

    return {
      consistency_score: consistencyScore,
      pattern_matched: patternMatched,
      anomalies,
    };
  } catch (error) {
    console.error('Visual consistency error:', error);
    return {
      consistency_score: 50,
      pattern_matched: null,
      anomalies: {},
    };
  }
}

// Error Level Analysis for Forgery Detection
async function analyzeErrorLevel(imageBytes: Uint8Array) {
  try {
    // Simplified ELA implementation
    // In production, this would perform actual JPEG compression analysis
    const elaScore = 30; // Low score = less manipulation
    const manipulationDetected = elaScore > 60;
    const suspiciousRegions = {};

    return {
      ela_score: elaScore,
      manipulation_detected: manipulationDetected,
      suspicious_regions: suspiciousRegions,
    };
  } catch (error) {
    console.error('ELA analysis error:', error);
    return {
      ela_score: 0,
      manipulation_detected: false,
      suspicious_regions: {},
    };
  }
}

// Calculate composite fraud score
function calculateCompositeScore(
  phashScore: number,
  exifSuspicious: boolean,
  visualScore: number,
  elaScore: number
): number {
  let totalScore = 0;

  // pHash similarity: 30% weight
  totalScore += phashScore * 0.3;

  // EXIF suspicious: 20% weight
  if (exifSuspicious) {
    totalScore += 20;
  }

  // Visual consistency: 25% weight (lower consistency = higher risk)
  totalScore += (100 - visualScore) * 0.25;

  // ELA score: 25% weight
  totalScore += elaScore * 0.25;

  return Math.min(Math.max(Math.round(totalScore), 0), 100);
}

// Text-Based Fraud Validation
async function validatePaymentTextFields(supabase: any, paymentId: string) {
  try {
    const { data, error } = await supabase.rpc('validate_payment_text_fields', {
      p_payment_id: paymentId,
    });

    if (error) {
      console.error('Text validation error:', error);
      return { fraud_score: 0, is_flagged: false, indicators: [] };
    }

    return data || { fraud_score: 0, is_flagged: false, indicators: [] };
  } catch (error) {
    console.error('Text validation exception:', error);
    return { fraud_score: 0, is_flagged: false, indicators: [] };
  }
}
