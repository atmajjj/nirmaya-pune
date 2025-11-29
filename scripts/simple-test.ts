/**
 * Simple API Test Script
 *
 * Tests basic connectivity and login
 *
 * Usage: npx ts-node scripts/simple-test.ts
 */

const BASE_URL = 'http://localhost:8000/api/v1';

async function simpleTest() {
  try {
    console.log('Testing basic connectivity...');
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.ok) {
      console.log('✅ Server is reachable');
    } else {
      console.log('❌ Server not reachable');
      return;
    }

    // Test login with correct credentials
    console.log('Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'harshal@gmail.com',
        password: '12345678',
      }),
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok) {
      console.log('✅ Login successful');
      console.log(`Response: ${JSON.stringify(loginData)}`);
    } else {
      console.log('❌ Login failed');
      console.log(`Status: ${loginResponse.status}`);
      console.log(`Response: ${JSON.stringify(loginData)}`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

simpleTest();
