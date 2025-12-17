// Manual validation trigger test
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

const paymentId = 'ff80edbf-ecb2-47d6-92d4-6f723cd6f055';
const fileUrl = 'https://rjiesmcmdfoavggkhasn.supabase.co/storage/v1/object/public/payment-screenshots/1765952549926_09a217b4-c757-43c3-b2e4-ac3ff4ff014e.jpeg';
const fileType = 'image/jpeg';

console.log('🔍 Triggering validation for payment:', paymentId);
console.log('📄 Image URL:', fileUrl);
console.log('');

async function triggerValidation() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/validate-payment-proof`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_submission_id: paymentId,
          file_url: fileUrl,
          file_type: fileType,
        }),
      }
    );

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('\n✅ Validation Result:');
    console.log(JSON.stringify(result, null, 2));

    // Now check the database to see what was updated
    console.log('\n\n📊 Checking database for updated fields...\n');

    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_submissions?id=eq.${paymentId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const dbData = await dbResponse.json();

    if (dbData && dbData[0]) {
      const payment = dbData[0];
      console.log('VALIDATION FIELDS AFTER PROCESSING:');
      console.log('═══════════════════════════════════════');
      console.log('✓ validation_status:', payment.validation_status);
      console.log('✓ validation_confidence_score:', payment.validation_confidence_score);
      console.log('✓ validation_reason:', payment.validation_reason);
      console.log('✓ validation_performed_at:', payment.validation_performed_at);
      console.log('');
      console.log('EXTRACTED DATA FROM IMAGE:');
      console.log('═══════════════════════════════════════');
      console.log('✓ extracted_amount:', payment.extracted_amount);
      console.log('✓ extracted_date:', payment.extracted_date);
      console.log('✓ extracted_transaction_ref:', payment.extracted_transaction_ref);
      console.log('✓ payment_platform:', payment.payment_platform);
      console.log('');
      console.log('OCR TEXT (first 500 chars):');
      console.log('═══════════════════════════════════════');
      console.log(payment.ocr_text ? payment.ocr_text.substring(0, 500) : 'null');
      console.log('');
      console.log('AI CLASSIFICATION:');
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(payment.ai_classification, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

triggerValidation();
