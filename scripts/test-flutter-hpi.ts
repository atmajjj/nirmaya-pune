/**
 * Verify Flutter reference test case
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';
import * as fs from 'fs';

// Flutter reference test case (values already in ppb - very small values)
const flutterTestCase = {
    name: 'Flutter Reference (Station 1)',
    metals: {
        As: 0.048,   // ppb
        Cu: 2.54,    // ppb
        Zn: 43.89,   // ppb
        Hg: 2.83,    // ppb  
        Cd: 0.06,    // ppb
        Ni: 0.095,   // ppb
        Pb: 0.215,   // ppb
    },
    expectedHPI: 146.33,
};

const result = HPICalculatorService.calculate(flutterTestCase.metals);

const output = {
    testCaseName: flutterTestCase.name,
    inputMetals: flutterTestCase.metals,
    expectedHPI: flutterTestCase.expectedHPI,
    calculatedHPI: result?.hpi ?? null,
    classification: result?.classification ?? null,
    metalsAnalyzed: result?.metalsAnalyzed ?? [],
    breakdown: {
        subIndices: result?.subIndices,
        unitWeights: result?.unitWeights,
        contributions: result?.contributions,
        sumWi: result?.sumWi,
        sumWiQi: result?.sumWiQi,
    },
    difference: result ? Math.abs(result.hpi - flutterTestCase.expectedHPI).toFixed(2) : null,
    isPass: result ? Math.abs(result.hpi - flutterTestCase.expectedHPI) < 1 : false,
};

fs.writeFileSync('flutter-test-result.json', JSON.stringify(output, null, 2));
console.log('FLUTTER TEST RESULT:', JSON.stringify(output, null, 2));
