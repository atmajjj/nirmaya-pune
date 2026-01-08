/**
 * Test HPI with Ii = 0 for all metals
 * Hypothesis: The "Highest desirable value" column might be informational only
 */

// Mumbai data
const metals = {
  Fe: 342.33,
  Zn: 106.53,
  Cd: 1.32,
  Cu: 105.39,
  Pb: 33.52
};

// Standards from paper with Ii = 0 for ALL
const standards = {
  Fe: { Si: 1000, Ii: 0 },
  Zn: { Si: 15000, Ii: 0 },
  Cd: { Si: 10, Ii: 0 },
  Cu: { Si: 1500, Ii: 0 },
  Pb: { Si: 50, Ii: 0 }
};

console.log('Testing HPI with Ii = 0 for ALL metals');
console.log('========================================\n');

let sumWi = 0;
let sumWiQi = 0;

console.log('Metal | Mi      | Si      | Ii | Wi       | Qi      | WiQi     | Paper Qi');
console.log('------|---------|---------|----|-----------|---------|-----------|---------');

const paperQi = { Fe: 30.68, Zn: 48.93, Cd: 13.19, Cu: 5.43, Pb: 67.04 };

for (const [symbol, Mi] of Object.entries(metals)) {
  const { Si, Ii } = standards[symbol];
  
  const Wi = 1.0 / Si;
  const Qi = (Mi - Ii) / (Si - Ii) * 100;  // With Ii=0: Mi/Si * 100
  const WiQi = Wi * Qi;
  
  sumWi += Wi;
  sumWiQi += WiQi;
  
  console.log(`${symbol.padEnd(5)} | ${Mi.toString().padEnd(7)} | ${Si.toString().padEnd(7)} | ${Ii}  | ${Wi.toFixed(7)} | ${Qi.toFixed(2).padEnd(7)} | ${WiQi.toFixed(7)} | ${paperQi[symbol]}`);
}

const hpi = sumWiQi / sumWi;

console.log('------|---------|---------|----|-----------|---------|-----------|---------');
console.log(`TOTALS: ΣWi = ${sumWi.toFixed(7)}, ΣWiQi = ${sumWiQi.toFixed(7)}`);
console.log(`\nHPI = ${hpi.toFixed(2)}`);
console.log(`Expected = 22.11`);
console.log(`Difference = ${Math.abs(hpi - 22.11).toFixed(2)}`);
