/**
 * Phase 1 Verification Script
 * Tests that CSV parsing works correctly with the updated constants and aliases
 */

import fs from 'fs';
import path from 'path';
import { CSVParserService } from '../src/features/hmpi-engine/services/csv-parser.service';

const dataDir = path.join(__dirname, '../src/features/hmpi-engine/data');

function testCSVFile(filename: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${filename}`);
  console.log('='.repeat(80));
  
  const filePath = path.join(dataDir, filename);
  const buffer = fs.readFileSync(filePath);
  
  const result = CSVParserService.parseCSV(buffer);
  
  console.log(`\nParsing Result:`);
  console.log(`  ✓ Success: ${result.success}`);
  console.log(`  ✓ Total Rows: ${result.totalRows}`);
  console.log(`  ✓ Valid Rows: ${result.validRows}`);
  console.log(`  ✓ Errors: ${result.errors.length}`);
  console.log(`  ✓ Warnings: ${result.warnings.length}`);
  
  console.log(`\nColumn Mapping:`);
  console.log(`  - S.No: ${result.columnMapping.snoColumn || 'NOT FOUND'}`);
  console.log(`  - Station ID: ${result.columnMapping.stationIdColumn || 'NOT FOUND'}`);
  console.log(`  - Latitude: ${result.columnMapping.latitudeColumn || 'NOT FOUND'}`);
  console.log(`  - Longitude: ${result.columnMapping.longitudeColumn || 'NOT FOUND'}`);
  console.log(`  - State: ${result.columnMapping.stateColumn || 'NOT FOUND'}`);
  console.log(`  - City: ${result.columnMapping.cityColumn || 'NOT FOUND'}`);
  console.log(`  - Year: ${result.columnMapping.yearColumn || 'NOT FOUND'}`);
  console.log(`  - Metals: ${Object.keys(result.columnMapping.metalColumns).join(', ') || 'NONE'}`);
  console.log(`  - WQI Params: ${Object.keys(result.columnMapping.wqiColumns).join(', ') || 'NONE'}`);
  
  if (result.rows.length > 0) {
    console.log(`\nFirst Row Sample:`);
    const row = result.rows[0];
    console.log(`  - S.No: ${row.sno || 'N/A'}`);
    console.log(`  - Station: ${row.station_id}`);
    console.log(`  - Location: ${row.state || 'N/A'}, ${row.city || 'N/A'}`);
    console.log(`  - Coordinates: (${row.latitude || 'N/A'}, ${row.longitude || 'N/A'})`);
    console.log(`  - Year: ${row.year || 'N/A'}`);
    console.log(`  - Metals: ${JSON.stringify(row.metals)}`);
    console.log(`  - WQI Params: ${JSON.stringify(row.wqiParams)}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    result.errors.forEach(err => {
      console.log(`  ✗ Row ${err.row}: ${err.message}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log(`\nWarnings:`);
    result.warnings.forEach(warn => {
      console.log(`  ⚠ ${warn}`);
    });
  }
  
  return result.success && result.validRows > 0;
}

// Test all CSV files
console.log('\n' + '█'.repeat(80));
console.log('PHASE 1 VERIFICATION - CSV Parsing Test');
console.log('█'.repeat(80));

const testFiles = [
  'converted_hpi_data.csv',
  'converted_mi_data.csv',
  'converted_wqi_data.csv',
  'water_quality_template.csv',
];

let allPassed = true;

for (const file of testFiles) {
  try {
    const success = testCSVFile(file);
    if (!success) {
      allPassed = false;
      console.log(`\n❌ FAILED: ${file}`);
    } else {
      console.log(`\n✅ PASSED: ${file}`);
    }
  } catch (error) {
    allPassed = false;
    console.error(`\n❌ ERROR in ${file}:`, error);
  }
}

console.log('\n' + '█'.repeat(80));
if (allPassed) {
  console.log('✅ ALL TESTS PASSED - Phase 1 Complete!');
} else {
  console.log('❌ SOME TESTS FAILED - Review errors above');
}
console.log('█'.repeat(80) + '\n');

process.exit(allPassed ? 0 : 1);
