/**
 * Debug script to trace HPI calculation with SIH25067 data
 */

import * as fs from 'fs';
import * as path from 'path';
import { CSVParserService } from '../src/features/hmpi-engine/services/csv-parser.service';
import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';
import { parseUnitFromHeader, METAL_STANDARDS } from '../src/features/hmpi-engine/shared/constants';

// Read the CSV file
const csvPath = path.join(__dirname, '../src/features/hmpi-engine/data/SIH25067 ppb.csv');
const csvBuffer = fs.readFileSync(csvPath);

console.log('='.repeat(80));
console.log('DEBUG: HPI Calculation Trace');
console.log('='.repeat(80));

// Test parseUnitFromHeader for each metal column
const testHeaders = ['#', 'AI', 'Cr', 'Mn', 'Fe', 'Ni', 'Cu', 'Zn', 'As', 'Se', 'Mo', 'Ag', 'Cd', 'Hg', 'Pb'];
console.log('\n1. Unit Conversion Factors for Headers:');
testHeaders.forEach(h => {
  const factor = parseUnitFromHeader(h);
  console.log(`   ${h} -> ${factor}x`);
});

// Parse CSV
console.log('\n2. CSV Parsing Result:');
const parseResult = CSVParserService.parseCSV(csvBuffer);
console.log(`   Success: ${parseResult.success}`);
console.log(`   Total rows: ${parseResult.totalRows}`);
console.log(`   Valid rows: ${parseResult.validRows}`);
console.log(`   Metal columns detected: ${Object.keys(parseResult.columnMapping.metalColumns).join(', ')}`);

// Show first row metals
if (parseResult.rows.length > 0) {
  const row1 = parseResult.rows[0];
  console.log('\n3. First Row Metal Values (after parsing):');
  Object.entries(row1.metals).forEach(([symbol, value]) => {
    console.log(`   ${symbol}: ${value}`);
  });
  
  // Calculate HPI for first row
  console.log('\n4. HPI Calculation for Row 1:');
  const hpiResult = HPICalculatorService.calculate(row1.metals);
  if (hpiResult) {
    console.log(`   HPI: ${hpiResult.hpi}`);
    console.log(`   Classification: ${hpiResult.classification}`);
    console.log(`   Metals analyzed: ${hpiResult.metalsAnalyzed.join(', ')}`);
    
    // Show metal standards used
    console.log('\n5. Metal Standards Used:');
    hpiResult.metalsAnalyzed.forEach(metal => {
      const std = METAL_STANDARDS[metal];
      if (std) {
        console.log(`   ${metal}: Si=${std.Si} ppb, Ii=${std.Ii} ppb`);
      }
    });
  }
}

// Manual calculation for comparison
console.log('\n6. Manual HPI Calculation (Row 1 values):');
const row1Metals: Record<string, number> = {
  Al: 5.648,   // From CSV
  Cr: 0.933,
  Mn: 201.386,
  Fe: 47.555,
  Ni: 0.679,
  Cu: 1.487,
  Zn: 19.496,
  As: 0.178,
  Se: 0.493,
  Mo: 1.117,
  Ag: 0.029,
  Cd: 2.75,
  Hg: 0,
  Pb: 0.276
};

let sumWi = 0;
let sumWiQi = 0;

console.log('   Metal   | Value  | Si     | Ii   | Wi       | Qi       | WiQi');
console.log('   ' + '-'.repeat(70));

Object.entries(row1Metals).forEach(([symbol, Mi]) => {
  const std = METAL_STANDARDS[symbol];
  if (std && std.Si > std.Ii) {
    const Wi = 1 / std.Si;
    const Qi = (Math.abs(Mi - std.Ii) / (std.Si - std.Ii)) * 100;
    const WiQi = Wi * Qi;
    sumWi += Wi;
    sumWiQi += WiQi;
    console.log(`   ${symbol.padEnd(6)} | ${Mi.toFixed(3).padStart(6)} | ${std.Si.toString().padStart(6)} | ${std.Ii.toString().padStart(4)} | ${Wi.toFixed(6)} | ${Qi.toFixed(2).padStart(8)} | ${WiQi.toFixed(6)}`);
  }
});

const manualHPI = sumWiQi / sumWi;
console.log('   ' + '-'.repeat(70));
console.log(`   Manual HPI: ${manualHPI.toFixed(2)}`);
console.log('='.repeat(80));
