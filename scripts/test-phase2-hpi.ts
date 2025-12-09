/**
 * Phase 2 Verification - HPI Calculator Test
 * Tests that HPI calculation matches Flutter reference exactly
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';

console.log('\n' + '█'.repeat(80));
console.log('PHASE 2 VERIFICATION - HPI Calculator Test');
console.log('Testing against Flutter reference test case');
console.log('█'.repeat(80) + '\n');

// Test case from Flutter hpi/test_cases.dart
const flutterTestCase = {
  As: 0.048,
  Cu: 2.54,
  Zn: 43.89,
  Hg: 2.83,
  Cd: 0.06,
  Ni: 0.095,
  Pb: 0.215,
};

// Expected values from Flutter
const expectedHPI = 146.33519;
const expectedClassification = 'Unsuitable - Critical pollution';

// Expected Wi values (from Flutter test case)
const expectedWi = {
  As: 0.020,        // 1/50 = 0.02
  Cu: 0.000666667,  // 1/1500 ≈ 0.000666667
  Zn: 0.0000666667, // 1/15000 ≈ 0.0000666667
  Hg: 0.5,          // 1/2 = 0.5
  Cd: 0.2,          // 1/5 = 0.2
  Ni: 0.0142857,    // 1/70 ≈ 0.0142857
  Pb: 0.1,          // 1/10 = 0.1
};

// Expected Qi values (from Flutter test case)
const expectedQi = {
  As: 24.88,        // (|0.048-10|/(50-10))*100 = 24.88
  Cu: 3.273103,     // (|2.54-50|/(1500-50))*100 ≈ 3.273103
  Zn: 49.561,       // (|43.89-5000|/(15000-5000))*100 = 49.561
  Hg: 183.0,        // (|2.83-1|/(2-1))*100 = 183
  Cd: 147.0,        // (|0.06-3|/(5-3))*100 = 147
  Ni: 39.81,        // (|0.095-20|/(70-20))*100 = 39.81
  Pb: 2.15,         // (|0.215-0|/(10-0))*100 = 2.15
};

console.log('Input Data (Flutter Test Case):');
console.log('-'.repeat(80));
console.log('Metal\tMi (ppb)\tSi (ppb)\tIi (ppb)');
console.log('As\t0.048\t\t50\t\t10');
console.log('Cu\t2.54\t\t1500\t\t50');
console.log('Zn\t43.89\t\t15000\t\t5000');
console.log('Hg\t2.83\t\t2\t\t1');
console.log('Cd\t0.06\t\t5\t\t3');
console.log('Ni\t0.095\t\t70\t\t20');
console.log('Pb\t0.215\t\t10\t\t0');
console.log();

// Calculate HPI
const result = HPICalculatorService.calculate(flutterTestCase);

if (!result) {
  console.error('❌ FAILED: Calculator returned null');
  process.exit(1);
}

console.log('Calculated Values:');
console.log('-'.repeat(80));
console.log('Metal\tWi\t\t\tQi\t\t\tWiQi');
for (const metal of Object.keys(flutterTestCase)) {
  const wi = result.unitWeights![metal];
  const qi = result.subIndices![metal];
  const wiqi = result.contributions![metal];
  console.log(`${metal}\t${wi.toFixed(10)}\t${qi.toFixed(10)}\t${wiqi.toFixed(10)}`);
}
console.log();

console.log('Sums:');
console.log('-'.repeat(80));
console.log(`Σ Wi   = ${result.sumWi!.toFixed(10)}`);
console.log(`Σ WiQi = ${result.sumWiQi!.toFixed(10)}`);
console.log();

console.log('Final HPI:');
console.log('-'.repeat(80));
console.log(`HPI = Σ(WiQi) / Σ(Wi)`);
console.log(`HPI = ${result.sumWiQi!.toFixed(10)} / ${result.sumWi!.toFixed(10)}`);
console.log(`HPI = ${result.hpi.toFixed(5)}`);
console.log();

console.log('Classification:');
console.log('-'.repeat(80));
console.log(`Result: ${result.classification}`);
console.log();

// Verification
console.log('VERIFICATION:');
console.log('='.repeat(80));

let allPassed = true;

// Check HPI value (allow 0.01 tolerance)
const hpiDiff = Math.abs(result.hpi - expectedHPI);
if (hpiDiff < 0.01) {
  console.log(`✅ HPI Value: ${result.hpi.toFixed(5)} (Expected: ${expectedHPI.toFixed(5)}, Diff: ${hpiDiff.toFixed(5)})`);
} else {
  console.log(`❌ HPI Value: ${result.hpi.toFixed(5)} (Expected: ${expectedHPI.toFixed(5)}, Diff: ${hpiDiff.toFixed(5)})`);
  allPassed = false;
}

// Check classification
if (result.classification === expectedClassification) {
  console.log(`✅ Classification: "${result.classification}"`);
} else {
  console.log(`❌ Classification: "${result.classification}" (Expected: "${expectedClassification}")`);
  allPassed = false;
}

// Check metals analyzed
const expectedMetals = Object.keys(flutterTestCase).sort();
const actualMetals = result.metalsAnalyzed.sort();
if (JSON.stringify(expectedMetals) === JSON.stringify(actualMetals)) {
  console.log(`✅ Metals Analyzed: ${actualMetals.join(', ')}`);
} else {
  console.log(`❌ Metals Analyzed: ${actualMetals.join(', ')} (Expected: ${expectedMetals.join(', ')})`);
  allPassed = false;
}

// Check Wi values (sample check for critical metals)
console.log();
console.log('Wi Values Verification:');
const criticalMetals = ['Hg', 'Cd', 'Pb', 'As'];
for (const metal of criticalMetals) {
  const actualWi = result.unitWeights![metal];
  const expected = expectedWi[metal as keyof typeof expectedWi];
  const diff = Math.abs(actualWi - expected);
  if (diff < 0.001) {
    console.log(`  ✅ ${metal}: ${actualWi.toFixed(6)} (Expected: ${expected.toFixed(6)})`);
  } else {
    console.log(`  ❌ ${metal}: ${actualWi.toFixed(6)} (Expected: ${expected.toFixed(6)}, Diff: ${diff.toFixed(6)})`);
    allPassed = false;
  }
}

// Check Qi values (sample check for critical metals)
console.log();
console.log('Qi Values Verification:');
for (const metal of criticalMetals) {
  const actualQi = result.subIndices![metal];
  const expected = expectedQi[metal as keyof typeof expectedQi];
  const diff = Math.abs(actualQi - expected);
  if (diff < 0.1) {
    console.log(`  ✅ ${metal}: ${actualQi.toFixed(3)} (Expected: ${expected.toFixed(3)})`);
  } else {
    console.log(`  ❌ ${metal}: ${actualQi.toFixed(3)} (Expected: ${expected.toFixed(3)}, Diff: ${diff.toFixed(3)})`);
    allPassed = false;
  }
}

console.log();
console.log('='.repeat(80));

if (allPassed) {
  console.log('✅ ALL TESTS PASSED - HPI Calculator matches Flutter reference!');
  console.log('='.repeat(80) + '\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Review differences above');
  console.log('='.repeat(80) + '\n');
  process.exit(1);
}
