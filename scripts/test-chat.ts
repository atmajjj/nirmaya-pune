/**
 * Chat API Test Script
 * 
 * Tests the NIRA AI chatbot with 5 questions after login
 * 
 * Usage: npx ts-node scripts/test-chat.ts
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

// Test credentials - update these
const TEST_USER = {
  email: 'harshal@gmail.com',
  password: '12345678',
};

// Test questions for the chatbot
const TEST_QUESTIONS = [
  'Hello, who are you?',
  'What is Nirmaya about?',
  'Can you help me with health information?',
  'What documents do you have access to?',
  'Thank you for your help!',
];

async function testChatAPI() {
  console.log('🚀 Starting Chat API Test\n');
  console.log(`📍 API URL: ${API_BASE_URL}\n`);

  let token: string;

  // Step 1: Login
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(loginData.message || 'Login failed');
    }

    token = loginData.data.token;
    console.log('✅ Login successful!\n');
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }

  // Step 2: Test chat with 5 questions
  let sessionId: number | undefined;

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Question ${i + 1}: "${question}"`);
    console.log('='.repeat(60));

    try {
      const startTime = Date.now();
      
      const chatResponse = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          ...(sessionId && { sessionId }),
        }),
      });

      const chatData = await chatResponse.json();
      const duration = Date.now() - startTime;

      if (!chatResponse.ok) {
        throw new Error(chatData.message || 'Chat failed');
      }

      const data = chatData.data;

      // Save sessionId for conversation continuity
      if (!sessionId) {
        sessionId = data.sessionId;
        console.log(`🆔 Session ID: ${sessionId}`);
      }

      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`\n🤖 NIRA Response:`);
      console.log(`   "${data.assistantMessage.content}"`);

      // Show sources if available
      if (data.assistantMessage.sources && data.assistantMessage.sources.length > 0) {
        console.log(`\n📚 Sources used:`);
        data.assistantMessage.sources.forEach((source: any, idx: number) => {
          console.log(`   ${idx + 1}. ${source.documentName} (score: ${source.score?.toFixed(2) || 'N/A'})`);
        });
      }

    } catch (error: any) {
      console.error(`❌ Chat failed:`, error.message);
    }

    // Small delay between requests
    if (i < TEST_QUESTIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Chat API test completed!');
  console.log('='.repeat(60));
}

// Run the test
testChatAPI().catch(console.error);
