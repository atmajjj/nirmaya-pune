# HMPI Engine Migration Plan
## Accurate Implementation Based on Flutter/Dart Reference Code

**Date:** December 9, 2025  
**Status:** 📋 PLANNING PHASE - AWAITING REVIEW  
**Priority:** 🔴 CRITICAL - Accuracy matters for scientific calculations

---

## Executive Summary

The current HMPI engine implementation may produce incorrect results. This plan outlines the migration to use the proven, accurate Flutter/Dart computation logic for HPI, MI, and WQI calculations. The migration will replace all existing calculation services while maintaining the current API structure and CSV processing pipeline.

**Key Actions:**
1. ✅ Keep HPI, MI, WQI calculators only
2. ❌ Remove CDEG, HEI, PIG calculators (not in Flutter reference)
3. 🔄 Reimplement calculation logic to exactly match Flutter formulas
4. 📊 Follow water_quality_template.csv format for CSV column mapping
5. ✅ Maintain backward compatibility with existing APIs

---

## 1. Analysis Summary

### 1.1 Current State Assessment

#### Existing Calculators (6 total)
```
✅ KEEP:
- hpi-calculator.service.ts (HPI - Heavy Metal Pollution Index)
- mi-calculator.service.ts (MI - Metal Index)
- wqi-calculator.service.ts (WQI - Water Quality Index)

❌ REMOVE:
- cdeg-calculator.service.ts (CDEG - Not in Flutter reference)
- hei-calculator.service.ts (HEI - Not in Flutter reference)
- pig-calculator.service.ts (PIG - Not in Flutter reference)
```

#### Current Issues Identified

**HPI Calculator:**
- ⚠️ Wi formula may be incorrect: Current uses `Wi = 1/Si`, but Flutter uses `Wi = 1/Si` (same)
- ✅ Qi formula appears correct: `Qi = (|Mi - Ii| / (Si - Ii)) × 100`
- ⚠️ Need to verify absolute value handling and edge cases

**MI Calculator:**
- ✅ Formula appears correct: `MI = Σ(Ci / MACi)`
- ⚠️ MAC values may differ from Flutter defaults
- ⚠️ Classification thresholds need verification

**WQI Calculator:**
- ⚠️ Formula structure needs verification against Flutter
- Current: `K = 1 / Σ(1/Sn)`, `Wi = K / Sn`, `Qi = ((Vn - Vo) / (Sn - Vo)) × 100`
- Flutter: Same formulas but with special pH handling
- ❌ Missing special case for pH (absolute deviation handling)

### 1.2 Flutter Reference Analysis

#### HPI (Heavy Metal Pollution Index)

**File Structure:**
```
hpi/
├── calculator.dart        # Core calculation logic
├── models.dart           # Data structures
├── default_metals.dart   # BIS/WHO standards
├── concentration_unit.dart # Unit conversions
└── test_cases.dart       # Verified test cases
```

**Formula (EXACT):**
```
1. Wi = 1 / Si                               (Unit weight)
2. Di = |Mi - Ii|                            (Absolute difference)
3. Qi = (Di / (Si - Ii)) × 100              (Sub-index)
4. WiQi = Wi × Qi                           (Contribution)
5. HPI = Σ(WiQi) / Σ(Wi)                   (Final index)

Where:
- Mi = Measured concentration (ppb/µg/L)
- Si = Standard permissible limit (ppb)
- Ii = Ideal value (ppb)
```

**Classification:**
```
HPI < 25      → "Excellent - Low pollution"
HPI 25-50     → "Good - Low to medium pollution"
HPI 50-75     → "Poor - Medium pollution"
HPI 75-100    → "Very Poor - High pollution"
HPI > 100     → "Unsuitable - Critical pollution"
```

**Default Metal Standards (7 primary metals):**
```typescript
As (Arsenic):   Si=50,    Ii=10,    MAC=50
Cu (Copper):    Si=1500,  Ii=50,    MAC=1500
Zn (Zinc):      Si=15000, Ii=5000,  MAC=15000
Hg (Mercury):   Si=2,     Ii=1,     MAC=1
Cd (Cadmium):   Si=5,     Ii=3,     MAC=3
Ni (Nickel):    Si=70,    Ii=20,    MAC=20
Pb (Lead):      Si=10,    Ii=0,     MAC=10
```

**Test Case (VERIFIED):**
```
Input: As=0.048, Cu=2.54, Zn=43.89, Hg=2.83, Cd=0.06, Ni=0.095, Pb=0.215
Expected HPI: 146.33519
Classification: "Unsuitable - Critical pollution"
```

#### MI (Metal Index)

**File Structure:**
```
mi/
├── calculator.dart      # Core calculation logic
├── models.dart         # Data structures
├── default_mac.dart    # MAC reference values
└── test_cases.dart     # Verified test cases
```

**Formula (EXACT - Caeiro et al., 2005):**
```
MI = Σ(Ci / MACi)  for i = 1...n

Where:
- Ci = Mean concentration of metal i (ppb/µg/L)
- MACi = Maximum Allowable Concentration (ppb)
- MI is dimensionless
```

**Classification:**
```
MI < 0.3      → "Class I - Very Pure"
0.3 ≤ MI < 1  → "Class II - Pure"
1 ≤ MI < 2    → "Class III - Slightly Affected"
2 ≤ MI < 4    → "Class IV - Moderately Affected"
4 ≤ MI < 6    → "Class V - Strongly Affected"
MI ≥ 6        → "Class VI - Seriously Affected"
```

**Test Case (VERIFIED):**
```
Input: As=269.58, Cd=6.22, Cu=554.98, Pb=10.59, Hg=0.17, Ni=61.83, Zn=2587.05
Expected MI: 12.3292525
Classification: "Class VI - Seriously Affected"
```

#### WQI (Water Quality Index)

**File Structure:**
```
wqi/
├── calculator.dart        # Core calculation logic
├── models.dart           # Data structures
├── default_standards.dart # BIS standards
└── test_cases.dart       # Verified test cases
```

**Formula (EXACT - Brown et al., 1972):**
```
Step 1: invSn_i = 1 / Sn_i                  (for each parameter)
Step 2: sumInvSn = Σ invSn_i
Step 3: K = 1 / sumInvSn                    (constant)
Step 4: Wi_i = K × (1/Sn_i)                 (relative weight, Σ Wi = 1)
Step 5: Qi_i = ((Vn_i - Vo_i) / (Sn_i - Vo_i)) × 100  (quality rating)
Step 6: WiQi_i = Wi_i × Qi_i
Step 7: WQI = Σ WiQi_i

Special Case for pH:
Qi_pH = (|Vn - Vo| / |Sn - Vo|) × 100  (use absolute deviation)

Where:
- Sn = BIS standard (permissible/max value)
- Vo = Ideal value (7 for pH, 0 for others)
- Vn = Measured mean value
```

**Classification:**
```
0 – 25        → "Excellent"
26 – 50       → "Good"
51 – 75       → "Poor"
76 – 100      → "Very Poor"
> 100         → "Unfit for consumption"
```

**Default Parameters (9 total):**
```typescript
pH:         Sn=8.5,    Vo=7,   unit=""
EC:         Sn=300,    Vo=0,   unit="µS/cm"
TDS:        Sn=500,    Vo=0,   unit="mg/L"
TH:         Sn=300,    Vo=0,   unit="mg/L"
Ca:         Sn=75,     Vo=0,   unit="mg/L"
Mg:         Sn=30,     Vo=0,   unit="mg/L"
Fe:         Sn=0.3,    Vo=0,   unit="mg/L"
F:          Sn=1,      Vo=0,   unit="mg/L"
Turbidity:  Sn=5,      Vo=0,   unit="NTU"
```

**Test Case (VERIFIED):**
```
Input: pH=7.9, EC=100.33, TDS=67.22, TH=40.67, Ca=55.61, Mg=6.48, Fe=0.05, F=0.02, Turb=1.3
Expected WQI: 15.24
Classification: "Excellent"
```

### 1.3 CSV Template Format

The water_quality_template.csv defines the expected column structure:

**Required Location Columns:**
- S.No, State, District, Location, Longitude, Latitude, Year

**Heavy Metal Columns (ppb/µg/L):**
- Hg, Cd, As, Pb, Se, Ni, Al, Cr, Cu, Mo, Ag, Mn, Fe, F, Zn

**WQI Parameter Columns:**
- Hazen (color)
- NTU (turbidity)
- TDS (Total Dissolved Solids, mg/L)
- NH3-N, MBAS, Ba, B, Ca, NH2Cl, Cl, Cl2, Mg
- Oil, NO3, C6H5OH, SO4, H2S, CaCO3 (Total Hardness)
- CN, Pest, PCB, PAH
- CHBr3, CHBr2Cl, CHBrCl2, CHCl3

**Column Mapping Strategy:**
- Use existing `METAL_COLUMN_ALIASES` for metal detection
- Use existing `WQI_COLUMN_ALIASES` for WQI parameter detection
- Add new aliases based on template (e.g., "CaCO3" → TH for Total Hardness)

---

## 2. Migration Plan

### Phase 1: Update Constants & Standards ✅

**File:** `src/features/hmpi-engine/shared/constants.ts`

**Actions:**
1. Update `METAL_STANDARDS` to match Flutter `default_metals.dart` exactly
2. Update `WQI_STANDARDS` to match Flutter `default_standards.dart` exactly
3. Add missing column aliases from water_quality_template.csv
4. Verify all MAC values match Flutter `default_mac.dart`

**Changes Required:**
```typescript
// Update these values to match Flutter exactly:
METAL_STANDARDS = {
  As: { Si: 50, Ii: 10, MAC: 50 },      // ✅ Already correct
  Cu: { Si: 1500, Ii: 50, MAC: 1500 },  // ✅ Already correct
  Zn: { Si: 15000, Ii: 5000, MAC: 15000 }, // ✅ Already correct
  Hg: { Si: 2, Ii: 1, MAC: 1 },         // ✅ Already correct
  Cd: { Si: 5, Ii: 3, MAC: 3 },         // ✅ Already correct
  Ni: { Si: 70, Ii: 20, MAC: 20 },      // ✅ Already correct
  Pb: { Si: 10, Ii: 0, MAC: 10 },       // ✅ Already correct
  // Keep others but verify against Flutter
}

// Add new column aliases:
WQI_COLUMN_ALIASES = {
  // ... existing ...
  TH: ['th', 'total_hardness', 'hardness', 'caco3'], // ADD: CaCO3 alias
  Turbidity: ['turbidity', 'turb', 'ntu', 'hazen'], // ADD: Hazen alias
}
```

### Phase 2: Reimplement HPI Calculator 🔴

**File:** `src/features/hmpi-engine/services/hpi-calculator.service.ts`

**Current Issues:**
- Formula implementation needs verification
- Edge case handling (Si === Ii) needs review
- Rounding precision should match Flutter

**New Implementation:**
```typescript
/**
 * HPI Calculator - EXACT implementation from Flutter reference
 * 
 * Formula:
 * Wi = 1 / Si
 * Qi = (|Mi - Ii| / (Si - Ii)) × 100
 * HPI = Σ(Wi × Qi) / Σ(Wi)
 */
export class HPICalculatorService {
  static calculate(
    metals: Record<string, number>,
    customStandards?: Record<string, { Si: number; Ii: number }>
  ): HPIResult | null {
    const standards = customStandards || METAL_STANDARDS;
    
    let sumWi = 0;
    let sumWiQi = 0;
    const metalsAnalyzed: string[] = [];
    const subIndices: Record<string, number> = {};
    const unitWeights: Record<string, number> = {};
    const contributions: Record<string, number> = {};

    for (const [symbol, Mi] of Object.entries(metals)) {
      const standard = standards[symbol];
      if (!standard) continue;

      const { Si, Ii } = standard;

      // Skip if Si <= Ii (Flutter validation)
      if (Si <= Ii) {
        console.warn(`Skipping ${symbol}: Si (${Si}) must be > Ii (${Ii})`);
        continue;
      }

      // Calculate Wi = 1 / Si (EXACT Flutter formula)
      const Wi = 1.0 / Si;

      // Calculate Qi = (|Mi - Ii| / (Si - Ii)) × 100 (EXACT Flutter formula)
      const Di = Math.abs(Mi - Ii);
      const Qi = (Di / (Si - Ii)) * 100.0;

      // Calculate WiQi = Wi × Qi
      const WiQi = Wi * Qi;

      sumWi += Wi;
      sumWiQi += WiQi;
      metalsAnalyzed.push(symbol);

      // Store breakdown for transparency
      unitWeights[symbol] = Wi;
      subIndices[symbol] = Qi;
      contributions[symbol] = WiQi;
    }

    if (metalsAnalyzed.length === 0 || sumWi === 0) {
      return null;
    }

    // Calculate HPI = Σ(WiQi) / Σ(Wi)
    const hpi = sumWiQi / sumWi;

    return {
      hpi: Math.round(hpi * 100) / 100, // Round to 2 decimal places
      classification: classifyHPI(hpi),
      metalsAnalyzed,
      subIndices,
      unitWeights,
      contributions,
    };
  }
}
```

**Test Validation:**
```typescript
// Add unit test with Flutter test case
const testInput = {
  As: 0.048, Cu: 2.54, Zn: 43.89, 
  Hg: 2.83, Cd: 0.06, Ni: 0.095, Pb: 0.215
};
const result = HPICalculatorService.calculate(testInput);
expect(result.hpi).toBeCloseTo(146.34, 2); // Expected: 146.33519
expect(result.classification).toBe('Unsuitable - Critical pollution');
```

### Phase 3: Reimplement MI Calculator 🟡

**File:** `src/features/hmpi-engine/services/mi-calculator.service.ts`

**Current Issues:**
- Formula appears correct but needs precision verification
- MAC values need exact match with Flutter
- Rounding to 4 decimal places should match Flutter

**New Implementation:**
```typescript
/**
 * MI Calculator - EXACT implementation from Flutter reference
 * 
 * Formula (Caeiro et al., 2005):
 * MI = Σ(Ci / MACi)
 */
export class MICalculatorService {
  static calculate(
    metals: Record<string, number>,
    customMAC?: Record<string, number>
  ): MIResult | null {
    let mi = 0;
    const metalsAnalyzed: string[] = [];
    const ratios: Record<string, number> = {};
    const concentrations: Record<string, number> = {};

    for (const [symbol, Ci] of Object.entries(metals)) {
      // Get MAC value
      let MACi: number | undefined;
      if (customMAC && customMAC[symbol] !== undefined) {
        MACi = customMAC[symbol];
      } else if (METAL_STANDARDS[symbol]) {
        MACi = METAL_STANDARDS[symbol].MAC;
      }

      // Skip if no MAC or MAC = 0 (Flutter validation)
      if (!MACi || MACi <= 0) {
        console.warn(`Skipping ${symbol}: MACi must be > 0`);
        continue;
      }

      // Calculate ratio: Ci / MACi (EXACT Flutter formula)
      const ratio = Ci / MACi;
      mi += ratio;
      
      metalsAnalyzed.push(symbol);
      ratios[symbol] = ratio;
      concentrations[symbol] = Ci;
    }

    if (metalsAnalyzed.length === 0) {
      return null;
    }

    // Round to 4 decimal places (Flutter precision)
    const roundedMI = Math.round(mi * 10000) / 10000;

    // Classify using Flutter thresholds
    const { classification, miClass } = classifyMI(roundedMI);

    return {
      mi: roundedMI,
      classification,
      miClass,
      metalsAnalyzed,
      ratios,
      concentrations,
    };
  }
}
```

**Test Validation:**
```typescript
// Add unit test with Flutter test case
const testInput = {
  As: 269.58, Cd: 6.22, Cu: 554.98,
  Pb: 10.59, Hg: 0.17, Ni: 61.83, Zn: 2587.05
};
const result = MICalculatorService.calculate(testInput);
expect(result.mi).toBeCloseTo(12.3293, 4); // Expected: 12.3292525
expect(result.miClass).toBe('Class VI');
expect(result.classification).toBe('Seriously Affected');
```

### Phase 4: Reimplement WQI Calculator 🔴

**File:** `src/features/hmpi-engine/services/wqi-calculator.service.ts`

**Current Issues:**
- Missing special pH handling (absolute deviation)
- Need to verify step-by-step calculation matches Flutter
- Precision and rounding verification

**New Implementation:**
```typescript
/**
 * WQI Calculator - EXACT implementation from Flutter reference
 * 
 * Formula (Brown et al., 1972):
 * K = 1 / Σ(1/Sn)
 * Wi = K × (1/Sn)
 * Qi = ((Vn - Vo) / (Sn - Vo)) × 100
 * Special: For pH, use absolute deviation
 * WQI = Σ(Wi × Qi)
 */
export class WQICalculatorService {
  static calculate(
    params: Record<string, number>,
    customStandards?: Record<string, { Sn: number; Vo: number }>
  ): WQIResult | null {
    const standards = customStandards || WQI_STANDARDS;

    // Step 1: Calculate 1/Sn for each parameter
    const validParams: Array<{
      symbol: string;
      Vn: number;
      Sn: number;
      Vo: number;
      invSn: number;
    }> = [];

    for (const [symbol, Vn] of Object.entries(params)) {
      const standard = standards[symbol];
      if (!standard) continue;

      const { Sn, Vo } = standard;

      // Skip if Sn = 0 or Sn = Vo (Flutter validation)
      if (Sn === 0 || Sn === Vo) {
        console.warn(`Skipping ${symbol}: Sn must be > 0 and Sn ≠ Vo`);
        continue;
      }

      const invSn = 1.0 / Sn;
      validParams.push({ symbol, Vn, Sn, Vo, invSn });
    }

    if (validParams.length === 0) {
      return null;
    }

    // Step 2: Calculate sum of 1/Sn
    const sumInvSn = validParams.reduce((sum, p) => sum + p.invSn, 0);

    // Step 3: Calculate K = 1 / sumInvSn
    const K = 1.0 / sumInvSn;

    // Steps 4-7: Calculate Wi, Qi, WiQi, and sum
    let wqi = 0;
    const paramsAnalyzed: string[] = [];
    const weights: Record<string, number> = {};
    const qualityRatings: Record<string, number> = {};
    const contributions: Record<string, number> = {};

    for (const { symbol, Vn, Sn, Vo, invSn } of validParams) {
      // Step 4: Wi = K × (1/Sn)
      const Wi = K * invSn;

      // Step 5: Qi with special handling for pH (EXACT Flutter formula)
      let Qi: number;
      if (symbol.toLowerCase() === 'ph') {
        // Use absolute deviation for pH (Flutter special case)
        Qi = (Math.abs(Vn - Vo) / Math.abs(Sn - Vo)) * 100.0;
      } else {
        // Standard formula for other parameters
        Qi = ((Vn - Vo) / (Sn - Vo)) * 100.0;
      }

      // Step 6: WiQi = Wi × Qi
      const WiQi = Wi * Qi;

      // Step 7: Accumulate WQI
      wqi += WiQi;

      paramsAnalyzed.push(symbol);
      weights[symbol] = Wi;
      qualityRatings[symbol] = Qi;
      contributions[symbol] = WiQi;
    }

    // Round to 2 decimal places (Flutter precision)
    const roundedWQI = Math.round(wqi * 100) / 100;

    return {
      wqi: roundedWQI,
      classification: classifyWQI(roundedWQI),
      paramsAnalyzed,
      weights,
      qualityRatings,
      contributions,
      K,
      sumInvSn,
    };
  }
}
```

**Test Validation:**
```typescript
// Add unit test with Flutter test case
const testInput = {
  pH: 7.9, EC: 100.33, TDS: 67.22, TH: 40.67,
  Ca: 55.61, Mg: 6.48, Fe: 0.05, F: 0.02, Turb: 1.3
};
const result = WQICalculatorService.calculate(testInput);
expect(result.wqi).toBeCloseTo(15.24, 2);
expect(result.classification).toBe('Excellent');
```

### Phase 5: Remove Unused Calculators ❌

**Files to Delete:**
```
src/features/hmpi-engine/services/cdeg-calculator.service.ts
src/features/hmpi-engine/services/hei-calculator.service.ts
src/features/hmpi-engine/services/pig-calculator.service.ts
```

**Database Schema Updates:**
```typescript
// In src/features/hmpi-engine/shared/schema.ts
// Remove or mark as deprecated:
- cdeg: doublePrecision('cdeg'),
- cdeg_classification: varchar('cdeg_classification', { length: 100 }),
- hei: doublePrecision('hei'),
- hei_classification: varchar('hei_classification', { length: 100 }),
- pig: doublePrecision('pig'),
- pig_classification: varchar('pig_classification', { length: 100 }),
```

**Migration File:**
```sql
-- Create migration: remove_unused_indices.sql
ALTER TABLE water_quality_calculations 
  DROP COLUMN IF EXISTS cdeg,
  DROP COLUMN IF EXISTS cdeg_classification,
  DROP COLUMN IF EXISTS hei,
  DROP COLUMN IF EXISTS hei_classification,
  DROP COLUMN IF EXISTS pig,
  DROP COLUMN IF EXISTS pig_classification;
```

**Update calculation.service.ts:**
```typescript
// Remove references to:
import { CDEGCalculatorService } from './cdeg-calculator.service';
import { HEICalculatorService } from './hei-calculator.service';
import { PIGCalculatorService } from './pig-calculator.service';

// Remove from calculateAllIndices method:
- cdegResult = CDEGCalculatorService.calculate(...)
- heiResult = HEICalculatorService.calculate(...)
- pigResult = PIGCalculatorService.calculate(...)
```

### Phase 6: Update Orchestration Service 🔄

**File:** `src/features/hmpi-engine/services/calculation.service.ts`

**Actions:**
1. Update `calculateAllIndices` to only call HPI, MI, WQI
2. Remove CDEG, HEI, PIG calculation logic
3. Update result interfaces to remove unused fields
4. Verify error handling matches Flutter validation logic

**Updated Method:**
```typescript
static calculateAllIndices(rows: ParsedCSVRow[]): StationCalculationResult[] {
  return rows.map((row) => {
    const errors: string[] = [];

    // Calculate HPI
    const hpiResult = HPICalculatorService.calculate(row.metals);

    // Calculate MI
    const miResult = MICalculatorService.calculate(row.metals);

    // Calculate WQI
    const wqiResult = WQICalculatorService.calculate(row.wqiParams);

    // Validation: At least one index should be calculable
    if (!hpiResult && !miResult && !wqiResult) {
      errors.push('No calculable indices found - insufficient data');
    }

    return {
      station_id: row.station_id,
      latitude: row.latitude,
      longitude: row.longitude,
      state: row.state,
      city: row.city,
      hpi: hpiResult?.hpi ?? null,
      hpi_classification: hpiResult?.classification ?? null,
      mi: miResult?.mi ?? null,
      mi_classification: miResult?.classification ?? null,
      mi_class: miResult?.miClass ?? null,
      wqi: wqiResult?.wqi ?? null,
      wqi_classification: wqiResult?.classification ?? null,
      metals_analyzed: [
        ...(hpiResult?.metalsAnalyzed ?? []),
        ...(miResult?.metalsAnalyzed ?? []),
      ].filter((v, i, a) => a.indexOf(v) === i), // Unique metals
      wqi_params_analyzed: wqiResult?.paramsAnalyzed ?? [],
      errors,
    };
  });
}
```

### Phase 7: CSV Parsing Enhancements 📊

**File:** `src/features/hmpi-engine/services/csv-parser.service.ts`

**Actions:**
1. Add new column aliases from water_quality_template.csv
2. Verify unit conversion (mg/L → ppb for heavy metals)
3. Add better error messages for missing columns
4. Validate data types and ranges

**Enhanced Aliases:**
```typescript
// Add to METAL_COLUMN_ALIASES:
METAL_COLUMN_ALIASES = {
  // ... existing ...
  Se: ['se', 'selenium'],
  Mo: ['mo', 'molybdenum'],
  Ag: ['ag', 'silver'],
  Ba: ['ba', 'barium'],
  Sb: ['sb', 'antimony'],
  Co: ['co', 'cobalt'],
  V: ['v', 'vanadium'],
  U: ['u', 'uranium'],
};

// Add to WQI_COLUMN_ALIASES:
WQI_COLUMN_ALIASES = {
  // ... existing ...
  TH: ['th', 'total_hardness', 'hardness', 'caco3'], // NEW
  Turbidity: ['turbidity', 'turb', 'ntu', 'hazen'],  // NEW
  B: ['b', 'boron'],
  NH3: ['nh3-n', 'nh3', 'ammonia'],
  Cl: ['cl', 'chloride'],
  SO4: ['so4', 'sulfate', 'sulphate'],
  NO3: ['no3', 'nitrate'],
};

// Add to LOCATION_COLUMN_ALIASES:
LOCATION_COLUMN_ALIASES = {
  // ... existing ...
  year: ['year', 'sampling_year', 'date'],
};
```

**Unit Conversion Verification:**
```typescript
// Ensure heavy metals are in ppb (µg/L)
// Water quality params in their native units (mg/L, µS/cm, NTU, etc.)

function detectUnit(columnName: string, value: number): string {
  // Logic to detect if value is in mg/L or ppb
  // If metal column and value < 10, likely mg/L → convert to ppb
  // Otherwise assume ppb
}
```

### Phase 8: Update Interfaces & Types 🔧

**File:** `src/features/hmpi-engine/shared/interface.ts`

**Actions:**
1. Remove CDEG, HEI, PIG fields
2. Add detailed breakdown fields for transparency
3. Update return types to match new calculator outputs

**Updated Interfaces:**
```typescript
export interface HPIResult {
  hpi: number;
  classification: HPIClassification;
  metalsAnalyzed: string[];
  // NEW: Add breakdown for transparency
  subIndices?: Record<string, number>;      // Qi values
  unitWeights?: Record<string, number>;     // Wi values
  contributions?: Record<string, number>;   // WiQi values
}

export interface MIResult {
  mi: number;
  classification: MIClassification;
  miClass: MIClass;
  metalsAnalyzed: string[];
  // NEW: Add breakdown for transparency
  ratios?: Record<string, number>;          // Ci/MACi values
  concentrations?: Record<string, number>;  // Ci values
}

export interface WQIResult {
  wqi: number;
  classification: WQIClassification;
  paramsAnalyzed: string[];
  // NEW: Add breakdown for transparency
  weights?: Record<string, number>;         // Wi values
  qualityRatings?: Record<string, number>;  // Qi values
  contributions?: Record<string, number>;   // WiQi values
  K?: number;                               // Proportionality constant
  sumInvSn?: number;                        // Sum of 1/Sn
}

export interface WaterQualityCalculation {
  id: number;
  upload_id: number;
  station_id: string;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
  city: string | null;
  hpi: number | null;
  hpi_classification: HPIClassification | null;
  mi: number | null;
  mi_classification: MIClassification | null;
  mi_class: MIClass | null;
  wqi: number | null;
  wqi_classification: WQIClassification | null;
  // REMOVE: cdeg, cdeg_classification, hei, hei_classification, pig, pig_classification
  metals_analyzed: string[] | null;
  wqi_params_analyzed: string[] | null;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: string | null;
}
```

### Phase 9: Update Database Schema 💾

**File:** `src/features/hmpi-engine/shared/schema.ts`

**Actions:**
1. Remove unused index columns
2. Create migration script
3. Update seed data if any

**Migration Script:**
```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Apply migration
```

**Schema Changes:**
```typescript
// In schema.ts, remove:
cdeg: doublePrecision('cdeg'),
cdeg_classification: varchar('cdeg_classification', { length: 100 }),
hei: doublePrecision('hei'),
hei_classification: varchar('hei_classification', { length: 100 }),
pig: doublePrecision('pig'),
pig_classification: varchar('pig_classification', { length: 100 }),
```

### Phase 10: Comprehensive Testing 🧪

**Unit Tests:**
```typescript
// tests/unit/hmpi-engine/hpi-calculator.test.ts
describe('HPICalculatorService', () => {
  it('should match Flutter test case exactly', () => {
    const input = { As: 0.048, Cu: 2.54, Zn: 43.89, Hg: 2.83, Cd: 0.06, Ni: 0.095, Pb: 0.215 };
    const result = HPICalculatorService.calculate(input);
    expect(result?.hpi).toBeCloseTo(146.34, 2);
    expect(result?.classification).toBe('Unsuitable - Critical pollution');
  });
});

// tests/unit/hmpi-engine/mi-calculator.test.ts
describe('MICalculatorService', () => {
  it('should match Flutter test case exactly', () => {
    const input = { As: 269.58, Cd: 6.22, Cu: 554.98, Pb: 10.59, Hg: 0.17, Ni: 61.83, Zn: 2587.05 };
    const result = MICalculatorService.calculate(input);
    expect(result?.mi).toBeCloseTo(12.3293, 4);
    expect(result?.miClass).toBe('Class VI');
  });
});

// tests/unit/hmpi-engine/wqi-calculator.test.ts
describe('WQICalculatorService', () => {
  it('should match Flutter test case exactly', () => {
    const input = { pH: 7.9, EC: 100.33, TDS: 67.22, TH: 40.67, Ca: 55.61, Mg: 6.48, Fe: 0.05, F: 0.02, Turb: 1.3 };
    const result = WQICalculatorService.calculate(input);
    expect(result?.wqi).toBeCloseTo(15.24, 2);
    expect(result?.classification).toBe('Excellent');
  });
  
  it('should handle pH with absolute deviation', () => {
    const input = { pH: 6.5 }; // Acidic pH
    const result = WQICalculatorService.calculate(input);
    // Should use |6.5 - 7| / |8.5 - 7| = 0.5 / 1.5 = 0.333... → Qi ≈ 33.33
    expect(result).not.toBeNull();
  });
});
```

**Integration Tests:**
```typescript
// tests/integration/hmpi-engine/csv-processing.test.ts
describe('CSV Processing Integration', () => {
  it('should process water_quality_template.csv correctly', async () => {
    const csvBuffer = fs.readFileSync('./src/features/hmpi-engine/data/water_quality_template.csv');
    const result = await WaterQualityCalculationService.processCSV(csvBuffer, 1, 1);
    
    expect(result.processed_stations).toBeGreaterThan(0);
    expect(result.calculations).toBeDefined();
    // Verify at least one calculation has all three indices
    const withAllIndices = result.calculations.filter(c => c.hpi && c.mi && c.wqi);
    expect(withAllIndices.length).toBeGreaterThan(0);
  });
});
```

**Manual Testing Checklist:**
- [ ] Upload sample CSV with known values
- [ ] Verify HPI calculation matches Flutter output
- [ ] Verify MI calculation matches Flutter output
- [ ] Verify WQI calculation matches Flutter output
- [ ] Test with missing columns (should skip gracefully)
- [ ] Test with invalid data (should report errors)
- [ ] Test pH edge case (acidic vs alkaline)
- [ ] Test API response format unchanged
- [ ] Test download functionality still works

### Phase 11: Documentation Updates 📝

**Files to Update:**
1. `src/features/hmpi-engine/README.md` - Remove CDEG, HEI, PIG references
2. `CHANGELOG.md` - Add migration notes
3. API documentation - Update response schemas

**Changelog Entry:**
```markdown
## [2.0.0] - 2025-12-XX

### BREAKING CHANGES
- Removed CDEG, HEI, and PIG indices (not scientifically validated)
- Database schema updated to remove unused columns

### Changed
- **HPI Calculator**: Reimplemented with exact Flutter/Dart formula
- **MI Calculator**: Verified against Flutter test cases
- **WQI Calculator**: Added special pH handling (absolute deviation)
- Updated metal standards to match BIS 10500:2012 / WHO Guidelines
- Enhanced CSV column detection with water_quality_template.csv aliases

### Added
- Detailed calculation breakdowns in API responses (Wi, Qi, WiQi values)
- Unit test coverage matching Flutter test cases
- Better validation and error messages

### Fixed
- Precision issues in calculations
- Edge case handling (Si = Ii, MAC = 0, etc.)
- pH quality rating calculation for WQI
```

---

## 3. Risk Assessment & Mitigation

### 3.1 Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes to API | HIGH | LOW | Keep API structure unchanged, only update calculations |
| Data loss during migration | HIGH | LOW | Create backup before schema changes |
| Different results from old system | MEDIUM | HIGH | Expected - document differences, validate with test cases |
| Performance degradation | LOW | LOW | New code is simpler, should be faster |
| Frontend incompatibility | MEDIUM | LOW | API response format unchanged |

### 3.2 Rollback Plan

If issues arise:
1. Revert database migration: `npm run db:rollback`
2. Restore backed-up calculator services
3. Re-deploy previous version
4. Keep migration plan for future retry

### 3.3 Validation Strategy

**Pre-deployment:**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing with sample data
- [ ] Compare results with Flutter app
- [ ] Code review completed

**Post-deployment:**
- [ ] Monitor error logs for 48 hours
- [ ] Compare calculation results with previous system
- [ ] Verify API response times
- [ ] User acceptance testing

---

## 4. Timeline Estimate

| Phase | Estimated Time | Priority |
|-------|----------------|----------|
| Phase 1: Constants & Standards | 2 hours | 🔴 Critical |
| Phase 2: HPI Calculator | 4 hours | 🔴 Critical |
| Phase 3: MI Calculator | 3 hours | 🟡 High |
| Phase 4: WQI Calculator | 4 hours | 🔴 Critical |
| Phase 5: Remove Unused | 1 hour | 🟢 Medium |
| Phase 6: Orchestration | 2 hours | 🟡 High |
| Phase 7: CSV Parsing | 2 hours | 🟡 High |
| Phase 8: Interfaces | 1 hour | 🟢 Medium |
| Phase 9: Database Schema | 1 hour | 🟡 High |
| Phase 10: Testing | 6 hours | 🔴 Critical |
| Phase 11: Documentation | 2 hours | 🟢 Medium |
| **TOTAL** | **28 hours** (~3.5 days) | |

---

## 5. Success Criteria

✅ **Code Quality:**
- All calculators match Flutter formulas exactly
- Unit tests achieve 100% coverage on calculation logic
- Integration tests pass with sample CSV data

✅ **Accuracy:**
- HPI test case: Expected 146.33519 ± 0.01
- MI test case: Expected 12.3292525 ± 0.0001
- WQI test case: Expected 15.24 ± 0.01

✅ **Functionality:**
- API endpoints remain unchanged
- CSV upload and processing works
- Download functionality intact
- Error handling improved

✅ **Performance:**
- Calculation time < 2 seconds for 100 stations
- No memory leaks
- Database queries optimized

---

## 6. References

**Flutter/Dart Source Code:**
- `hmpi-computation/hpi/` - Heavy Metal Pollution Index
- `hmpi-computation/mi/` - Metal Index
- `hmpi-computation/wqi/` - Water Quality Index

**Standards:**
- BIS 10500:2012 - Indian Standard for Drinking Water
- WHO Guidelines for Drinking-water Quality (4th Edition)
- Brown et al. (1972) - WQI Methodology
- Caeiro et al. (2005) - Metal Index Classification

**Test Data:**
- `water_quality_template.csv` - CSV format reference
- Flutter test cases in `*_test_cases.dart` files

---

## 7. Next Steps (Post-Review)

After plan approval:
1. Create feature branch: `feature/accurate-hmpi-calculations`
2. Begin Phase 1 implementation
3. Commit after each phase completion
4. Request code review after Phase 10
5. Deploy to staging for validation
6. Deploy to production with monitoring

---

**Plan Status:** 📋 AWAITING REVIEW  
**Prepared by:** AI Assistant  
**Review Required by:** @harshalpatil  

---

## Appendix A: Flutter Formula Summary

### HPI Formula (Step-by-Step)
```
Given: Mi (measured), Si (standard), Ii (ideal) - all in ppb

Step 1: Wi = 1 / Si
Step 2: Di = |Mi - Ii|
Step 3: Qi = (Di / (Si - Ii)) × 100
Step 4: WiQi = Wi × Qi
Step 5: HPI = Σ(WiQi) / Σ(Wi)
```

### MI Formula (Step-by-Step)
```
Given: Ci (concentration), MACi (max allowable) - all in ppb

Step 1: ratio_i = Ci / MACi
Step 2: MI = Σ(ratio_i)
```

### WQI Formula (Step-by-Step)
```
Given: Vn (measured), Sn (standard), Vo (ideal)

Step 1: invSn_i = 1 / Sn_i
Step 2: sumInvSn = Σ(invSn_i)
Step 3: K = 1 / sumInvSn
Step 4: Wi_i = K × invSn_i
Step 5: Qi_i = ((Vn_i - Vo_i) / (Sn_i - Vo_i)) × 100
        Special for pH: Qi_pH = (|Vn - Vo| / |Sn - Vo|) × 100
Step 6: WiQi_i = Wi_i × Qi_i
Step 7: WQI = Σ(WiQi_i)
```

---

**END OF MIGRATION PLAN**
