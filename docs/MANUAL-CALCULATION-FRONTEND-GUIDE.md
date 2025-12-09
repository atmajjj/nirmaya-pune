# Manual Water Quality Calculation - Frontend Integration Guide

## Overview

This endpoint allows users to manually enter water quality measurements and calculate HPI (Heavy Metal Pollution Index), MI (Metal Index), and WQI (Water Quality Index) without uploading a file.

**Endpoint:** `POST /api/nirmaya-engine/calculate-manual`

**Access:** Admin, Scientist, Policymaker

---

## API Specification

### Request Format

```http
POST /api/nirmaya-engine/calculate-manual
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body Schema

```json
{
  "station_id": "string (required, max 100 chars)",
  "latitude": "number (optional, -90 to 90)",
  "longitude": "number (optional, -180 to 180)",
  "state": "string (optional, max 100 chars)",
  "city": "string (optional, max 100 chars)",
  "metals": {
    "symbol": "concentration in ppb (µg/L)"
  },
  "wqi_params": {
    "symbol": "parameter value"
  },
  "save_to_database": "boolean (default: true)"
}
```

**Validation Rules:**
- At least one of `metals` or `wqi_params` must be provided with values
- All metal concentrations and WQI parameters must be non-negative numbers
- Station ID is required

---

## Frontend Form Fields

### Section 1: Station Information (Required)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| **Station ID** | text | ✅ Yes | 1-100 chars | Unique identifier for the monitoring station |
| **State** | text/dropdown | ❌ Optional | Max 100 chars | State/Province name |
| **City** | text/dropdown | ❌ Optional | Max 100 chars | City name |
| **Latitude** | number | ❌ Optional | -90 to 90 | GPS latitude coordinate |
| **Longitude** | number | ❌ Optional | -180 to 180 | GPS longitude coordinate |

---

### Section 2: Heavy Metal Concentrations (Optional but recommended for HPI/MI)

**Unit: ppb (µg/L - micrograms per liter)**

All values must be **non-negative numbers**. Leave blank if not measured.

#### Commonly Measured Metals:

| Metal | Symbol | Field Name | Typical Range | Description |
|-------|--------|------------|---------------|-------------|
| **Arsenic** | As | `metals.As` | 0-100 ppb | Highly toxic, common in groundwater |
| **Cadmium** | Cd | `metals.Cd` | 0-10 ppb | Toxic heavy metal |
| **Chromium** | Cr | `metals.Cr` | 0-100 ppb | Industrial pollutant |
| **Copper** | Cu | `metals.Cu` | 0-2000 ppb | Essential but toxic in high doses |
| **Iron** | Fe | `metals.Fe` | 0-1000 ppb | Common in water |
| **Lead** | Pb | `metals.Pb` | 0-50 ppb | Neurotoxin |
| **Mercury** | Hg | `metals.Hg` | 0-5 ppb | Highly toxic |
| **Nickel** | Ni | `metals.Ni` | 0-100 ppb | Allergenic metal |
| **Zinc** | Zn | `metals.Zn` | 0-20000 ppb | Essential micronutrient |

#### Additional Metals (Advanced):

| Metal | Symbol | Field Name | Typical Range |
|-------|--------|------------|---------------|
| **Aluminum** | Al | `metals.Al` | 0-500 ppb |
| **Barium** | Ba | `metals.Ba` | 0-1000 ppb |
| **Manganese** | Mn | `metals.Mn` | 0-500 ppb |
| **Selenium** | Se | `metals.Se` | 0-50 ppb |
| **Silver** | Ag | `metals.Ag` | 0-200 ppb |
| **Molybdenum** | Mo | `metals.Mo` | 0-150 ppb |
| **Antimony** | Sb | `metals.Sb` | 0-40 ppb |
| **Cobalt** | Co | `metals.Co` | 0-100 ppb |
| **Vanadium** | V | `metals.V` | 0-200 ppb |
| **Uranium** | U | `metals.U` | 0-60 ppb |

---

### Section 3: Water Quality Parameters (Optional but recommended for WQI)

All values must be **non-negative numbers**. Leave blank if not measured.

| Parameter | Symbol | Field Name | Unit | Typical Range | Description |
|-----------|--------|------------|------|---------------|-------------|
| **pH** | pH | `wqi_params.pH` | unitless | 0-14 | Acidity/Alkalinity (7 is neutral) |
| **Electrical Conductivity** | EC | `wqi_params.EC` | µS/cm | 0-3000 | Dissolved salt content indicator |
| **Total Dissolved Solids** | TDS | `wqi_params.TDS` | mg/L | 0-2000 | Total dissolved substances |
| **Total Hardness** | TH | `wqi_params.TH` | mg/L | 0-500 | Calcium & Magnesium content |
| **Calcium** | Ca | `wqi_params.Ca` | mg/L | 0-200 | Calcium concentration |
| **Magnesium** | Mg | `wqi_params.Mg` | mg/L | 0-100 | Magnesium concentration |
| **Iron** | Fe | `wqi_params.Fe` | mg/L | 0-1 | Iron concentration |
| **Fluoride** | F | `wqi_params.F` | mg/L | 0-2 | Fluoride concentration |
| **Turbidity** | Turb | `wqi_params.Turbidity` | NTU | 0-100 | Water cloudiness |

---

### Section 4: Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **Save to Database** | checkbox | ✅ true | Save calculation results for future reference |

---

## Frontend Implementation Example

### React/TypeScript Form Structure

```typescript
interface ManualCalculationForm {
  // Station Information
  station_id: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  
  // Heavy Metals (ppb)
  metals: {
    As?: number;
    Cd?: number;
    Cr?: number;
    Cu?: number;
    Fe?: number;
    Pb?: number;
    Hg?: number;
    Ni?: number;
    Zn?: number;
    Al?: number;
    Ba?: number;
    Mn?: number;
    Se?: number;
    Ag?: number;
    Mo?: number;
    Sb?: number;
    Co?: number;
    V?: number;
    U?: number;
  };
  
  // WQI Parameters
  wqi_params: {
    pH?: number;
    EC?: number;
    TDS?: number;
    TH?: number;
    Ca?: number;
    Mg?: number;
    Fe?: number;
    F?: number;
    Turbidity?: number;
  };
  
  // Options
  save_to_database: boolean;
}
```

### Sample Request (JavaScript)

```javascript
const formData = {
  station_id: "STN001",
  state: "Maharashtra",
  city: "Mumbai",
  latitude: 19.0760,
  longitude: 72.8777,
  
  // Heavy metals in ppb (µg/L)
  metals: {
    As: 0.048,
    Cu: 2.54,
    Zn: 43.89,
    Hg: 2.83,
    Cd: 0.06,
    Ni: 0.095,
    Pb: 0.215
  },
  
  // WQI parameters
  wqi_params: {
    pH: 7.9,
    EC: 100.33,
    TDS: 67.22,
    TH: 40.67,
    Ca: 55.61,
    Mg: 6.48,
    Fe: 0.05,
    F: 0.02,
    Turbidity: 1.3
  },
  
  save_to_database: true
};

const response = await fetch('http://localhost:8000/api/nirmaya-engine/calculate-manual', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});

const result = await response.json();
```

---

## Success Response

```json
{
  "success": true,
  "message": "Manual calculation completed successfully",
  "data": {
    "calculation": {
      "station_id": "STN001",
      "location": {
        "latitude": 19.076,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "city": "Mumbai"
      },
      "indices": {
        "hpi": {
          "value": 146.33,
          "classification": "Unsuitable - Critical pollution",
          "metals_analyzed": ["As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb"],
          "metal_count": 7
        },
        "mi": {
          "value": 12.33,
          "classification": "Seriously Affected",
          "class": "Class VI",
          "metals_analyzed": ["As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb"],
          "metal_count": 7
        },
        "wqi": {
          "value": 15.24,
          "classification": "Excellent",
          "params_analyzed": ["pH", "EC", "TDS", "TH", "Ca", "Mg", "Fe", "F", "Turbidity"],
          "param_count": 9
        }
      }
    },
    "validation": {
      "warnings": {
        "metals": [],
        "wqi": []
      },
      "is_valid": true
    },
    "saved_id": 123
  }
}
```

### Response Fields Explanation

| Field | Description |
|-------|-------------|
| `calculation.indices.hpi` | Heavy Metal Pollution Index (0-∞, lower is better) |
| `calculation.indices.mi` | Metal Index (0-∞, <0.3 is Very Pure, >6 is Seriously Affected) |
| `calculation.indices.wqi` | Water Quality Index (0-100+, <25 is Excellent, >100 is Unfit) |
| `validation.warnings` | Array of validation warnings (e.g., missing recommended parameters) |
| `saved_id` | Database ID if `save_to_database` was true, null otherwise |

---

## Error Responses

### 400 Bad Request - Missing Required Data

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "At least one of metals or wqi_params must be provided with values",
    "name": "Error"
  }
}
```

### 400 Bad Request - Invalid Input

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "metals.As: Invalid input: expected number, received string",
    "name": "Error"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "status": 401,
    "message": "Authentication required. No token provided.",
    "name": "Error"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "Access denied. Required role: admin or scientist or policymaker",
    "name": "Error"
  }
}
```

---

## Frontend UI/UX Recommendations

### Form Layout Suggestions

1. **Tabbed Interface:**
   - Tab 1: Station Information
   - Tab 2: Heavy Metals (HPI/MI)
   - Tab 3: Water Quality Parameters (WQI)

2. **Collapsible Sections:**
   - Expand/collapse sections for better mobile experience
   - Show count of filled fields in section headers

3. **Smart Defaults:**
   - Auto-fill common metals (As, Cd, Pb, Hg, Cu, Zn, Ni)
   - Auto-fill common WQI params (pH, TDS, TH, Ca, Mg)

4. **Input Validation:**
   - Real-time validation for number ranges
   - Unit conversion helpers (mg/L ↔ ppb)
   - Highlight out-of-range values

5. **Help Text:**
   - Tooltips explaining each parameter
   - Link to BIS/WHO standards
   - Example values for reference

6. **Results Display:**
   - Color-coded classifications (green = good, red = poor)
   - Visual gauges for each index
   - Detailed breakdown accordion
   - Export/Download options

### Mobile Responsive Considerations

- Single-column layout on mobile
- Larger touch targets for number inputs
- Swipe between sections
- Save progress locally (localStorage)

---

## Testing Examples

### Test Case 1: Only Heavy Metals

```json
{
  "station_id": "TEST-HPI-001",
  "metals": {
    "As": 0.048,
    "Hg": 2.83,
    "Pb": 0.215
  },
  "save_to_database": false
}
```

Expected: HPI and MI calculated, WQI null

### Test Case 2: Only WQI Parameters

```json
{
  "station_id": "TEST-WQI-001",
  "wqi_params": {
    "pH": 7.5,
    "TDS": 120,
    "TH": 85
  },
  "save_to_database": false
}
```

Expected: WQI calculated, HPI and MI null

### Test Case 3: Complete Data

```json
{
  "station_id": "TEST-FULL-001",
  "state": "Test State",
  "metals": {
    "As": 10.5,
    "Cd": 2.3,
    "Pb": 5.8
  },
  "wqi_params": {
    "pH": 7.2,
    "TDS": 150,
    "TH": 95,
    "Ca": 45,
    "Mg": 12
  },
  "save_to_database": true
}
```

Expected: All three indices calculated and saved to database

---

## Integration Checklist

- [ ] Implement form with all required fields
- [ ] Add input validation for number ranges
- [ ] Implement tab/section navigation
- [ ] Add tooltips and help text
- [ ] Handle loading states during calculation
- [ ] Display results with color-coded classifications
- [ ] Add error handling and user-friendly error messages
- [ ] Implement "Clear Form" functionality
- [ ] Add "Save to Database" toggle
- [ ] Test with various input combinations
- [ ] Ensure mobile responsiveness
- [ ] Add print/export functionality for results

---

## Related Documentation

- [Calculate from CSV Upload](/api/nirmaya-engine/calculate)
- [Calculate from Data Source](/api/nirmaya-engine/calculate-from-source)
- [View Calculation Results](/api/nirmaya-engine/calculations)
- [HPI/MI/WQI Methodology](../docs/calculation-methodology.md)
