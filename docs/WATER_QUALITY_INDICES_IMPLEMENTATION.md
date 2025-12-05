# Water Quality Indices Feature - Implementation Plan

## 📋 Overview

This feature enables automated calculation of water quality indices (HPI, MI, WQI) from CSV uploads. Scientists upload measurement data, and the system calculates pollution indices for each location/station.

---

## 🎯 Feature Summary

| Aspect | Details |
|--------|---------|
| **Indices Calculated** | HPI (Heavy Metal Pollution Index), MI (Metal Index), WQI (Water Quality Index) |
| **Input** | CSV file with measurements per location/station |
| **Output** | JSON API response + Downloadable CSV with all indices |
| **Access** | All roles EXCEPT `researcher` |
| **Storage** | Database stores final index values only (not calculation breakdown) |
| **Location Support** | Latitude, Longitude, State, City per station |

---

## 📐 Index Formulas

### 1. HPI (Heavy Metal Pollution Index)

**Purpose**: Measures heavy metal contamination level in water.

**Formulas**:
```
Wi = 1 / Si                           (Unit Weight)
Qi = (|Mi - Ii| / (Si - Ii)) × 100    (Sub-index)
HPI = Σ(Wi × Qi) / Σ(Wi)              (Final HPI)
```

**Where**:
- `Mi` = Measured concentration (ppb)
- `Si` = Standard permissible limit (ppb) - from BIS/WHO
- `Ii` = Ideal value (ppb) - from BIS/WHO

**Classification**:
| HPI Range | Classification |
|-----------|----------------|
| < 25 | Excellent - Low pollution |
| 25-50 | Good - Low to medium pollution |
| 50-75 | Poor - Medium pollution |
| 75-100 | Very Poor - High pollution |
| > 100 | Unsuitable - Critical pollution |

**Required Metals**: As, Cu, Zn, Hg, Cd, Ni, Pb (minimum)

---

### 2. MI (Metal Index)

**Purpose**: Alternative contamination metric using MAC values.

**Formula**:
```
MI = Σ (Ci / MACi)    for i = 1...n metals
```

**Where**:
- `Ci` = Mean concentration of metal i (ppb)
- `MACi` = Maximum Allowable Concentration (ppb)

**Classification** (Caeiro et al., 2005):
| MI Range | Class | Classification |
|----------|-------|----------------|
| < 0.3 | I | Very Pure |
| 0.3 - 1 | II | Pure |
| 1 - 2 | III | Slightly Affected |
| 2 - 4 | IV | Moderately Affected |
| 4 - 6 | V | Strongly Affected |
| ≥ 6 | VI | Seriously Affected |

---

### 3. WQI (Water Quality Index)

**Purpose**: General water quality assessment using physical/chemical parameters.

**Formulas** (Brown et al., 1972):
```
Step 1: invSn = 1 / Sn
Step 2: sumInvSn = Σ(invSn)
Step 3: K = 1 / sumInvSn
Step 4: Wi = K × invSn              (Relative Weight, normalized)
Step 5: Qi = ((Vn - Vo) / (Sn - Vo)) × 100   (Quality Rating)
Step 6: WQI = Σ(Wi × Qi)
```

**Where**:
- `Vn` = Measured value
- `Sn` = BIS standard (permissible limit)
- `Vo` = Ideal value (7 for pH, 0 for others)

**Classification**:
| WQI Range | Classification |
|-----------|----------------|
| 0-25 | Excellent |
| 26-50 | Good |
| 51-75 | Poor |
| 76-100 | Very Poor |
| > 100 | Unfit for consumption |

**Parameters**: pH, EC, TDS, TH (Total Hardness), Ca, Mg, Fe, F, Turbidity

---

## 📁 CSV Input Format

### Expected CSV Structure

The system will accept CSV files with the following flexible structure:

```csv
Station_ID,Latitude,Longitude,State,City,As,Cu,Zn,Hg,Cd,Ni,Pb,pH,EC,TDS,TH,Ca,Mg,Fe,F,Turbidity
Station 1,19.0760,72.8777,Maharashtra,Mumbai,0.048,2.54,43.89,2.83,0.06,0.095,0.215,7.9,100.33,67.22,40.67,55.61,6.48,0.05,0.02,1.3
Station 2,18.5204,73.8567,Maharashtra,Pune,0.212,21.48,212.56,1.45,1.2,2.581,2.542,4.6,310,473.7,239.33,45.05,16.5,0.38,0.06,2.48
```

### Column Mapping Strategy

The system will use intelligent column mapping:

1. **Location Columns** (case-insensitive):
   - `station_id`, `station`, `location`, `site`, `sample_id` → Station identifier
   - `latitude`, `lat` → Latitude
   - `longitude`, `lng`, `lon`, `long` → Longitude
   - `state`, `province` → State
   - `city`, `district`, `town` → City

2. **Heavy Metal Columns** (for HPI & MI):
   - Symbol-based: `As`, `Cu`, `Zn`, `Hg`, `Cd`, `Ni`, `Pb`, `Cr`, `Fe`, `Mn`
   - Name-based: `Arsenic`, `Copper`, `Zinc`, `Mercury`, `Cadmium`, `Nickel`, `Lead`
   - Unit suffix handling: `As (ppb)`, `Cu_ppb`, `Arsenic_ug/L`

3. **WQI Parameter Columns**:
   - `pH`, `EC`, `TDS`, `TH`, `Ca`, `Mg`, `Fe`, `F`, `Turbidity`
   - Alternates: `Calcium`, `Magnesium`, `Iron`, `Fluoride`, `Total_Hardness`

### Unit Handling

- Default assumption: Heavy metals in **ppb (µg/L)**
- If column header includes unit (e.g., `As (mg/L)`), auto-convert
- Conversion: 1 mg/L = 1000 ppb

---

## 🗄️ Database Schema

### New Table: `water_quality_calculations`

```sql
CREATE TABLE water_quality_calculations (
  id SERIAL PRIMARY KEY,
  
  -- Reference to uploaded file
  upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  
  -- Station/Location identification
  station_id VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  state VARCHAR(100),
  city VARCHAR(100),
  
  -- Calculated indices (only final values, not breakdown)
  hpi DECIMAL(10, 4),
  hpi_classification VARCHAR(50),
  mi DECIMAL(10, 4),
  mi_classification VARCHAR(50),
  mi_class VARCHAR(10),  -- Class I, II, III, etc.
  wqi DECIMAL(10, 4),
  wqi_classification VARCHAR(50),
  
  -- Metadata
  metals_analyzed TEXT[],      -- Array of metal symbols used
  wqi_params_analyzed TEXT[],  -- Array of WQI parameters used
  
  -- Audit fields
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by INTEGER,
  deleted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_upload_id (upload_id),
  INDEX idx_station (station_id),
  INDEX idx_location (latitude, longitude),
  INDEX idx_state_city (state, city)
);
```

### Update: `uploads` Table

Add fields to track calculation status:

```sql
ALTER TABLE uploads ADD COLUMN calculation_status VARCHAR(20) DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'failed', 'partial'

ALTER TABLE uploads ADD COLUMN calculation_error TEXT;
ALTER TABLE uploads ADD COLUMN result_file_path TEXT;  -- S3 path for result CSV
ALTER TABLE uploads ADD COLUMN result_file_url TEXT;
ALTER TABLE uploads ADD COLUMN total_stations INTEGER;
ALTER TABLE uploads ADD COLUMN processed_stations INTEGER;
```

---

## 📂 Feature Structure

```
src/features/water-quality/
├── apis/
│   ├── upload-and-calculate.ts    # POST /water-quality/calculate - Upload CSV & trigger calculation
│   ├── get-calculations.ts        # GET /water-quality/calculations - List all calculations
│   ├── get-calculation-by-id.ts   # GET /water-quality/calculations/:id - Single calculation details
│   ├── get-calculations-by-upload.ts  # GET /water-quality/uploads/:uploadId/calculations
│   ├── download-results.ts        # GET /water-quality/uploads/:uploadId/download - Download result CSV
│   ├── delete-calculation.ts      # DELETE /water-quality/calculations/:id
│   └── get-statistics.ts          # GET /water-quality/statistics - Aggregated stats
├── shared/
│   ├── schema.ts                  # Drizzle schema for water_quality_calculations
│   ├── interface.ts               # TypeScript interfaces
│   ├── queries.ts                 # Reusable database queries
│   └── constants.ts               # Metal definitions, standards, classifications
├── services/
│   ├── csv-parser.service.ts      # CSV parsing with column mapping
│   ├── hpi-calculator.service.ts  # HPI calculation logic
│   ├── mi-calculator.service.ts   # MI calculation logic
│   ├── wqi-calculator.service.ts  # WQI calculation logic
│   ├── calculation-orchestrator.service.ts  # Coordinates all calculations
│   └── result-generator.service.ts  # Generates result CSV
├── tests/
│   ├── unit/
│   │   ├── hpi-calculator.test.ts
│   │   ├── mi-calculator.test.ts
│   │   ├── wqi-calculator.test.ts
│   │   └── csv-parser.test.ts
│   └── integration/
│       └── water-quality.test.ts
└── index.ts                       # Feature router
```

---

## 🔌 API Endpoints

### 1. Upload & Calculate

```
POST /api/v1/water-quality/calculate
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: CSV file (required)
- description: string (optional)

Response (201):
{
  "success": true,
  "message": "Calculation completed successfully",
  "data": {
    "upload_id": 123,
    "total_stations": 100,
    "processed_stations": 100,
    "failed_stations": 0,
    "calculations": [
      {
        "id": 1,
        "station_id": "Station 1",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "city": "Mumbai",
        "hpi": 146.33,
        "hpi_classification": "Unsuitable - Critical pollution",
        "mi": 12.33,
        "mi_classification": "Seriously Affected",
        "mi_class": "Class VI",
        "wqi": 15.24,
        "wqi_classification": "Excellent",
        "metals_analyzed": ["As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb"],
        "wqi_params_analyzed": ["pH", "EC", "TDS", "TH", "Ca", "Mg", "Fe", "F", "Turbidity"]
      },
      // ... more stations
    ],
    "download_url": "/api/v1/water-quality/uploads/123/download"
  }
}
```

### 2. List Calculations

```
GET /api/v1/water-quality/calculations?page=1&limit=20&state=Maharashtra
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- state: string (filter by state)
- city: string (filter by city)
- hpi_min: number (filter HPI >= value)
- hpi_max: number (filter HPI <= value)
- classification: string (filter by any classification)
- upload_id: number (filter by upload)
- sort_by: string (hpi, mi, wqi, created_at)
- sort_order: asc | desc

Response (200):
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### 3. Download Results CSV

```
GET /api/v1/water-quality/uploads/:uploadId/download
Authorization: Bearer <token>

Response: CSV file download

CSV Content:
Station_ID,Latitude,Longitude,State,City,HPI,HPI_Classification,MI,MI_Classification,MI_Class,WQI,WQI_Classification,Metals_Analyzed,WQI_Params_Analyzed
Station 1,19.0760,72.8777,Maharashtra,Mumbai,146.33,Unsuitable - Critical pollution,12.33,Seriously Affected,Class VI,15.24,Excellent,"As,Cu,Zn,Hg,Cd,Ni,Pb","pH,EC,TDS,TH,Ca,Mg,Fe,F,Turbidity"
```

### 4. Get Statistics

```
GET /api/v1/water-quality/statistics
Authorization: Bearer <token>

Query Parameters:
- state: string (optional, filter by state)
- date_from: ISO date
- date_to: ISO date

Response (200):
{
  "success": true,
  "data": {
    "total_calculations": 5000,
    "total_uploads": 50,
    "by_hpi_classification": {
      "Excellent - Low pollution": 500,
      "Good - Low to medium pollution": 1200,
      "Poor - Medium pollution": 1800,
      "Very Poor - High pollution": 1000,
      "Unsuitable - Critical pollution": 500
    },
    "by_state": {
      "Maharashtra": 1500,
      "Karnataka": 1000,
      // ...
    },
    "averages": {
      "hpi": 65.4,
      "mi": 3.2,
      "wqi": 45.6
    }
  }
}
```

---

## 🔒 Access Control

| Role | Upload & Calculate | View Results | Download CSV | Delete |
|------|-------------------|--------------|--------------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Scientist | ✅ | ✅ | ✅ | Own only |
| Researcher | ❌ | ❌ | ❌ | ❌ |
| Policymaker | ✅ | ✅ | ✅ | ❌ |

Implementation:
```typescript
// Middleware to exclude researcher role
export const excludeResearcher = requireRole(['admin', 'scientist', 'policymaker']);
```

---

## 📊 Predefined Standards

### Heavy Metal Standards (BIS 10500:2012 / WHO)

| Metal | Symbol | Si (ppb) | Ii (ppb) | MAC (ppb) |
|-------|--------|----------|----------|-----------|
| Arsenic | As | 50 | 10 | 50 |
| Copper | Cu | 1500 | 50 | 1500 |
| Zinc | Zn | 15000 | 5000 | 15000 |
| Mercury | Hg | 2 | 1 | 1 |
| Cadmium | Cd | 5 | 3 | 3 |
| Nickel | Ni | 70 | 20 | 20 |
| Lead | Pb | 10 | 0 | 10 |
| Chromium | Cr | 50 | 0 | 50 |
| Iron | Fe | 300 | 100 | 300 |
| Manganese | Mn | 300 | 100 | 100 |

### WQI Parameters (BIS Standards)

| Parameter | Symbol | Sn (Standard) | Vo (Ideal) | Unit |
|-----------|--------|---------------|------------|------|
| pH | pH | 8.5 | 7 | - |
| Electrical Conductivity | EC | 300 | 0 | µS/cm |
| Total Dissolved Solids | TDS | 500 | 0 | mg/L |
| Total Hardness | TH | 300 | 0 | mg/L |
| Calcium | Ca | 75 | 0 | mg/L |
| Magnesium | Mg | 30 | 0 | mg/L |
| Iron | Fe | 0.3 | 0 | mg/L |
| Fluoride | F | 1 | 0 | mg/L |
| Turbidity | Turb | 5 | 0 | NTU |

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)
- [ ] Create database schema and migrations
- [ ] Set up feature folder structure
- [ ] Implement TypeScript interfaces and constants
- [ ] Create CSV parser service with column mapping

### Phase 2: Calculators (Day 2-3)
- [ ] Implement HPI calculator service
- [ ] Implement MI calculator service
- [ ] Implement WQI calculator service
- [ ] Write unit tests for each calculator
- [ ] Verify against test datasets

### Phase 3: API Endpoints (Day 3-4)
- [ ] Upload & Calculate endpoint
- [ ] List calculations endpoint
- [ ] Download results endpoint
- [ ] Statistics endpoint
- [ ] Integration tests

### Phase 4: Polish & Testing (Day 4-5)
- [ ] Error handling for malformed CSVs
- [ ] Partial calculation support (some indices if data incomplete)
- [ ] Performance optimization for large CSVs
- [ ] End-to-end testing
- [ ] Documentation

---

## 🧪 Test Verification

Using the provided test datasets:

### HPI Test Case (Station 1 from heavy_metals_ppb.csv)
- Input: As=0.048, Cu=2.54, Zn=43.89, Hg=2.83, Cd=0.06, Ni=0.095, Pb=0.215
- Expected HPI: **146.33** (Unsuitable - Critical pollution)

### MI Test Case (Station 1 from MI.csv)
- Input: As=269.58, Cd=6.22, Cu=554.98, Pb=10.59, Hg=0.17, Ni=61.83, Zn=2587.05
- Expected MI: **12.33** (Class VI - Seriously Affected)

### WQI Test Case (Site 1 from WQI input.csv)
- Input: pH=7.9, EC=100.33, TDS=67.22, TH=40.67, Ca=55.61, Mg=6.48, Fe=0.05, F=0.02, Turb=1.3
- Expected WQI: **~15.24** (Excellent)

---

## 📝 Notes

1. **Graceful Degradation**: If a CSV doesn't have all columns for all indices, calculate what's possible and note which indices couldn't be calculated.

2. **Validation**: Validate numeric values, handle missing data gracefully (skip that parameter/metal).

3. **Large File Handling**: For CSVs with 1000+ rows, consider async processing with status updates.

4. **Caching**: Cache predefined standards in memory, no need to hit DB for these.

5. **Logging**: Log all calculation details for debugging, but don't store breakdown in DB.

---

## ✅ Acceptance Criteria

1. ✅ Scientists can upload CSV and get all 3 indices calculated
2. ✅ Multiple stations per CSV supported (100+ rows)
3. ✅ Location data (lat/long/state/city) stored per station
4. ✅ Only final index values stored in DB
5. ✅ Downloadable result CSV with all indices
6. ✅ Researchers cannot access this feature
7. ✅ Flexible column mapping (handles variations in CSV headers)
8. ✅ Predefined BIS/WHO standards used
9. ✅ Historical tracking of all calculations
10. ✅ Verified against provided test datasets
