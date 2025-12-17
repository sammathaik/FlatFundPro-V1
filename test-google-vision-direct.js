/**
 * Direct Google Vision API Test
 * This script tests the Google Vision API directly using a test image
 */

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'YOUR_API_KEY_HERE';

// Simple 1x1 white pixel PNG (base64 encoded)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testGoogleVisionAPI() {
  console.log('🔍 Testing Google Vision API...\n');

  if (!GOOGLE_VISION_API_KEY || GOOGLE_VISION_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Error: GOOGLE_VISION_API_KEY not set');
    console.log('Please set it in your .env file or pass it as an environment variable');
    process.exit(1);
  }

  try {
    console.log('📡 Sending request to Google Vision API...');

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: TEST_IMAGE_BASE64,
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

    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error Response:');
      console.error(JSON.stringify(data, null, 2));

      if (data.error) {
        console.error(`\n❌ Error: ${data.error.message}`);
        console.error(`Status: ${data.error.status}`);

        if (data.error.message.includes('API key not valid')) {
          console.error('\n💡 Solution: Check that your API key is correct');
        } else if (data.error.message.includes('disabled')) {
          console.error('\n💡 Solution: Enable the Cloud Vision API in Google Cloud Console');
        } else if (data.error.message.includes('billing')) {
          console.error('\n💡 Solution: Enable billing on your Google Cloud project');
        }
      }

      process.exit(1);
    }

    console.log('✅ Google Vision API is working correctly!');
    console.log('\nAPI Response (first 500 chars):');
    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');

    console.log('\n🎉 Success! The API key is configured correctly.');
    console.log('You can now use the OCR validation system in your app.');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);

    if (error.message.includes('fetch')) {
      console.error('\n💡 Network error - check your internet connection');
    }

    process.exit(1);
  }
}

testGoogleVisionAPI();
