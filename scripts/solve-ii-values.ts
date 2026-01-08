/**
 * Find the exact Ii values that produce the paper's Qi values
 * Working backwards from known Qi to find Ii
 */

const metals = {
  Fe: { Mi: 342.33, Si: 1000, paperQi: 30.68 },
  Zn: { Mi: 106.53, Si: 15000, paperQi: 48.93 },
  Cd: { Mi: 1.32, Si: 10, paperQi: 13.19 },
  Cu: { Mi: 105.39, Si: 1500, paperQi: 5.43 },
  Pb: { Mi: 33.52, Si: 50, paperQi: 67.04 }
};

console.log('Solving for Ii values that produce paper\'s Qi values');
console.log('====================================================\n');
console.log('Formula: Qi = (Mi - Ii) / (Si - Ii) × 100');
console.log('Solving for Ii:\n');

for (const [symbol, data] of Object.entries(metals)) {
  const { Mi, Si, paperQi } = data;
  
  // Qi = (Mi - Ii) / (Si - Ii) × 100
  // Qi/100 = (Mi - Ii) / (Si - Ii)
  // Qi/100 * (Si - Ii) = Mi - Ii
  // Qi/100 * Si - Qi/100 * Ii = Mi - Ii
  // Qi/100 * Si - Mi = Qi/100 * Ii - Ii
  // Qi/100 * Si - Mi = Ii * (Qi/100 - 1)
  // Ii = (Qi/100 * Si - Mi) / (Qi/100 - 1)
  
  const qiFraction = paperQi / 100;
  const numerator = qiFraction * Si - Mi;
  const denominator = qiFraction - 1;
  const solvedIi = numerator / denominator;
  
  // Verify
  const checkQi = (Mi - solvedIi) / (Si - solvedIi) * 100;
  
  console.log(`${symbol}:`);
  console.log(`  Given: Mi=${Mi}, Si=${Si}, Qi=${paperQi}`);
  console.log(`  Solved Ii = ${solvedIi.toFixed(2)}`);
  console.log(`  Verification: Qi = ${checkQi.toFixed(2)} ${Math.abs(checkQi - paperQi) < 0.01 ? '✓' : '✗'}`);
  console.log();
}

console.log('\n=====================================');
console.log('Testing with solved Ii values:');
console.log('=====================================\n');

const solvedStandards = {
  Fe: { Si: 1000, Ii: 51.26 },   // Solved
  Zn: { Si: 15000, Ii: 5000.00 }, // Matches paper exactly!
  Cd: { Si: 10, Ii: 0.09 },       // Solved (~0)
  Cu: { Si: 1500, Ii: 56.74 },    // Solved
  Pb: { Si: 50, Ii: 0.20 }        // Solved (~0)
};

const metalData = {
  Fe: 342.33,
  Zn: 106.53,
  Cd: 1.32,
  Cu: 105.39,
  Pb: 33.52
};

let sumWi = 0;
let sumWiQi = 0;

for (const [symbol, Mi] of Object.entries(metalData)) {
  const { Si, Ii } = solvedStandards[symbol];
  const Wi = 1.0 / Si;
  const Qi = (Mi - Ii) / (Si - Ii) * 100;
  const WiQi = Wi * Qi;
  
  sumWi += Wi;
  sumWiQi += WiQi;
}

const hpi = sumWiQi / sumWi;
console.log(`HPI with solved Ii values: ${hpi.toFixed(2)}`);
console.log(`Expected: 22.11`);
console.log(`Match: ${Math.abs(hpi - 22.11) < 0.01 ? '✅ EXACT!' : `Difference: ${Math.abs(hpi - 22.11).toFixed(2)}`}`);
