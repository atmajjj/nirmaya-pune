/**
 * Phase 4: WQI Calculator Verification Test
 * 
 * Tests WQI calculator against Flutter test case (Brown et al., 1972 method)
 * 
 * Expected WQI: 15.24 for Site 1
 */

import { WQICalculatorService } from '../src/features/hmpi-engine/services/wqi-calculator.service';

console.log('='.repeat(70));
console.log('PHASE 4: WQI CALCULATOR VERIFICATION TEST');
console.log('Brown et al. (1972) Method');
console.log('='.repeat(70));
console.log('');

// Site 1 measured values from Flutter test case
const site1Params = {
  'pH': 7.9,
  'EC': 100.33,
  'TDS': 67.22,
  'TH': 40.67,
  'Ca': 55.61,
  'Mg': 6.48,
  'Fe': 0.05,
  'F': 0.02,
  'Turbidity': 1.3,  // Use 'Turbidity' instead of 'Turb' to match our constants
};

// Expected values from Flutter test_cases.dart
const expectedInvSn = {
  'pH': 0.117647059,
  'EC': 0.003333333,
  'TDS': 0.002,
  'TH': 0.003333333,
  'Ca': 0.013333333,
  'Mg': 0.033333333,
  'Fe': 3.333333333,
  'F': 1.0,
  'Turb': 0.2,
};

const expectedSumInvSn = 4.706313725;
const expectedK = 0.21248052;

const expectedWi = {
  'pH': 0.02499771,
  'EC': 0.00070827,
  'TDS': 0.00042496,
  'TH': 0.00070827,
  'Ca': 0.00283307,
  'Mg': 0.00708285,
  'Fe': 0.70826841,
  'F': 0.21248052,
  'Turb': 0.04249610,
};

const expectedWQI = 15.24;

console.log('INPUT DATA (Site 1):');
console.log('-'.repeat(70));
console.log('Parameter\tVn (measured)');
for (const [param, vn] of Object.entries(site1Params)) {
  console.log(`${param}\t\t${vn}`);
}
console.log('');

// Calculate WQI
const result = WQICalculatorService.calculate(site1Params);

if (!result) {
  console.error('❌ ERROR: WQI calculation returned null');
  process.exit(1);
}

console.log('STEP 1 & 2: Calculate invSn = 1/Sn and sum');
console.log('-'.repeat(70));
console.log('Parameter\tCalculated\tExpected\tDiff');

let allInvSnMatch = true;
for (const param of result.paramsAnalyzed) {
  const calculated = result.invSn![param];
  // Map Turbidity back to Turb for expected values lookup
  const expectedKey = param === 'Turbidity' ? 'Turb' : param;
  const expected = expectedInvSn[expectedKey as keyof typeof expectedInvSn];
  
  if (!expected) {
    console.log(`${param}\t\t${calculated?.toFixed(9) || 'N/A'}\tN/A\t\tN/A ⚠️`);
    continue;
  }
  
  const diff = Math.abs(calculated - expected);
  const match = diff < 0.000001;
  
  if (!match) allInvSnMatch = false;
  
  console.log(`${param}\t\t${calculated.toFixed(9)}\t${expected.toFixed(9)}\t${diff.toFixed(10)} ${match ? '✓' : '✗'}`);
}
console.log('');
console.log(`Sum invSn: ${result.sumInvSn!.toFixed(9)} (expected: ${expectedSumInvSn.toFixed(9)})`);
const sumMatch = Math.abs(result.sumInvSn! - expectedSumInvSn) < 0.000001;
console.log(`Sum match: ${sumMatch ? '✅' : '❌'}`);
console.log('');

console.log('STEP 3: Calculate K = 1 / sumInvSn');
console.log('-'.repeat(70));
console.log(`Calculated K: ${result.k!.toFixed(9)}`);
console.log(`Expected K:   ${expectedK.toFixed(9)}`);
const kDiff = Math.abs(result.k! - expectedK);
const kMatch = kDiff < 0.000001;
console.log(`Difference:   ${kDiff.toFixed(10)} ${kMatch ? '✅' : '❌'}`);
console.log('');

console.log('STEP 4: Calculate Wi = K × invSn');
console.log('-'.repeat(70));
console.log('Parameter\tCalculated\tExpected\tDiff');

let allWiMatch = true;
for (const param of result.paramsAnalyzed) {
  const calculated = result.weights![param];
  // Map Turbidity back to Turb for expected values lookup
  const expectedKey = param === 'Turbidity' ? 'Turb' : param;
  const expected = expectedWi[expectedKey as keyof typeof expectedWi];
  
  if (!expected) {
    console.log(`${param}\t\t${calculated?.toFixed(8) || 'N/A'}\tN/A\t\tN/A ⚠️`);
    continue;
  }
  
  const diff = Math.abs(calculated - expected);
  const match = diff < 0.00001;
  
  if (!match) allWiMatch = false;
  
  console.log(`${param}\t\t${calculated.toFixed(8)}\t${expected.toFixed(8)}\t${diff.toFixed(10)} ${match ? '✓' : '✗'}`);
}
console.log('');
console.log(`Sum of weights: ${result.sumWeights!.toFixed(9)} (should be ≈1.0)`);
const weightsNormalized = Math.abs(result.sumWeights! - 1.0) < 0.00001;
console.log(`Weights normalized: ${weightsNormalized ? '✅' : '❌'}`);
console.log('');

console.log('STEP 5-7: Calculate Qi, WiQi, and WQI');
console.log('-'.repeat(70));
console.log('Parameter\tQi\t\tWiQi');
for (const param of result.paramsAnalyzed) {
  const qi = result.qi![param];
  const wiqi = result.wiQi![param];
  console.log(`${param}\t\t${qi.toFixed(6)}\t${wiqi.toFixed(9)}`);
}
console.log('');

console.log('RESULTS:');
console.log('-'.repeat(70));
console.log(`Calculated WQI: ${result.wqi.toFixed(2)}`);
console.log(`Expected WQI:   ${expectedWQI.toFixed(2)}`);
const wqiDiff = Math.abs(result.wqi - expectedWQI);
console.log(`Difference:     ${wqiDiff.toFixed(4)}`);
console.log('');
console.log(`Classification: ${result.classification}`);
console.log(`Expected:       Excellent`);
console.log('');

console.log('VERIFICATION:');
console.log('-'.repeat(70));

const wqiPassed = wqiDiff < 0.1;

if (wqiPassed) {
  console.log(`✅ WQI calculation PASSED (difference: ${wqiDiff.toFixed(4)})`);
} else {
  console.log(`❌ WQI calculation FAILED (difference: ${wqiDiff.toFixed(4)})`);
}

if (result.classification === 'Excellent') {
  console.log('✅ Classification PASSED');
} else {
  console.log(`❌ Classification FAILED (got: ${result.classification})`);
}

if (allInvSnMatch) {
  console.log('✅ All invSn values PASSED');
} else {
  console.log('❌ Some invSn values FAILED');
}

if (kMatch) {
  console.log('✅ K constant PASSED');
} else {
  console.log('❌ K constant FAILED');
}

if (allWiMatch) {
  console.log('✅ All Wi weights PASSED');
} else {
  console.log('❌ Some Wi weights FAILED');
}

if (weightsNormalized) {
  console.log('✅ Weights normalized PASSED');
} else {
  console.log('❌ Weights normalized FAILED');
}

// Check parameters analyzed
const expectedParamCount = 9; // pH, EC, TDS, TH, Ca, Mg, Fe, F, Turb/Turbidity
const correctCount = result.paramsAnalyzed.length === expectedParamCount;

if (correctCount) {
  console.log(`✅ Parameters analyzed PASSED (${result.paramsAnalyzed.length} params)`);
} else {
  console.log(`❌ Parameters analyzed FAILED (expected ${expectedParamCount}, got ${result.paramsAnalyzed.length})`);
}

console.log('');

// Overall result
const allPassed = wqiPassed && 
                  result.classification === 'Excellent' && 
                  allInvSnMatch &&
                  kMatch &&
                  allWiMatch &&
                  weightsNormalized &&
                  correctCount;

if (allPassed) {
  console.log('✅ ALL TESTS PASSED - WQI calculator implements Brown et al. (1972) method correctly!');
  console.log(`   WQI = ${result.wqi.toFixed(2)} (${result.paramsAnalyzed.length} parameters)`);
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Review differences above');
  process.exit(1);
}
