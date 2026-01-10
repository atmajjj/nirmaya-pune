/**
 * Test Gemini API connection
 * Run: ts-node src/features/ai-reports/test-gemini.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.dev') });

async function testGemini() {
  console.log('🧪 Testing Gemini API connection...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('Please add GEMINI_API_KEY to .env.dev file');
    process.exit(1);
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...`);
  console.log('📡 Attempting to connect to Gemini Pro...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = 'Say "Hello, Nirmaya!" in one sentence.';
    console.log(`📝 Sending test prompt: "${prompt}"\n`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ SUCCESS! Gemini API is working!\n');
    console.log('📤 Response:', text);
    console.log('\n🎉 Your Gemini API key is valid and working correctly!');

  } catch (error: any) {
    console.error('❌ ERROR: Failed to connect to Gemini API\n');
    console.error('Error message:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('\n❗ Your API key is invalid.');
      console.error('Please get a new API key from: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('429')) {
      console.error('\n❗ Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      console.error('\n❗ Network error. Please check your internet connection.');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

testGemini();
