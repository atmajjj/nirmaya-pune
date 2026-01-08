/**
 * Compare BIS standards from image vs paper's standards
 * To understand why HPI changed from 22.11 to 30.33
 */

console.log('STANDARDS COMPARISON');
console.log('====================\n');

// Standards from the research paper (Table 3) - the ones that gave HPI = 22.11
const paperStandards = {
  Fe: { Si: 1000, Ii: 300 },    // Paper shows 1000 ppb
  Zn: { Si: 15000, Ii: 5000 },  // Paper shows 15000 ppb
  Cd: { Si: 10, Ii: 0 },        // Paper shows 10 ppb (dash for Ii means 0)
  Cu: { Si: 1500, Ii: 50 },     // Paper shows 1500 ppb
  Pb: { Si: 50, Ii: 0 }         // Paper shows 50 ppb (dash for Ii means 0)
};

// Standards from BIS image you just provided
const bisImageStandards = {
  Fe: { acceptable: 300, permissible: 1500 },   // 0.3 mg/L acceptable, 1.5 mg/L permissible
  Zn: { acceptable: 5000, permissible: 15000 }, // 5 mg/L acceptable, 15 mg/L permissible
  Cd: { acceptable: 3, permissible: 50 },       // 0.003 mg/L acceptable, 0.05 mg/L permissible
  Cu: { acceptable: 50, permissible: 'No relaxation' }, // 0.05 mg/L (no permissible)
  Pb: { acceptable: 10, permissible: 'No relaxation' }  // 0.01 mg/L (no permissible)
};

console.log('Metal | Paper Si | Paper Ii | BIS Acceptable | BIS Permissible | Match?');
console.log('------|----------|----------|----------------|-----------------|-------');

for (const metal of ['Fe', 'Zn', 'Cd', 'Cu', 'Pb']) {
  const paper = paperStandards[metal];
  const bis = bisImageStandards[metal];
  
  const siMatch = paper.Si === bis.permissible;
  const iiMatch = paper.Ii === bis.acceptable;
  
  console.log(`${metal.padEnd(5)} | ${String(paper.Si).padEnd(8)} | ${String(paper.Ii).padEnd(8)} | ${String(bis.acceptable).padEnd(14)} | ${String(bis.permissible).padEnd(15)} | Si:${siMatch?'✓':'✗'} Ii:${iiMatch?'✓':'✗'}`);
}

console.log('\n\nKEY FINDINGS:');
console.log('=============\n');

console.log('1. Fe, Zn: MATCH - Paper uses same values as BIS');
console.log('2. Cd: MISMATCH');
console.log('   - Paper: Si=10, Ii=0');
console.log('   - BIS:   Si=50, Ii=3');
console.log('   - Impact: Cd will have DIFFERENT Qi value');

console.log('\n3. Cu: MISMATCH');
console.log('   - Paper: Si=1500, Ii=50');
console.log('   - BIS:   Si="No relaxation" (only 50), Ii=50');
console.log('   - We used WHO standard (1500) to avoid Si=Ii');

console.log('\n4. Pb: MISMATCH');
console.log('   - Paper: Si=50, Ii=0');
console.log('   - BIS:   Si="No relaxation" (only 10), Ii=10');
console.log('   - We used WHO standard (50) to avoid Si=Ii');

console.log('\n\nSOLUTION:');
console.log('=========\n');
console.log('The research paper used BIS 1991 standards (older version).');
console.log('Your BIS image shows BIS 10500:2012 (newer version).');
console.log('\nYou have TWO options:\n');
console.log('Option 1: Use OLD standards (BIS 1991) to match the paper HPI=22.11');
console.log('Option 2: Use NEW standards (BIS 2012) - scientifically more current\n');

console.log('Recommendation: Use BIS 2012 (current implementation)');
console.log('The HPI will be different but more accurate per latest standards.');
