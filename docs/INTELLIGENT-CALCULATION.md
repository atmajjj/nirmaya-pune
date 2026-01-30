# Intelligent Dataset Type Detection & Calculation

## Overview
The system now automatically detects what type of water quality data has been uploaded and calculates only the relevant indices based on the parameters present in the dataset.

## How It Works

### 1. Upload Flow
```
Field Technician uploads CSV/XLSX → File stored in S3 → Metadata extracted → 
Auto-calculation triggered → Dataset type detected → Only relevant indices calculated
```

### 2. Dataset Type Detection

#### WQI Detection
The system checks if the uploaded file contains Water Quality Index parameters:
- **Required**: At least 3 WQI parameters from:
  - pH, TDS (Total Dissolved Solids), TH (Total Hardness)
  - F (Fluoride), Cl (Chloride), NO₃ (Nitrate), SO₄ (Sulfate)
  - AK (Alkalinity), Fe (Iron), Turb (Turbidity), COD, BOD, DO

#### HPI/MI Detection
The system checks if the uploaded file contains heavy metal parameters:
- **Required**: At least 2 metal parameters from:
  - As (Arsenic), Cu (Copper), Zn (Zinc), Hg (Mercury)
  - Cd (Cadmium), Ni (Nickel), Pb (Lead), Cr (Chromium)
  - Fe (Iron), Mn (Manganese), Al (Aluminum), Ba (Barium)
  - Se (Selenium), Ag (Silver), Mo (Molybdenum), Sb (Antimony)
  - Co (Cobalt), V (Vanadium), U (Uranium)

### 3. Column Name Matching
The system uses intelligent column name matching with aliases:
- Case-insensitive matching
- Handles spaces, underscores, and hyphens
- Supports multiple variations:
  - `ph`, `pH`, `PH`, `p_h`, `p-h`
  - `tds`, `TDS`, `total_dissolved_solids`
  - `arsenic`, `As`, `as`

### 4. Calculation Logic

```typescript
if (has ≥3 WQI parameters) {
  canCalculateWQI = true
}

if (has ≥2 metal parameters) {
  canCalculateHPI = true
  canCalculateMI = true
}
```

### 5. Database Storage

The `calculated_indices` field stores which indices were calculated:
```json
{
  "wqi": true,   // WQI was calculated
  "hpi": false,  // HPI was not calculated
  "mi": false    // MI was not calculated
}
```

## Examples

### Example 1: Pure WQI Dataset
**Uploaded Columns**: `pH, TDS, TH, Chloride, Fluoride, Nitrate`

**Detection Result**:
- ✅ WQI: 6 parameters found (pH, TDS, TH, Cl, F, NO₃)
- ❌ HPI/MI: No metal parameters

**Calculated Indices**: `{wqi: true, hpi: false, mi: false}`

### Example 2: Pure Metal Dataset
**Uploaded Columns**: `Arsenic, Copper, Zinc, Lead, Chromium`

**Detection Result**:
- ❌ WQI: Only 0 WQI parameters (need ≥3)
- ✅ HPI/MI: 5 metals found (As, Cu, Zn, Pb, Cr)

**Calculated Indices**: `{wqi: false, hpi: true, mi: true}`

### Example 3: Mixed Dataset
**Uploaded Columns**: `pH, TDS, TH, Chloride, Arsenic, Copper, Lead`

**Detection Result**:
- ✅ WQI: 4 parameters found (pH, TDS, TH, Cl)
- ✅ HPI/MI: 3 metals found (As, Cu, Pb)

**Calculated Indices**: `{wqi: true, hpi: true, mi: true}`

### Example 4: Insufficient Data
**Uploaded Columns**: `pH, TDS, Arsenic`

**Detection Result**:
- ❌ WQI: Only 2 parameters (need ≥3)
- ❌ HPI/MI: Only 1 metal (need ≥2)

**Result**: Calculation fails with error message explaining insufficient parameters

## API Response

### Data Sources List
```json
{
  "data_sources": [
    {
      "id": 123,
      "file_name": "water_quality_data.csv",
      "calculation_status": "completed",
      "calculated_indices": {
        "wqi": true,
        "hpi": true,
        "mi": true
      }
    }
  ]
}
```

### Calculation Upload Result
```json
{
  "upload_id": 456,
  "processed_stations": 100,
  "calculated_indices": {
    "wqi": true,
    "hpi": false,
    "mi": false
  }
}
```

## Benefits

1. **Efficiency**: No wasted calculations on inappropriate data
2. **Clarity**: Scientists know exactly which indices were calculated
3. **User Experience**: System adapts to the data provided
4. **Error Prevention**: Clear feedback when data is insufficient
5. **Resource Optimization**: Faster processing, less computation

## Technical Implementation

### Files Modified
1. `src/features/data-sources/services/dataset-type-detector.service.ts` - Detection logic
2. `src/features/data-sources/services/auto-calculation.service.ts` - Integration
3. `src/database/schema.ts` - Added `calculated_indices` field
4. `src/database/migrations/run-auto-calculation-migration.ts` - Migration

### Key Functions
- `detectDatasetType(columns)` - Analyzes columns and returns detection result
- `matchesParameter(column, parameter, aliases)` - Smart column matching
- `getCalculationDescription(detection)` - Human-readable description

## Future Enhancements
- Frontend UI to show calculated vs. not calculated indices
- Filtering data sources by calculation type
- Export options for specific index results
- Manual override for edge cases
