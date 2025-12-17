#!/usr/bin/env node

const SUPABASE_URL = 'https://rjiesmcmdfoavggkhasn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaWVzbWNtZGZvYXZnZ2toYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDk3OTMsImV4cCI6MjA3ODA4NTc5M30.9WGrZQTdYKe5QGQ6XL7uJthEdyuBtggEer0nPwlT1no';

async function testTestAPIPayment() {
  console.log('🧪 Testing "Test API" payment validation...\n');

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
          payment_submission_id: 'ad2902f9-ac64-4707-8d99-9e2e802c2ebc',
          file_url: 'https://rjiesmcmdfoavggkhasn.supabase.co/storage/v1/object/public/payment-screenshots/1765950285369_693b5af4-55ff-4695-8ae8-a7cdefe3ba64.png',
          file_type: 'image/png',
        }),
      }
    );

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📡 Status: ${response.status}\n`);

    if (!response.ok) {
      console.log('❌ FAILED');
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ SUCCESS\n');
    console.log('📊 Results:');
    console.log('━'.repeat(60));
    console.log(`Validation Status: ${data.validation_status}`);
    console.log(`Confidence Score: ${data.confidence_score}`);
    console.log(`Reason: ${data.reason}\n`);

    // Check OpenAI usage
    const hasAI = data.reason && (
      data.reason.includes('AI high confidence') ||
      data.reason.includes('AI medium confidence')
    );

    console.log('🤖 OpenAI Integration:');
    if (hasAI) {
      console.log('  ✅ OpenAI API KEY is CONFIGURED and WORKING!');
      console.log(`  ✅ AI was successfully called during validation`);
    } else {
      console.log('  ⚠️  OpenAI API KEY is NOT configured');
      console.log('  ℹ️  System is using rule-based detection only');
      console.log('\n  To enable AI classification (recommended):');
      console.log('  1. Go to Supabase Dashboard → Edge Functions');
      console.log('  2. Add: OPENAI_API_KEY=sk-your-key-here');
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

testTestAPIPayment();
