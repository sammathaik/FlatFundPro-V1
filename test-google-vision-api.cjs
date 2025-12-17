/**
 * Test Google Vision API Configuration
 *
 * This script tests if the Google Vision API key is configured
 * in Supabase Edge Functions by making a test API call.
 */

const fs = require('fs');
const path = require('path');

// Load .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length) {
          process.env[key] = values.join('=');
        }
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env file');
  }
}

loadEnv();

// Simple 1x1 pixel white PNG image (smallest valid image)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testGoogleVisionAPI() {
  console.log('🔍 Testing Google Vision API Configuration...\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rjiesmcmdfoavggkhasn.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Anon key found:', anonKey ? 'Yes (' + anonKey.substring(0, 20) + '...)' : 'No');
  console.log('');

  // Test by calling the validate-payment-proof function with a test request
  // Note: We need a valid payment_submission_id, so this is just a connectivity test

  console.log('📋 Google Vision API Configuration Check\n');
  console.log('⚠️  Note: Environment variables in Edge Functions are configured at the Supabase project level');
  console.log('⚠️  They cannot be accessed directly from local scripts\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('To check if GOOGLE_VISION_API_KEY is configured:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn/settings/functions');
  console.log('2. Check "Environment Variables" section');
  console.log('3. Look for: GOOGLE_VISION_API_KEY\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('To test the API key functionality in production:\n');
  console.log('1. Upload a payment screenshot via the app');
  console.log('2. Check the Edge Function logs:');
  console.log('   https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn/logs/edge-functions');
  console.log('3. Look for: "OCR Attempt 1: Google Vision API"\n');

  console.log('Expected log output if Google Vision is working:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('OCR Attempt 1: Google Vision API');
  console.log('OCR Result: {');
  console.log('  quality: "HIGH",');
  console.log('  confidence: 92,');
  console.log('  textLength: 348,');
  console.log('  attempts: 1');
  console.log('}');
  console.log('───────────────────────────────────────────────────────────────\n');

  console.log('Expected log output if Google Vision is NOT configured:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('OCR Attempt 2: Tesseract (fallback)');
  console.log('OCR Result: {');
  console.log('  quality: "MEDIUM" or "LOW",');
  console.log('  confidence: 35-60,');
  console.log('  textLength: <100,');
  console.log('  attempts: 1');
  console.log('}');
  console.log('───────────────────────────────────────────────────────────────\n');

  // Try to make a direct test call to Google Vision API
  // This requires the API key to be provided as an argument

  const apiKeyFromArgs = process.argv[2];

  if (apiKeyFromArgs) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔑 Testing with provided API key...\n');

    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKeyFromArgs}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: testImageBase64,
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
        const errorText = await response.text();
        console.error('❌ Google Vision API Error:', response.status, response.statusText);
        console.error('Response:', errorText);

        if (response.status === 403) {
          console.error('\n⚠️  403 Forbidden - Possible reasons:');
          console.error('  - API key is invalid or expired');
          console.error('  - Cloud Vision API is not enabled for this project');
          console.error('  - API key restrictions may be blocking the request\n');
          console.error('Solutions:');
          console.error('  1. Enable Cloud Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com');
          console.error('  2. Check API key: https://console.cloud.google.com/apis/credentials');
          console.error('  3. Remove API restrictions temporarily for testing');
        } else if (response.status === 400) {
          console.error('\n⚠️  400 Bad Request - Check API key format');
          console.error('API key should start with: AIza...');
        }

        process.exit(1);
      }

      const data = await response.json();

      console.log('✅ SUCCESS: Google Vision API is accessible!\n');
      console.log('API Response:', JSON.stringify(data, null, 2));
      console.log('\n✅ The API key is valid and working');
      console.log('✅ Cloud Vision API is enabled');
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('Next Steps:\n');
      console.log('1. Go to Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn/settings/functions\n');
      console.log('2. Add environment variable:');
      console.log('   Name: GOOGLE_VISION_API_KEY');
      console.log('   Value: ' + apiKeyFromArgs.substring(0, 10) + '...\n');
      console.log('3. The edge function will automatically use Google Vision for OCR');
      console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('❌ Network Error:', error.message);
      console.error('\nPossible reasons:');
      console.error('  - No internet connection');
      console.error('  - API endpoint is unreachable');
      console.error('  - Invalid API key format');
      process.exit(1);
    }
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 To test an API key directly, run:\n');
    console.log('   node test-google-vision-api.js YOUR_API_KEY\n');

    console.log('To get a Google Vision API key:\n');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Create or select a project');
    console.log('3. Enable Cloud Vision API:');
    console.log('   https://console.cloud.google.com/apis/library/vision.googleapis.com');
    console.log('4. Create API key:');
    console.log('   https://console.cloud.google.com/apis/credentials');
    console.log('5. Click "Create Credentials" → "API Key"');
    console.log('6. Copy the key (starts with AIza...)');
    console.log('7. Add it to Supabase Edge Functions environment variables');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('💰 Pricing Information:\n');
    console.log('  - First 1,000 images/month: FREE');
    console.log('  - After 1,000: $1.50 per 1,000 images');
    console.log('  - Typical apartment (100 flats): $0/month (within free tier)');
    console.log('  - Large complex (1000 flats): ~$3/month');
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

testGoogleVisionAPI().catch(console.error);
