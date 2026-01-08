/**
 * Quick test script to verify HPI calculation with reference data
 * Run with: npx ts-node scripts/test-hpi.ts
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';

// Reference data from the image (Table 9)
// Values are in mg/L, need to convert to ppb (multiply by 1000)
const testCases = [
    {
        name: 'Kharagpur baze (Row 1 Pre)',
        // Cd=0.604, Cr=0, Cu=0.12, Pb=0.043, Mn=0, Ni=1.508, Fe=0.704, Zn=0.184 (mg/L)
        metals: {
            Cd: 0.604 * 1000,   // 604 ppb
            Cr: 0 * 1000,       // 0 ppb
            Cu: 0.12 * 1000,    // 120 ppb
            Pb: 0.043 * 1000,   // 43 ppb
            Mn: 0 * 1000,       // 0 ppb
            Ni: 1.508 * 1000,   // 1508 ppb
            Fe: 0.704 * 1000,   // 704 ppb
            Zn: 0.184 * 1000,   // 184 ppb
        },
        expectedHPI: 21.5,
    },
    {
        name: 'Milak Kuttunwali (Row 2 Pre)',
        metals: {
            Cd: 0.354 * 1000,
            Cr: 0.026 * 1000,
            Cu: 0.17 * 1000,
            Pb: 0.537 * 1000,
            Mn: 0 * 1000,
            Ni: 1.607 * 1000,
            Fe: 0.955 * 1000,
            Zn: 0.237 * 1000,
        },
        expectedHPI: 13.96,
    },
    {
        name: 'Gulab bari Waste Site (Row 30 Pre)',
        metals: {
            Cd: 0.472 * 1000,
            Cr: 0.361 * 1000,
            Cu: 0.311 * 1000,
            Pb: 1.013 * 1000,
            Mn: 0.078 * 1000,
            Ni: 1.624 * 1000,
            Fe: 2.215 * 1000,
            Zn: 0.256 * 1000,
        },
        expectedHPI: 123.97,
    },
    // Flutter reference test case
    {
        name: 'Flutter Reference (Station 1)',
        metals: {
            As: 0.048,
            Cu: 2.54,
            Zn: 43.89,
            Hg: 2.83,
            Cd: 0.06,
            Ni: 0.095,
            Pb: 0.215,
        },
        expectedHPI: 146.33,
    },
];

console.log('='.repeat(60));
console.log('HPI Calculator Verification Test');
console.log('='.repeat(60));

for (const testCase of testCases) {
    const result = HPICalculatorService.calculate(testCase.metals);

    console.log(`\n${testCase.name}:`);
    console.log(`  Expected HPI: ${testCase.expectedHPI}`);
    console.log(`  Calculated HPI: ${result?.hpi ?? 'null'}`);
    console.log(`  Classification: ${result?.classification ?? 'N/A'}`);
    console.log(`  Metals Analyzed: ${result?.metalsAnalyzed?.join(', ') ?? 'N/A'}`);

    if (result) {
        const diff = Math.abs(result.hpi - testCase.expectedHPI);
        const percentDiff = (diff / testCase.expectedHPI) * 100;
        console.log(`  Difference: ${diff.toFixed(2)} (${percentDiff.toFixed(2)}%)`);

        if (percentDiff < 5) {
            console.log('  ✅ PASS (within 5% tolerance)');
        } else {
            console.log('  ❌ FAIL (outside 5% tolerance)');
        }
    }
}

console.log('\n' + '='.repeat(60));
