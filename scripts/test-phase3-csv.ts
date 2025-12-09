/**
 * Phase 3: MI Calculator CSV Integration Test
 * 
 * Tests MI calculator with actual CSV data
 */

import { CSVParserService } from '../src/features/hmpi-engine/services/csv-parser.service';
import { MICalculatorService } from '../src/features/hmpi-engine/services/mi-calculator.service';
import * as fs from 'fs';
import * as path from 'path';

console.log('=' .repeat(60));
console.log('PHASE 3: MI CALCULATOR CSV INTEGRATION TEST');
console.log('=' .repeat(60));
console.log('');

// Test with converted_hpi_data.csv (has all metals needed for MI)
const csvPath = path.join(__dirname, '..', 'src', 'features', 'hmpi-engine', 'data', 'converted_hpi_data.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ ERROR: CSV file not found: ${csvPath}`);
  process.exit(1);
}

console.log(`Reading CSV: ${csvPath}`);
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const parseResult = CSVParserService.parseCSV(Buffer.from(csvContent));

if (!parseResult.success) {
  console.error('❌ ERROR: CSV parsing failed');
  console.error(parseResult.errors);
  process.exit(1);
}

const parsed = parseResult.rows;

console.log(`✅ Parsed ${parsed.length} rows`);

if (parsed.length === 0) {
  console.error('❌ ERROR: No rows parsed from CSV');
  process.exit(1);
}

console.log('');

// Custom MAC values from Flutter test case (matching Phase 3 test case)
const customMAC = {
  'As': 50.0,    // Test case uses 50, not 10 (BIS standard)
  'Cd': 3.0,
  'Cu': 1500.0,
  'Pb': 10.0,
  'Hg': 1.0,
  'Ni': 20.0,
  'Zn': 15000.0,
};

console.log('Custom MAC Values (from Flutter test):');
console.log('-'.repeat(60));
for (const [symbol, mac] of Object.entries(customMAC)) {
  console.log(`  ${symbol}: ${mac} ppb`);
}
console.log('');

// Process each station
console.log('Processing Stations:');
console.log('-'.repeat(60));

for (let i = 0; i < Math.min(3, parsed.length); i++) {
  const row = parsed[i];
  
  console.log(`\nStation ${i + 1}:`);
  console.log(`  Location: ${row.location || 'Unknown'}`);
  
  // Calculate MI
  const result = MICalculatorService.calculate(row.metals, customMAC);
  
  if (!result) {
    console.log('  ❌ MI calculation failed');
    continue;
  }
  
  console.log(`  MI: ${result.mi.toFixed(5)}`);
  console.log(`  Classification: ${result.classification} (${result.miClass})`);
  console.log(`  Metals analyzed: ${result.metalsAnalyzed.length}`);
  
  // Show detailed breakdown
  console.log('  \n  Detailed Breakdown:');
  for (const [symbol, ratio] of Object.entries(result.ratios!)) {
    const Ci = result.concentrations![symbol];
    const MACi = result.macValues![symbol];
    console.log(`    ${symbol}:  Ci=${Ci.toFixed(2).padEnd(10)}, MACi=${MACi.toFixed(2).padEnd(10)}, ratio=${ratio.toFixed(6)}`);
  }
  
  // For Station 1, verify against test case (using correct Cd value)
  if (i === 0) {
    // Station 1 with Cd=6.22 should give MI = 12.32789
    const expectedMI = 12.32789;
    const diff = Math.abs(result.mi - expectedMI);
    console.log(`\n  ✓ Verification against test case:`);
    console.log(`    Expected MI: ~${expectedMI.toFixed(5)}`);
    console.log(`    Calculated MI: ${result.mi.toFixed(5)}`);
    console.log(`    Difference: ${diff.toFixed(7)}`);
    
    if (diff < 0.001) {
      console.log(`    ✅ MATCH - Station 1 calculation correct!`);
    } else {
      console.log(`    ⚠️  DIFFERENCE - Review calculation`);
    }
  }
}

console.log('');
console.log('✅ CSV Integration test complete!');
