import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';

const mumbaiData = {
  Fe: 342.33,
  Zn: 106.53,
  Cd: 1.32,
  Cu: 105.39,
  Pb: 33.52
};

console.log('Testing HPI with Updated BIS Standards');
console.log('========================================\n');

const result = HPICalculatorService.calculate(mumbaiData);

if (result) {
  console.log(`✅ HPI Calculated: ${result.hpi}`);
  console.log(`Classification: ${result.classification}`);
  console.log(`\nMetals analyzed: ${result.metalsAnalyzed?.join(', ')}`);
  
  console.log('\nDetailed breakdown:');
  if (result.subIndices) {
    for (const [metal, qi] of Object.entries(result.subIndices)) {
      console.log(`  ${metal}: Qi = ${qi.toFixed(2)}`);
    }
  }
} else {
  console.log('❌ Failed to calculate HPI');
}
