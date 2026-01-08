/**
 * Comprehensive HPI Test with all 30 rows from reference paper
 * Reference: Husain and Ali; Int. J. Environ. Clim. Change, vol. 14, no. 6, 2024
 * Table 9: Analyzed value of Heavy Metals concentration in the samples
 * 
 * Values converted from mg/L to ppb (multiply by 1000)
 */

import { HPICalculatorService } from '../src/features/hmpi-engine/services/hpi-calculator.service';
import * as fs from 'fs';

// All 30 rows from the reference image (Pre-Monsoon 2017)
// Converting mg/L to ppb by multiplying by 1000
const testData = [
    { sno: 1, name: "Kharagpur baze", Cd: 0.604, Cr: 0, Cu: 0.12, Pb: 0.043, Mn: 0, Ni: 1.508, Fe: 0.704, Zn: 0.184, expectedHPI: 21.5 },
    { sno: 2, name: "Milak Kuttunwali", Cd: 0.354, Cr: 0.026, Cu: 0.17, Pb: 0.537, Mn: 0, Ni: 1.607, Fe: 0.955, Zn: 0.237, expectedHPI: 13.96 },
    { sno: 3, name: "Badepur", Cd: 0.4, Cr: 0.069, Cu: 0.166, Pb: 0.506, Mn: 0.004, Ni: 1.545, Fe: 0.701, Zn: 0.262, expectedHPI: 19.84 },
    { sno: 4, name: "Milak Rustampur", Cd: 0.449, Cr: 0.104, Cu: 0.195, Pb: 0.566, Mn: 0.001, Ni: 1.674, Fe: 0.909, Zn: 0.218, expectedHPI: 14.7 },
    { sno: 5, name: "Kaliyanpur2", Cd: 0.457, Cr: 0.134, Cu: 0.2, Pb: 0.908, Mn: 0.002, Ni: 1.583, Fe: 0.801, Zn: 0.153, expectedHPI: 17.38 },
    { sno: 6, name: "Near RamGanga Bridge", Cd: 0.425, Cr: 0.189, Cu: 0.199, Pb: 1.65, Mn: 0, Ni: 1.554, Fe: 0.896, Zn: 0.172, expectedHPI: 15.37 },
    { sno: 7, name: "Bhamsiya", Cd: 0.37, Cr: 0.185, Cu: 0.196, Pb: 1.594, Mn: 0, Ni: 1.492, Fe: 0.759, Zn: 0.105, expectedHPI: 19.27 },
    { sno: 8, name: "BarwalaMazra", Cd: 0.398, Cr: 0.209, Cu: 0.182, Pb: 1.48, Mn: 0, Ni: 1.508, Fe: 1.014, Zn: 0.089, expectedHPI: 12.21 },
    { sno: 9, name: "Got", Cd: 0.362, Cr: 0.182, Cu: 0.198, Pb: 1.323, Mn: 0.006, Ni: 1.657, Fe: 0.813, Zn: 0.058, expectedHPI: 15.76 },
    { sno: 10, name: "Laluwala", Cd: 0.46, Cr: 0.209, Cu: 0.206, Pb: 0.961, Mn: 0.019, Ni: 1.551, Fe: 1.028, Zn: 0.048, expectedHPI: 5.35 },
    { sno: 11, name: "Pipalsana", Cd: 0.412, Cr: 0.216, Cu: 0.191, Pb: 1.633, Mn: 0, Ni: 1.451, Fe: 0.834, Zn: 0.049, expectedHPI: 17.21 },
    { sno: 12, name: "BhojpurDharampur", Cd: 0.379, Cr: 0.23, Cu: 0.206, Pb: 1.306, Mn: 0.008, Ni: 1.603, Fe: 1.062, Zn: 0.08, expectedHPI: 8.0 },
    { sno: 13, name: "Ahmadpur", Cd: 0.444, Cr: 0.239, Cu: 0.206, Pb: 1.422, Mn: 0.011, Ni: 1.461, Fe: 1.045, Zn: 0.12, expectedHPI: 7.49 },
    { sno: 14, name: "Khaiya khaddar", Cd: 0.474, Cr: 0.243, Cu: 0.198, Pb: 2.507, Mn: 0.014, Ni: 1.617, Fe: 1.001, Zn: 0.133, expectedHPI: 7.49 },
    { sno: 15, name: "Islam Nagar", Cd: 0.42, Cr: 0.268, Cu: 0.196, Pb: 2.348, Mn: 0.087, Ni: 1.526, Fe: 1.001, Zn: 0.051, expectedHPI: 18.42 },
    { sno: 16, name: "Sheruachauraha", Cd: 0.403, Cr: 0.271, Cu: 0.223, Pb: 0.302, Mn: 0.014, Ni: 1.581, Fe: 1.001, Zn: 0.051, expectedHPI: 7.6 },
    { sno: 17, name: "BarbalaMazra", Cd: 0.434, Cr: 0.369, Cu: 0.225, Pb: 0.915, Mn: 0.043, Ni: 1.67, Fe: 1.227, Zn: 0.104, expectedHPI: 8.33 },
    { sno: 18, name: "GIC Faizganj", Cd: 0.408, Cr: 0.373, Cu: 0.228, Pb: 0.541, Mn: 0.01, Ni: 1.551, Fe: 1.066, Zn: 0.055, expectedHPI: 7.04 },
    { sno: 19, name: "Shankar Nagar Deputyganj", Cd: 0.507, Cr: 0.398, Cu: 0.241, Pb: 0.728, Mn: 0.012, Ni: 1.628, Fe: 1.123, Zn: 0.075, expectedHPI: 4.65 },
    { sno: 20, name: "Civil Lines", Cd: 0.505, Cr: 0.378, Cu: 0.259, Pb: 0.019, Mn: 0.013, Ni: 1.543, Fe: 1.194, Zn: 0.075, expectedHPI: 2.16 },
    { sno: 21, name: "Harthala", Cd: 0.446, Cr: 0.38, Cu: 0.256, Pb: 0.071, Mn: 0.013, Ni: 1.52, Fe: 1.147, Zn: 0.047, expectedHPI: 3.51 },
    { sno: 22, name: "Ramganga vihar phase2", Cd: 0.459, Cr: 0.41, Cu: 0.27, Pb: 0.245, Mn: 0.01, Ni: 1.556, Fe: 1.308, Zn: 0.052, expectedHPI: 4.85 },
    { sno: 23, name: "ModhaMustakam", Cd: 0.472, Cr: 0.387, Cu: 0.275, Pb: 0.396, Mn: 0.025, Ni: 1.636, Fe: 1.135, Zn: 0.079, expectedHPI: 0.26 },
    { sno: 24, name: "Adarsh Colony", Cd: 0.51, Cr: 0.403, Cu: 0.304, Pb: 0.571, Mn: 0.034, Ni: 1.593, Fe: 1.152, Zn: 0.109, expectedHPI: 3.97 },
    { sno: 25, name: "Majhaula Mandi", Cd: 0.422, Cr: 0.401, Cu: 0.316, Pb: 0.252, Mn: 0.042, Ni: 1.626, Fe: 1.043, Zn: 0.098, expectedHPI: 3.63 },
    { sno: 26, name: "Transport Nagar", Cd: 0.448, Cr: 0.362, Cu: 0.293, Pb: 1.112, Mn: 0.043, Ni: 1.562, Fe: 1.22, Zn: 0.141, expectedHPI: 8.75 },
    { sno: 27, name: "Hanuman Murti (Derhigaon)", Cd: 0.441, Cr: 0.379, Cu: 0.295, Pb: 1.109, Mn: 0.056, Ni: 1.659, Fe: 1.751, Zn: 0.181, expectedHPI: 28.02 },
    { sno: 28, name: "HMIC Near Mandir", Cd: 0.451, Cr: 0.361, Cu: 0.304, Pb: 1.107, Mn: 0.053, Ni: 1.808, Fe: 1.224, Zn: 0.127, expectedHPI: 12.25 },
    { sno: 29, name: "Barbalan", Cd: 0.452, Cr: 0.364, Cu: 0.31, Pb: 0.719, Mn: 0.067, Ni: 1.651, Fe: 1.84, Zn: 0.309, expectedHPI: 34.30 },
    { sno: 30, name: "Gulab bari Waste Site", Cd: 0.472, Cr: 0.361, Cu: 0.311, Pb: 1.013, Mn: 0.078, Ni: 1.624, Fe: 2.215, Zn: 0.256, expectedHPI: 48.50 },
];

console.log("=".repeat(80));
console.log("HPI Verification Test - All 30 Rows from Reference Paper");
console.log("Values converted from mg/L to ppb (×1000)");
console.log("=".repeat(80));

const results: any[] = [];

for (const row of testData) {
    // Convert mg/L to ppb (multiply by 1000)
    const metalsInPPB = {
        Cd: row.Cd * 1000,
        Cr: row.Cr * 1000,
        Cu: row.Cu * 1000,
        Pb: row.Pb * 1000,
        Mn: row.Mn * 1000,
        Ni: row.Ni * 1000,
        Fe: row.Fe * 1000,
        Zn: row.Zn * 1000,
    };

    const result = HPICalculatorService.calculate(metalsInPPB);
    const calculatedHPI = result?.hpi ?? null;
    const diff = calculatedHPI !== null ? Math.abs(calculatedHPI - row.expectedHPI) : null;
    const percentDiff = diff !== null && row.expectedHPI !== 0 ? (diff / row.expectedHPI) * 100 : null;

    results.push({
        sno: row.sno,
        name: row.name,
        expectedHPI: row.expectedHPI,
        calculatedHPI: calculatedHPI,
        difference: diff?.toFixed(2) ?? "N/A",
        percentDiff: percentDiff?.toFixed(2) ?? "N/A",
        classification: result?.classification ?? "N/A",
        metalsAnalyzed: result?.metalsAnalyzed ?? [],
    });
}

// Output summary
console.log("\nResults Summary:");
console.log("-".repeat(80));
console.log("S.No | Location                      | Expected | Calculated | Diff    | Status");
console.log("-".repeat(80));

let passCount = 0;
let failCount = 0;

for (const r of results) {
    const status = parseFloat(r.percentDiff) < 10 ? "✅" : "❌";
    if (parseFloat(r.percentDiff) < 10) passCount++;
    else failCount++;

    console.log(
        `${r.sno.toString().padStart(4)} | ${r.name.substring(0, 29).padEnd(29)} | ${r.expectedHPI.toFixed(2).padStart(8)} | ${(r.calculatedHPI?.toFixed(2) ?? "N/A").padStart(10)} | ${r.difference.padStart(7)} | ${status}`
    );
}

console.log("-".repeat(80));
console.log(`\nTotal: ${results.length} | Pass (within 10%): ${passCount} | Fail: ${failCount}`);

// Write full results to JSON
fs.writeFileSync('hpi-full-test-results.json', JSON.stringify(results, null, 2));
console.log("\nFull results written to hpi-full-test-results.json");
