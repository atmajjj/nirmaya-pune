/**
 * Quick test script to verify HPI calculation with reference data
 * Outputs results to JSON file for easy reading
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';
import * as fs from 'fs';

// Reference data from the image (Table 9)
// Values are in mg/L, need to convert to ppb (multiply by 1000)
const testCases = [
    {
        name: 'Kharagpur baze (Row 1 Pre)',
        metals: {
            Cd: 0.604 * 1000,
            Cr: 0 * 1000,
            Cu: 0.12 * 1000,
            Pb: 0.043 * 1000,
            Mn: 0 * 1000,
            Ni: 1.508 * 1000,
            Fe: 0.704 * 1000,
            Zn: 0.184 * 1000,
        },
        expectedHPI: 21.5,
    },
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

const results = testCases.map(testCase => {
    const result = HPICalculatorService.calculate(testCase.metals);
    const diff = result ? Math.abs(result.hpi - testCase.expectedHPI) : null;
    const percentDiff = result && diff ? (diff / testCase.expectedHPI) * 100 : null;

    return {
        name: testCase.name,
        expectedHPI: testCase.expectedHPI,
        calculatedHPI: result?.hpi ?? null,
        classification: result?.classification ?? null,
        metalsAnalyzed: result?.metalsAnalyzed ?? [],
        difference: diff?.toFixed(2) ?? null,
        percentDiff: percentDiff?.toFixed(2) ?? null,
        pass: percentDiff ? percentDiff < 5 : false,
    };
});

fs.writeFileSync('hpi-test-results.json', JSON.stringify(results, null, 2));
console.log('Results written to hpi-test-results.json');
