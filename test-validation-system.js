#!/usr/bin/env node

/**
 * Payment Validation System Test Suite
 * Tests OCR, rule-based detection, and OpenAI integration
 */

const SUPABASE_URL = 'https://rjiesmcmdfoavggkhasn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaWVzbWNtZGZvYXZnZ2toYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDk3OTMsImV4cCI6MjA3ODA4NTc5M30.9WGrZQTdYKe5QGQ6XL7uJthEdyuBtggEer0nPwlT1no';

async function testValidation(testName, fileUrl, fileType) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('━'.repeat(60));

  const startTime = Date.now();

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
          payment_submission_id: `test-${Date.now()}`,
          file_url: fileUrl,
          file_type: fileType,
        }),
      }
    );

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ FAILED: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log('━'.repeat(60));
    console.log('Validation Status:', data.validation_status);
    console.log('Confidence Score:', data.confidence_score);
    console.log('Reason:', data.reason);

    if (data.extracted_data) {
      console.log('\n📊 Extracted Data:');
      console.log('  Amount:', data.extracted_data.amount ? `₹${data.extracted_data.amount}` : 'Not found');
      console.log('  Date:', data.extracted_data.date || 'Not found');
      console.log('  Transaction Ref:', data.extracted_data.transaction_ref || 'Not found');
      console.log('  Payment Type:', data.extracted_data.payment_type || 'Not found');
      console.log('  Platform:', data.extracted_data.platform || 'Not found');
    }

    // Check if OpenAI was used
    console.log('\n🤖 OpenAI Status:');
    const hasAI = data.reason && (
      data.reason.includes('AI high confidence') ||
      data.reason.includes('AI medium confidence') ||
      data.reason.includes('AI')
    );
    console.log(hasAI ? '  ✅ OpenAI API called' : '  ⚠️  OpenAI NOT used (key not configured or failed)');

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PAYMENT VALIDATION SYSTEM TEST SUITE');
  console.log('='.repeat(60));

  // Test 1: Sample UPI payment (publicly accessible test image)
  await testValidation(
    'Sample UPI Payment Screenshot',
    'https://www.paymentscardsandmobile.com/wp-content/uploads/2017/10/UPI-payment-screenshot.jpg',
    'image/jpeg'
  );

  // Test 2: Invalid file (QR code - no payment info)
  await testValidation(
    'Invalid File - QR Code Only',
    'https://rjiesmcmdfoavggkhasn.supabase.co/storage/v1/object/public/payment-screenshots/1765950285369_693b5af4-55ff-4695-8ae8-a7cdefe3ba64.png',
    'image/png'
  );

  // Test 3: Another test with text content
  await testValidation(
    'Test with Text Content',
    'https://cdn.pixabay.com/photo/2017/10/31/19/05/web-design-2906159_1280.jpg',
    'image/jpeg'
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
  console.log('\n💡 To check OpenAI configuration:');
  console.log('   If you see "⚠️ OpenAI NOT used" for valid images,');
  console.log('   then OPENAI_API_KEY is not configured in Supabase.');
  console.log('\n📝 Next steps:');
  console.log('   1. Go to Supabase Dashboard → Edge Functions');
  console.log('   2. Add environment variable: OPENAI_API_KEY=sk-...');
  console.log('   3. Re-run this test to verify\n');
}

runTests();
