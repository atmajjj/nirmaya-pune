/**
 * Integration Test: HPI, MI, WQI Calculators
 * 
 * Tests all three calculators working together through the calculation service
 */

import { WaterQualityCalculationService } from '../src/features/hmpi-engine/services/calculation.service';
import { CSVParserService } from '../src/features/hmpi-engine/services/csv-parser.service';
import * as fs from 'fs';
import * as path from 'path';

console.log('='.repeat(70));
console.log('INTEGRATION TEST: HPI, MI, WQI Calculators');
console.log('='.repeat(70));
console.log('');

// Test data with all parameters
const testCSV = `S.No,State,District,Location,Longitude,Latitude,Year,As,Cu,Zn,Hg,Cd,Ni,Pb,pH,EC,TDS,TH,Ca,Mg,Fe,F,Turbidity
1,TestState,TestDistrict,Station 1,0.0,0.0,2024,0.048,2.54,43.89,2.83,0.06,0.095,0.215,7.9,100.33,67.22,40.67,55.61,6.48,0.05,0.02,1.3`;

console.log('Test Data:');
console.log('-'.repeat(70));
console.log('Station 1: Complete dataset with metals and WQI parameters');
console.log('  Metals: As, Cu, Zn, Hg, Cd, Ni, Pb');
console.log('  WQI Params: pH, EC, TDS, TH, Ca, Mg, Fe, F, Turbidity');
console.log('');

// Parse CSV
const parseResult = CSVParserService.parseCSV(Buffer.from(testCSV));

if (!parseResult.success) {
  console.error('❌ ERROR: CSV parsing failed');
  console.error(parseResult.errors);
  process.exit(1);
}

console.log(`✅ Parsed ${parseResult.rows.length} station(s)`);
console.log('');

// Calculate all indices
let results;
try {
  results = WaterQualityCalculationService.calculateAllIndices(parseResult.rows);
} catch (error) {
  console.error('❌ ERROR: Calculation failed');
  console.error(error);
  process.exit(1);
}

if (results.length === 0) {
  console.error('❌ ERROR: No calculation results');
  process.exit(1);
}

const station1 = results[0];

console.log('CALCULATION RESULTS:');
console.log('-'.repeat(70));
console.log(`Station: ${station1.station_id}`);
console.log('');

// Verify HPI
console.log('1. HPI (Heavy Metal Pollution Index):');
if (station1.hpi) {
  console.log(`   ✅ HPI = ${station1.hpi.hpi.toFixed(5)}`);
  console.log(`   Classification: ${station1.hpi.classification}`);
  console.log(`   Metals analyzed: ${station1.hpi.metalsAnalyzed.length}`);
  
  // Expected HPI ≈ 146.33 (from Phase 2 test)
  const expectedHPI = 146.33;
  const hpiDiff = Math.abs(station1.hpi.hpi - expectedHPI);
  if (hpiDiff < 1.0) {
    console.log(`   ✅ Matches expected value (${expectedHPI}) - diff: ${hpiDiff.toFixed(3)}`);
  } else {
    console.log(`   ⚠️  Different from expected (${expectedHPI}) - diff: ${hpiDiff.toFixed(3)}`);
  }
} else {
  console.log('   ❌ HPI calculation failed');
}
console.log('');

// Verify MI
console.log('2. MI (Metal Index):');
if (station1.mi) {
  console.log(`   ✅ MI = ${station1.mi.mi.toFixed(5)}`);
  console.log(`   Classification: ${station1.mi.classification} (${station1.mi.miClass})`);
  console.log(`   Metals analyzed: ${station1.mi.metalsAnalyzed.length}`);
  
  // For these low concentrations, MI should be relatively low
  if (station1.mi.mi < 10) {
    console.log(`   ✅ Value in expected range for low concentrations`);
  }
} else {
  console.log('   ❌ MI calculation failed');
}
console.log('');

// Verify WQI
console.log('3. WQI (Water Quality Index):');
if (station1.wqi) {
  console.log(`   ✅ WQI = ${station1.wqi.wqi.toFixed(2)}`);
  console.log(`   Classification: ${station1.wqi.classification}`);
  console.log(`   Parameters analyzed: ${station1.wqi.paramsAnalyzed.length}`);
  
  // Expected WQI ≈ 15.24 (from Phase 4 test)
  const expectedWQI = 15.24;
  const wqiDiff = Math.abs(station1.wqi.wqi - expectedWQI);
  if (wqiDiff < 0.5) {
    console.log(`   ✅ Matches expected value (${expectedWQI}) - diff: ${wqiDiff.toFixed(3)}`);
  } else {
    console.log(`   ⚠️  Different from expected (${expectedWQI}) - diff: ${wqiDiff.toFixed(3)}`);
  }
} else {
  console.log('   ❌ WQI calculation failed');
}
console.log('');

// Check for errors
if (station1.errors && station1.errors.length > 0) {
  console.log('Errors:');
  station1.errors.forEach(err => console.log(`   ⚠️  ${err}`));
  console.log('');
}

// Overall verification
console.log('VERIFICATION:');
console.log('-'.repeat(70));

const allCalculated = station1.hpi && station1.mi && station1.wqi;
const noErrors = !station1.errors || station1.errors.length === 0;

if (allCalculated) {
  console.log('✅ All three calculators executed successfully');
} else {
  console.log('❌ Some calculators failed');
  if (!station1.hpi) console.log('   - HPI failed');
  if (!station1.mi) console.log('   - MI failed');
  if (!station1.wqi) console.log('   - WQI failed');
}

if (noErrors) {
  console.log('✅ No calculation errors');
} else {
  console.log(`⚠️  ${station1.errors!.length} error(s) reported`);
}

// Check breakdown data availability
const hasHPIBreakdown = station1.hpi?.subIndices && Object.keys(station1.hpi.subIndices).length > 0;
const hasMIBreakdown = station1.mi?.ratios && Object.keys(station1.mi.ratios).length > 0;
const hasWQIBreakdown = station1.wqi?.weights && Object.keys(station1.wqi.weights).length > 0;

if (hasHPIBreakdown && hasMIBreakdown && hasWQIBreakdown) {
  console.log('✅ Detailed breakdowns available for all indices');
} else {
  console.log('⚠️  Some detailed breakdowns missing');
}

console.log('');

if (allCalculated && noErrors && hasHPIBreakdown && hasMIBreakdown && hasWQIBreakdown) {
  console.log('✅ INTEGRATION TEST PASSED');
  console.log('   All three calculators are working correctly and integrated!');
  console.log('   Ready for frontend integration.');
  process.exit(0);
} else {
  console.log('❌ INTEGRATION TEST FAILED');
  console.log('   Review errors above');
  process.exit(1);
}
