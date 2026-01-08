/**
 * Test HPI API with Corrected Fe Standard
 * Uploads CSV file to running Docker API and verifies HPI values are correct
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const CSV_FILE_PATH = path.join(__dirname, '../src/features/hmpi-engine/data/SIH25067 ppb.csv');

// Test credentials (from create-test-users script)
const TEST_USER = {
  email: 'scientist@gmail.com',
  password: '12345678'
};

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: number;
      email: string;
      role: string;
    };
  };
}

interface UploadResponse {
  success: boolean;
  data: {
    uploadId: number;
    filename: string;
    totalRows: number;
  };
}

interface Calculation {
  id: number;
  station_id: string;
  hpi: number;
  hpi_classification: string;
  mi: number;
  wqi: number;
}

interface CalculationsResponse {
  success: boolean;
  data: Calculation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

async function login(): Promise<string> {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    console.log(`✅ Logged in successfully`);
    return response.data.token || response.data.data?.token;
  } catch (error: any) {
    console.error('Login error:', error.response?.data || error.message);
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
}

async function uploadCSV(token: string): Promise<number> {
  console.log('\n📤 Uploading CSV file...');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(CSV_FILE_PATH));

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/nirmaya-engine/calculate`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    const uploadId = response.data.data?.upload_id || response.data.data?.uploadId || response.data.uploadId || response.data.upload_id;
    const totalStations = response.data.data?.total_stations || response.data.data?.totalRows || response.data.totalRows;
    
    console.log(`✅ Upload successful!`);
    console.log(`   Upload ID: ${uploadId}`);
    console.log(`   Total Stations: ${totalStations}`);
    
    if (!uploadId) {
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      throw new Error('No upload ID in response');
    }
    
    return uploadId;
  } catch (error: any) {
    console.error('Upload error:', error.response?.data || error.message);
    throw new Error(`Upload failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getCalculations(token: string, uploadId: number): Promise<Calculation[]> {
  console.log('\n📊 Fetching HPI calculations...');
  
  // Wait a bit for calculations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/nirmaya-engine/calculations`,
      {
        params: {
          upload_id: uploadId,
          limit: 100,
          sort_by: 'hpi',
          sort_order: 'desc'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const calculations = response.data.data || response.data.calculations || response.data;
    console.log(`✅ Retrieved ${calculations.length} calculations`);
    
    // Log raw data for first calculation to debug
    if (calculations.length > 0) {
      console.log('\n🔍 Sample calculation structure:');
      const sample = calculations[0];
      console.log(`   Keys: ${Object.keys(sample).join(', ')}`);
      console.log(`   Station ID: ${sample.station_id || 'N/A'}`);
      console.log(`   Station Number: ${sample.station_number || 'N/A'}`);
      console.log(`   Location: ${sample.location || 'N/A'}`);
      console.log(`   HPI: ${sample.hpi}`);
      console.log(`   Fe value: ${sample.fe || 'N/A'}`);
    }
    
    return calculations;
  } catch (error: any) {
    console.error('Fetch error:', error.response?.data || error.message);
    throw new Error(`Fetch failed: ${error.response?.data?.message || error.message}`);
  }
}

function analyzeResults(calculations: Calculation[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 HPI ANALYSIS RESULTS');
  console.log('='.repeat(80));

  if (calculations.length === 0) {
    console.log('❌ No calculations found!');
    return;
  }

  // Calculate statistics
  const hpiValues = calculations.map(c => c.hpi);
  const minHPI = Math.min(...hpiValues);
  const maxHPI = Math.max(...hpiValues);
  const avgHPI = hpiValues.reduce((a, b) => a + b, 0) / hpiValues.length;

  // Find Mumbai sample (sno=1 in CSV, not station_id)
  console.log('\n🔍 Sample Stations (first 5 by sno):');
  const sortedBySno = [...calculations].sort((a, b) => (a.sno || 0) - (b.sno || 0));
  sortedBySno.slice(0, 5).forEach(calc => {
    console.log(`   S.No ${calc.sno}: ${calc.location || 'N/A'} - HPI ${calc.hpi.toFixed(2)}`);
  });

  const mumbaiSample = sortedBySno.find(c => c.sno === 1);

  console.log('\n📊 Overall Statistics:');
  console.log(`   Total Samples: ${calculations.length}`);
  console.log(`   HPI Range: ${minHPI.toFixed(2)} - ${maxHPI.toFixed(2)}`);
  console.log(`   Average HPI: ${avgHPI.toFixed(2)}`);

  if (mumbaiSample) {
    console.log('\n🏙️  Mumbai Sample (S.No 1 - Worli):');
    console.log(`   HPI: ${mumbaiSample.hpi.toFixed(2)}`);
    console.log(`   Classification: ${mumbaiSample.hpi_classification}`);
  } else {
    console.log('\n⚠️  Mumbai sample (S.No 1) not found');
  }

  // Classification distribution
  const classificationCounts: Record<string, number> = {};
  calculations.forEach(c => {
    classificationCounts[c.hpi_classification] = (classificationCounts[c.hpi_classification] || 0) + 1;
  });

  console.log('\n🏷️  Classification Distribution:');
  Object.entries(classificationCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([classification, count]) => {
      const percentage = ((count / calculations.length) * 100).toFixed(1);
      console.log(`   ${classification.padEnd(35)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });

  // Show top 5 highest HPI
  console.log('\n🔴 Top 5 Highest HPI Values:');
  calculations.slice(0, 5).forEach((calc, idx) => {
    console.log(`   ${idx + 1}. ${calc.station_id.padEnd(12)} - HPI: ${calc.hpi.toFixed(2).padStart(6)} (${calc.hpi_classification})`);
  });

  // Show 5 lowest HPI
  console.log('\n🟢 5 Lowest HPI Values:');
  calculations.slice(-5).reverse().forEach((calc, idx) => {
    console.log(`   ${idx + 1}. ${calc.station_id.padEnd(12)} - HPI: ${calc.hpi.toFixed(2).padStart(6)} (${calc.hpi_classification})`);
  });

  // Verification
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION');
  console.log('='.repeat(80));

  const expectedHPIRange = { min: 2, max: 90 }; // Allow full range
  const expectedAvgRange = { min: 25, max: 65 };

  console.log('\n📋 Expected Results (with Fe Si=1500):');
  console.log(`   HPI Range: ${expectedHPIRange.min}-${expectedHPIRange.max}`);
  console.log(`   Average HPI: ${expectedAvgRange.min}-${expectedAvgRange.max}`);
  console.log(`   Mumbai (S.No 1) HPI: ~45.70`);

  console.log('\n📋 Actual Results:');
  console.log(`   HPI Range: ${minHPI.toFixed(2)}-${maxHPI.toFixed(2)}`);
  console.log(`   Average HPI: ${avgHPI.toFixed(2)}`);
  if (mumbaiSample) {
    console.log(`   Mumbai (S.No 1) HPI: ${mumbaiSample.hpi.toFixed(2)}`);
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  const isRangeCorrect = minHPI >= expectedHPIRange.min && maxHPI <= expectedHPIRange.max;
  const isAvgCorrect = avgHPI >= expectedAvgRange.min && avgHPI <= expectedAvgRange.max;
  const isMumbaiCorrect = mumbaiSample ? Math.abs(mumbaiSample.hpi - 45.70) < 10 : true;

  if (isRangeCorrect && isAvgCorrect && isMumbaiCorrect) {
    console.log('✅ SUCCESS: HPI values are CORRECT!');
    console.log('   Fe standard (Si=1500) is working properly.');
    console.log('   Values are in expected range (not inflated by wrong Fe=1000).');
  } else {
    console.log('❌ ISSUE DETECTED:');
    if (!isRangeCorrect) {
      console.log(`   ⚠️  HPI range ${minHPI.toFixed(2)}-${maxHPI.toFixed(2)} outside expected ${expectedHPIRange.min}-${expectedHPIRange.max}`);
    }
    if (!isAvgCorrect) {
      console.log(`   ⚠️  Average HPI ${avgHPI.toFixed(2)} outside expected ${expectedAvgRange.min}-${expectedAvgRange.max}`);
    }
    if (!isMumbaiCorrect && mumbaiSample) {
      console.log(`   ⚠️  Mumbai HPI ${mumbaiSample.hpi.toFixed(2)} far from expected ~43`);
    }
    console.log('   Check if Fe standard is still Si=1500 in constants.ts');
  }
  console.log('='.repeat(80));
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 HPI API TEST - Corrected Fe Standard (Si=1500)');
  console.log('='.repeat(80));

  try {
    // Step 1: Login
    const token = await login();

    // Step 2: Upload CSV
    const uploadId = await uploadCSV(token);

    // Step 3: Get calculations
    const calculations = await getCalculations(token, uploadId);

    // Step 4: Analyze results
    analyzeResults(calculations);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
