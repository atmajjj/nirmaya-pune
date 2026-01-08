/**
 * Debug HPI calculation to find where values go wrong
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';
import { METAL_STANDARDS } from '../src/features/hmpi-engine/shared/constants';

console.log('HPI CALCULATION DEBUG');
console.log('====================\n');

// Test case 1: Simple single metal
console.log('TEST 1: Single metal (Fe = 342.33 ppb)');
console.log('Standards: Si=1000, Ii=300');
const test1 = HPICalculatorService.calculate({ Fe: 342.33 });
console.log(`Result: HPI = ${test1?.hpi}`);
console.log(`Expected calculation:`);
console.log(`  Wi = 1/1000 = 0.001`);
console.log(`  Qi = |342.33-300|/(1000-300) × 100 = 42.33/700 × 100 = 6.05`);
console.log(`  WiQi = 0.001 × 6.05 = 0.00605`);
console.log(`  HPI = 0.00605/0.001 = 6.05`);
console.log(`  Actual: ${test1?.subIndices?.Fe?.toFixed(2)}\n`);

// Test case 2: Multiple metals (Mumbai data)
console.log('TEST 2: Mumbai sample (5 metals)');
const mumbai = {
  Fe: 342.33,
  Zn: 106.53,
  Cd: 1.32,
  Cu: 105.39,
  Pb: 33.52
};

const test2 = HPICalculatorService.calculate(mumbai);
console.log(`Result: HPI = ${test2?.hpi}`);
console.log('\nMetal-by-metal breakdown:');

for (const [metal, Mi] of Object.entries(mumbai)) {
  const std = METAL_STANDARDS[metal];
  if (!std) continue;
  
  const { Si, Ii } = std;
  if (Si <= Ii) {
    console.log(`${metal}: SKIPPED (Si=${Si} <= Ii=${Ii})`);
    continue;
  }
  
  const Wi = 1 / Si;
  const Qi = Math.abs(Mi - Ii) / (Si - Ii) * 100;
  const WiQi = Wi * Qi;
  
  console.log(`${metal}: Mi=${Mi}, Si=${Si}, Ii=${Ii}`);
  console.log(`  Wi=${Wi.toFixed(6)}, Qi=${Qi.toFixed(2)}, WiQi=${WiQi.toFixed(6)}`);
}

console.log(`\nExpected HPI (from paper): 22.11`);
console.log(`Actual HPI: ${test2?.hpi}\n`);

// Test case 3: Bulk data sample (from test dataset)
console.log('TEST 3: Bulk data sample (14 metals)');
const bulkSample = {
  Hg: 0.5,
  Cd: 2.5,
  As: 8.0,
  Pb: 15.0,
  Se: 5.0,
  Ni: 25.0,
  Al: 40.0,
  Cr: 60.0,
  Cu: 80.0,
  Mo: 30.0,
  Ag: 50.0,
  Mn: 120.0,
  Fe: 450.0,
  Zn: 3500.0
};

const test3 = HPICalculatorService.calculate(bulkSample);
console.log(`Result: HPI = ${test3?.hpi}`);
console.log(`Metals analyzed: ${test3?.metalsAnalyzed?.length}`);

// Check for problematic values
console.log('\nPotential issues:');
let issues = 0;

for (const [metal, Mi] of Object.entries(bulkSample)) {
  const std = METAL_STANDARDS[metal];
  if (!std) {
    console.log(`❌ ${metal}: No standard found`);
    issues++;
    continue;
  }
  
  const { Si, Ii } = std;
  
  if (Si <= Ii) {
    console.log(`⚠️  ${metal}: Si (${Si}) <= Ii (${Ii}) - WILL BE SKIPPED`);
    issues++;
  }
  
  if (Mi < 0) {
    console.log(`❌ ${metal}: Negative concentration (${Mi})`);
    issues++;
  }
  
  const Qi = Math.abs(Mi - Ii) / (Si - Ii) * 100;
  if (Qi < 0 || !isFinite(Qi)) {
    console.log(`❌ ${metal}: Invalid Qi (${Qi})`);
    issues++;
  }
}

if (issues === 0) {
  console.log('✅ No issues found in calculations');
} else {
  console.log(`\n❌ Found ${issues} issue(s) that may affect HPI calculation`);
}

console.log('\n' + '='.repeat(60));
console.log('COMMON ISSUES TO CHECK:');
console.log('='.repeat(60));
console.log('1. Mo: Si=70, Ii=70 → Division by zero (gets skipped)');
console.log('2. Units: Ensure all values in ppb (µg/L), not mg/L');
console.log('3. Missing metals: Metals without standards get skipped');
console.log('4. Si <= Ii: These metals cannot be calculated');
console.log('5. Data parsing: CSV parsing errors can give wrong values');
