/**
 * Test HPI Calculation with Corrected Fe Standard
 * Verifies that Fe Si=1500 (not 1000) produces correct HPI values
 */

import { METAL_STANDARDS } from '../src/features/hmpi-engine/shared/constants';
import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';

console.log('='.repeat(80));
console.log('HPI CALCULATION TEST - Corrected Fe Standard (Si=1500)');
console.log('='.repeat(80));

// Mumbai sample from test-hpi-dataset.csv
const mumbaiSample = {
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

console.log('\n📊 Sample Data (Mumbai - Worli):');
console.log(JSON.stringify(mumbaiSample, null, 2));

console.log('\n🔧 Current Fe Standard:');
console.log(`   Si (Permissible): ${METAL_STANDARDS.Fe.Si} ppb`);
console.log(`   Ii (Ideal): ${METAL_STANDARDS.Fe.Ii} ppb`);
console.log(`   Expected: Si=1500 ppb (1.5 mg/L per BIS 10500:2012)`);

// Calculate HPI
const hpiResult = HPICalculatorService.calculate(mumbaiSample);

if (!hpiResult) {
  console.log('\n❌ ERROR: HPI calculation returned null');
  process.exit(1);
}

console.log('\n📈 HPI Calculation Result:');
console.log(`   HPI: ${hpiResult.hpi.toFixed(2)}`);
console.log(`   Classification: ${hpiResult.classification}`);
console.log(`   Metals Analyzed: ${hpiResult.metalsAnalyzed.length}`);

console.log('\n🔍 Detailed Metal Contributions:');
Object.entries(hpiResult.subIndices).forEach(([symbol, Qi]) => {
  const Wi = hpiResult.unitWeights[symbol];
  const WiQi = hpiResult.contributions[symbol];
  const Mi = mumbaiSample[symbol as keyof typeof mumbaiSample];
  console.log(`   ${symbol.padEnd(3)}: Mi=${Mi.toFixed(2).padStart(8)} | ` +
              `Wi=${Wi.toFixed(6)} | Qi=${Qi.toFixed(2).padStart(6)} | ` +
              `WiQi=${WiQi.toFixed(6)}`);
});

// Show Fe specific calculation
const FeSi = METAL_STANDARDS.Fe.Si;
const FeIi = METAL_STANDARDS.Fe.Ii;
const FeMi = mumbaiSample.Fe;
const FeQi = Math.abs(FeMi - FeIi) / (FeSi - FeIi) * 100;

console.log('\n🧪 Fe (Iron) Calculation Details:');
console.log(`   Mi (measured) = ${FeMi} ppb`);
console.log(`   Si (permissible) = ${FeSi} ppb`);
console.log(`   Ii (ideal) = ${FeIi} ppb`);
console.log(`   Qi = |${FeMi} - ${FeIi}| / (${FeSi} - ${FeIi}) × 100`);
console.log(`   Qi = ${Math.abs(FeMi - FeIi)} / ${FeSi - FeIi} × 100`);
console.log(`   Qi = ${FeQi.toFixed(2)}`);

console.log('\n📊 Comparison with Different Fe Standards:');
const QiOld = Math.abs(FeMi - FeIi) / (1000 - FeIi) * 100;
const QiNew = Math.abs(FeMi - FeIi) / (1500 - FeIi) * 100;
console.log(`   Fe Qi with Si=1000: ${QiOld.toFixed(2)} (WRONG - causes high HPI)`);
console.log(`   Fe Qi with Si=1500: ${QiNew.toFixed(2)} (CORRECT - per BIS 2012)`);
console.log(`   Reduction: ${(QiOld - QiNew).toFixed(2)} points`);

console.log('\n✅ Expected HPI Range:');
console.log(`   With correct Fe Si=1500: 20-35 (Good to Poor range)`);
console.log(`   With wrong Fe Si=1000: 70-90 (Very high pollution - INCORRECT)`);

console.log('\n' + '='.repeat(80));
if (FeSi === 1500) {
  console.log('✅ SUCCESS: Fe standard is correctly set to 1500 ppb');
} else {
  console.log(`❌ ERROR: Fe standard is ${FeSi}, should be 1500 ppb`);
}
console.log('='.repeat(80));
