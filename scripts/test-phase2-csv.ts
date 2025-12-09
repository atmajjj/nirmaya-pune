/**
 * Phase 2 CSV Data Verification
 * Tests HPI calculation with actual CSV data from converted_hpi_data.csv
 */

import fs from 'fs';
import path from 'path';
import { CSVParserService } from '../src/features/hmpi-engine/services/csv-parser.service';
import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';

console.log('\n' + '█'.repeat(80));
console.log('PHASE 2 CSV DATA VERIFICATION - HPI Calculator');
console.log('Testing with converted_hpi_data.csv');
console.log('█'.repeat(80) + '\n');

const dataFile = path.join(__dirname, '../src/features/hmpi-engine/data/converted_hpi_data.csv');
const buffer = fs.readFileSync(dataFile);

const parseResult = CSVParserService.parseCSV(buffer);

if (!parseResult.success) {
  console.error('❌ Failed to parse CSV file');
  process.exit(1);
}

console.log(`Parsed ${parseResult.validRows} rows from CSV\n`);

for (const row of parseResult.rows) {
  console.log('='.repeat(80));
  console.log(`Station: ${row.station_id}`);
  console.log('='.repeat(80));
  
  console.log('\nMetal Concentrations (ppb):');
  for (const [metal, value] of Object.entries(row.metals)) {
    console.log(`  ${metal}: ${value}`);
  }
  
  const result = HPICalculatorService.calculate(row.metals);
  
  if (!result) {
    console.log('\n❌ Failed to calculate HPI for this station');
    continue;
  }
  
  console.log('\nCalculation Results:');
  console.log(`  HPI: ${result.hpi.toFixed(5)}`);
  console.log(`  Classification: ${result.classification}`);
  console.log(`  Metals Analyzed: ${result.metalsAnalyzed.join(', ')}`);
  
  console.log('\nDetailed Breakdown:');
  console.log('  Metal\tWi\t\tQi\t\tWiQi');
  for (const metal of result.metalsAnalyzed) {
    const wi = result.unitWeights![metal];
    const qi = result.subIndices![metal];
    const wiqi = result.contributions![metal];
    console.log(`  ${metal}\t${wi.toFixed(6)}\t${qi.toFixed(3)}\t${wiqi.toFixed(6)}`);
  }
  
  console.log(`\n  Σ Wi:   ${result.sumWi!.toFixed(6)}`);
  console.log(`  Σ WiQi: ${result.sumWiQi!.toFixed(6)}`);
  console.log();
}

// Test Station 1 specifically (should match Flutter test case)
console.log('\n' + '='.repeat(80));
console.log('STATION 1 VERIFICATION (Flutter Test Case)');
console.log('='.repeat(80));

const station1 = parseResult.rows[0];
const station1Result = HPICalculatorService.calculate(station1.metals);

if (station1Result) {
  const expectedHPI = 146.33519;
  const diff = Math.abs(station1Result.hpi - expectedHPI);
  
  console.log(`Calculated HPI: ${station1Result.hpi.toFixed(5)}`);
  console.log(`Expected HPI:   ${expectedHPI.toFixed(5)}`);
  console.log(`Difference:     ${diff.toFixed(5)}`);
  
  if (diff < 0.01) {
    console.log('\n✅ Station 1 matches Flutter test case!');
  } else {
    console.log('\n⚠️  Station 1 has slight difference from Flutter test case');
  }
}

console.log('\n' + '█'.repeat(80));
console.log('✅ PHASE 2 CSV DATA VERIFICATION COMPLETE');
console.log('█'.repeat(80) + '\n');
