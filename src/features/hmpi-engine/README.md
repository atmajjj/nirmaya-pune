# HMPI Engine Feature - Frontend Integration Guide

## Overview

The HMPI Engine (Heavy Metal Pollution Index Engine) calculates water quality indices from CSV data. It computes three key indices:

- **HPI** (Heavy Metal Pollution Index) - Measures heavy metal contamination
- **MI** (Metal Index) - Indicates overall metal pollution level
- **WQI** (Water Quality Index) - Assesses general water quality

The system automatically detects relevant columns in uploaded CSV files, performs calculations, and stores results for analysis.

## Base URL

```
/api/hmpi-engine
```

## Authentication Requirements

| Endpoint | Authentication | Authorization |
|----------|----------------|---------------|
| `POST /preview` | ✅ Required | Admin, Scientist, Policymaker |
| `POST /calculate` | ✅ Required | Admin, Scientist, Policymaker |
| `GET /calculations` | ✅ Required | Admin, Scientist, Policymaker |
| `GET /calculations/:id` | ✅ Required | Admin, Scientist, Policymaker |
| `GET /uploads/:upload_id/download` | ✅ Required | Admin, Scientist, Policymaker |
| `GET /stats` | ✅ Required | Admin, Scientist, Policymaker |

> **Note:** The `researcher` role does NOT have access to HMPI Engine endpoints.

---

## Endpoints

### 1. Preview CSV

Preview a CSV file before calculation. Detects available columns and shows which indices can be calculated.

**Endpoint:** `POST /api/hmpi-engine/preview`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | CSV file to preview (max 10MB) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "All indices (HPI, MI, WQI) can be calculated from this file.",
  "data": {
    "filename": "water_quality_data.csv",
    "total_rows": 150,
    "valid_rows": 148,
    "detected_columns": {
      "station_id": "Station Name",
      "latitude": "Lat",
      "longitude": "Long",
      "state": "State",
      "city": "City"
    },
    "available_calculations": {
      "hpi": {
        "available": true,
        "metals_found": ["As", "Pb", "Cd", "Hg", "Cu", "Zn", "Ni", "Cr", "Fe", "Mn"],
        "missing_metals": ["Al", "Ba", "Se"]
      },
      "mi": {
        "available": true,
        "metals_found": ["As", "Pb", "Cd", "Hg", "Cu", "Zn", "Ni", "Cr", "Fe", "Mn"],
        "missing_metals": ["Al", "Ba", "Se"]
      },
      "wqi": {
        "available": true,
        "params_found": ["pH", "TDS", "TH", "Ca", "Mg", "F"],
        "missing_params": ["EC", "Turbidity"]
      }
    },
    "warnings": [
      "2 rows skipped due to missing station_id"
    ]
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | No file uploaded |
| `400` | Bad Request | Invalid file type (must be CSV) |
| `400` | Bad Request | File too large (> 10MB) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User role not authorized |

---

### 2. Calculate Indices

Upload a CSV file and calculate HPI, MI, and WQI indices for all stations.

**Endpoint:** `POST /api/hmpi-engine/calculate`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | CSV file with water quality data (max 10MB) |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Successfully calculated indices for 150 stations",
  "data": {
    "upload_id": 42,
    "total_stations": 150,
    "processed_stations": 150,
    "failed_stations": 0,
    "calculations": [
      {
        "id": 1001,
        "station_id": "WQ-001",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "state": "Delhi",
        "city": "New Delhi",
        "hpi": 45.67,
        "hpi_classification": "Good - Low to medium pollution",
        "mi": 0.85,
        "mi_classification": "Pure",
        "mi_class": "Class II",
        "wqi": 38.42,
        "wqi_classification": "Good",
        "metals_analyzed": ["As", "Pb", "Cd", "Cu", "Zn", "Ni", "Cr", "Fe", "Mn"],
        "wqi_params_analyzed": ["pH", "TDS", "TH", "Ca", "Mg", "F"]
      }
    ],
    "errors": []
  }
}
```

#### Partial Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Processed 145 of 150 stations. 5 stations had errors.",
  "data": {
    "upload_id": 43,
    "total_stations": 150,
    "processed_stations": 145,
    "failed_stations": 5,
    "calculations": [...],
    "errors": [
      {
        "row": 23,
        "station_id": "WQ-023",
        "message": "No valid metal values found"
      },
      {
        "row": 47,
        "station_id": "WQ-047",
        "message": "Invalid numeric value for As"
      }
    ]
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | No file uploaded |
| `400` | Bad Request | Invalid file type (must be CSV) |
| `400` | Bad Request | File too large (> 10MB) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User role not authorized |
| `422` | Unprocessable Entity | No valid data found in CSV |

---

### 3. List Calculations

Get paginated list of all calculations with filtering and sorting options.

**Endpoint:** `GET /api/hmpi-engine/calculations`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (min: 1) |
| `limit` | number | `20` | Items per page (max: 100) |
| `upload_id` | number | - | Filter by upload ID |
| `state` | string | - | Filter by state |
| `city` | string | - | Filter by city |
| `hpi_min` | number | - | Minimum HPI value |
| `hpi_max` | number | - | Maximum HPI value |
| `mi_min` | number | - | Minimum MI value |
| `mi_max` | number | - | Maximum MI value |
| `wqi_min` | number | - | Minimum WQI value |
| `wqi_max` | number | - | Maximum WQI value |
| `classification` | string | - | Filter by any classification |
| `sort_by` | string | `created_at` | Sort field: `hpi`, `mi`, `wqi`, `created_at`, `station_id` |
| `sort_order` | string | `desc` | Sort order: `asc`, `desc` |

#### Example Request

```
GET /api/hmpi-engine/calculations?state=Delhi&hpi_max=50&sort_by=hpi&sort_order=asc&page=1&limit=20
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Water quality calculations retrieved successfully",
  "data": [
    {
      "id": 1001,
      "upload_id": 42,
      "station_id": "WQ-001",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "state": "Delhi",
      "city": "New Delhi",
      "hpi": 25.34,
      "hpi_classification": "Good - Low to medium pollution",
      "mi": 0.45,
      "mi_classification": "Pure",
      "mi_class": "Class II",
      "wqi": 32.18,
      "wqi_classification": "Good",
      "metals_analyzed": ["As", "Pb", "Cd", "Cu", "Zn"],
      "wqi_params_analyzed": ["pH", "TDS", "TH"],
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

### 4. Get Calculation

Get a single calculation by ID with optional detailed analysis.

**Endpoint:** `GET /api/hmpi-engine/calculations/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Calculation ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_analysis` | string | `false` | Include detailed analysis (`true`/`false`) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Calculation retrieved successfully",
  "data": {
    "id": 1001,
    "upload_id": 42,
    "station_id": "WQ-001",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "state": "Delhi",
    "city": "New Delhi",
    "hpi": 45.67,
    "hpi_classification": "Good - Low to medium pollution",
    "mi": 0.85,
    "mi_classification": "Pure",
    "mi_class": "Class II",
    "wqi": 38.42,
    "wqi_classification": "Good",
    "metals_analyzed": ["As", "Pb", "Cd", "Cu", "Zn", "Ni", "Cr", "Fe", "Mn"],
    "wqi_params_analyzed": ["pH", "TDS", "TH", "Ca", "Mg", "F"],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User role not authorized |
| `404` | Not Found | Calculation not found |

---

### 5. Download Results

Download all calculation results for an upload as a CSV file.

**Endpoint:** `GET /api/hmpi-engine/uploads/:upload_id/download`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `upload_id` | number | Upload ID |

#### Success Response

**Status Code:** `200 OK`

**Content-Type:** `text/csv`

**Content-Disposition:** `attachment; filename="water_quality_results_upload_42_2024-01-15.csv"`

```csv
Station ID,Latitude,Longitude,State,City,HPI,HPI Classification,MI,MI Classification,MI Class,WQI,WQI Classification,Metals Analyzed,WQI Parameters Analyzed,Calculated At
WQ-001,28.6139,77.2090,Delhi,New Delhi,45.67,Good - Low to medium pollution,0.8500,Pure,Class II,38.42,Good,As; Pb; Cd; Cu; Zn,pH; TDS; TH,2024-01-15T10:30:00.000Z
WQ-002,28.5355,77.3910,Delhi,Noida,52.34,Poor - Medium pollution,1.2300,Slightly Affected,Class III,55.67,Poor,As; Pb; Cd; Cu; Zn,pH; TDS; TH,2024-01-15T10:30:00.000Z
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User role not authorized |
| `404` | Not Found | No calculations found for this upload |

---

### 6. Get Statistics

Get aggregate statistics for all calculations with optional filtering.

**Endpoint:** `GET /api/hmpi-engine/stats`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin, Scientist, Policymaker

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | Filter by state |
| `date_from` | string | Start date (ISO 8601 format) |
| `date_to` | string | End date (ISO 8601 format) |

#### Example Request

```
GET /api/hmpi-engine/stats?state=Delhi&date_from=2024-01-01T00:00:00Z
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "total_calculations": 1250,
    "total_uploads": 15,
    "hpi_stats": {
      "min": 12.45,
      "max": 145.67,
      "avg": 52.34,
      "by_classification": {
        "Excellent - Low pollution": 245,
        "Good - Low to medium pollution": 520,
        "Poor - Medium pollution": 312,
        "Very Poor - High pollution": 128,
        "Unsuitable - Critical pollution": 45
      }
    },
    "mi_stats": {
      "min": 0.12,
      "max": 8.45,
      "avg": 1.87,
      "by_classification": {
        "Very Pure": 180,
        "Pure": 420,
        "Slightly Affected": 380,
        "Moderately Affected": 185,
        "Strongly Affected": 62,
        "Seriously Affected": 23
      }
    },
    "wqi_stats": {
      "min": 15.23,
      "max": 156.78,
      "avg": 48.92,
      "by_classification": {
        "Excellent": 210,
        "Good": 485,
        "Poor": 345,
        "Very Poor": 155,
        "Unfit for consumption": 55
      }
    },
    "geographic_coverage": {
      "states": ["Delhi", "Haryana", "Uttar Pradesh", "Rajasthan"],
      "cities": 45
    }
  }
}
```

---

## CSV File Format

### Required Columns

The CSV file should contain at least one of these identifier columns:

| Column | Aliases | Description |
|--------|---------|-------------|
| Station ID | `station_id`, `station`, `location`, `site`, `sample_id`, `id`, `name` | Unique station identifier |

### Optional Location Columns

| Column | Aliases | Description |
|--------|---------|-------------|
| Latitude | `latitude`, `lat` | Decimal degrees |
| Longitude | `longitude`, `lng`, `lon`, `long` | Decimal degrees |
| State | `state`, `province`, `region` | State/Province name |
| City | `city`, `district`, `town`, `village`, `area` | City/District name |

### Heavy Metal Columns (for HPI & MI)

Values should be in **ppb (µg/L)** or **mg/L** (automatically converted).

| Symbol | Aliases | Standard (ppb) |
|--------|---------|----------------|
| As | `as`, `arsenic` | 50 |
| Pb | `pb`, `lead` | 10 |
| Cd | `cd`, `cadmium` | 5 |
| Hg | `hg`, `mercury` | 2 |
| Cu | `cu`, `copper` | 1500 |
| Zn | `zn`, `zinc` | 15000 |
| Ni | `ni`, `nickel` | 70 |
| Cr | `cr`, `chromium` | 50 |
| Fe | `fe`, `iron` | 300 |
| Mn | `mn`, `manganese` | 300 |
| Al | `al`, `aluminum`, `aluminium` | 200 |
| Ba | `ba`, `barium` | 700 |
| Se | `se`, `selenium` | 10 |
| Ag | `ag`, `silver` | 100 |
| Mo | `mo`, `molybdenum` | 70 |
| Sb | `sb`, `antimony` | 20 |
| Co | `co`, `cobalt` | 50 |
| V | `v`, `vanadium` | 100 |
| U | `u`, `uranium` | 30 |

### WQI Parameter Columns

| Symbol | Aliases | Standard | Unit |
|--------|---------|----------|------|
| pH | `ph` | 8.5 | - |
| EC | `ec`, `electrical_conductivity`, `conductivity` | 300 | µS/cm |
| TDS | `tds`, `total_dissolved_solids` | 500 | mg/L |
| TH | `th`, `total_hardness`, `hardness` | 300 | mg/L |
| Ca | `ca`, `calcium` | 75 | mg/L |
| Mg | `mg`, `magnesium` | 30 | mg/L |
| F | `f`, `fluoride` | 1 | mg/L |
| Turbidity | `turbidity`, `turb`, `ntu` | 5 | NTU |

### Example CSV

```csv
Station ID,Latitude,Longitude,State,City,As,Pb,Cd,Cu,Zn,pH,TDS,TH
WQ-001,28.6139,77.2090,Delhi,New Delhi,15.5,8.2,1.5,120,450,7.2,320,180
WQ-002,28.5355,77.3910,Delhi,Noida,22.3,12.1,2.8,95,380,7.8,410,220
WQ-003,28.4089,77.3178,Haryana,Faridabad,18.7,6.5,0.9,85,290,7.0,280,150
```

---

## Index Classifications

### HPI (Heavy Metal Pollution Index)

| Range | Classification | Description |
|-------|----------------|-------------|
| < 25 | Excellent - Low pollution | Water is safe for drinking |
| 25-50 | Good - Low to medium pollution | Acceptable quality |
| 50-75 | Poor - Medium pollution | Treatment recommended |
| 75-100 | Very Poor - High pollution | Not suitable for drinking |
| > 100 | Unsuitable - Critical pollution | Severely contaminated |

### MI (Metal Index)

| Range | Class | Classification | Description |
|-------|-------|----------------|-------------|
| < 0.3 | Class I | Very Pure | Pristine water quality |
| 0.3-1 | Class II | Pure | Good quality |
| 1-2 | Class III | Slightly Affected | Minor contamination |
| 2-4 | Class IV | Moderately Affected | Moderate contamination |
| 4-6 | Class V | Strongly Affected | Significant contamination |
| ≥ 6 | Class VI | Seriously Affected | Severe contamination |

### WQI (Water Quality Index)

| Range | Classification | Description |
|-------|----------------|-------------|
| 0-25 | Excellent | High quality water |
| 26-50 | Good | Suitable for drinking |
| 51-75 | Poor | Treatment needed |
| 76-100 | Very Poor | Not suitable for drinking |
| > 100 | Unfit for consumption | Severely degraded |

---

## Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HMPI ENGINE CALCULATION FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

1. PREVIEW (Optional but Recommended)
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │ ─────▶ │   Preview   │
   │  Upload     │ /preview │   Analyzes  │        │   Results   │
   │  CSV        │         │   Columns   │        │   Returned  │
   └─────────────┘          └─────────────┘        └─────────────┘
                                                          │
                                    Shows available indices + warnings
                                                          │
2. CALCULATE                                              ▼
   ┌─────────────┐         ┌─────────────────────────────────────────┐
   │  Frontend   │ ──POST──▶│            BACKEND PROCESSING           │
   │  Upload     │ /calculate│                                        │
   │  CSV        │         │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
   └─────────────┘          │  │ Parse    │─▶│ Calculate│─▶│ Store  │ │
                            │  │ CSV      │  │ HPI,MI,  │  │ Results│ │
                            │  │ Rows     │  │ WQI      │  │ in DB  │ │
                            │  └──────────┘  └──────────┘  └────────┘ │
                            └─────────────────────────────────────────┘
                                                │
3. VIEW RESULTS                                 ▼
   ┌─────────────┐         ┌─────────────┐
   │  Frontend   │◀────────│   Return    │
   │  Display    │ Results │   upload_id │
   │  Results    │         │   + data    │
   └─────────────┘         └─────────────┘

4. LIST / FILTER / DOWNLOAD
   ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──GET───▶│   Backend   │
   │  Table/     │ /calculations│ Queries DB│
   │  Charts     │ or /download│           │
   └─────────────┘          └─────────────┘
```

---

## Frontend Implementation Example

### TypeScript Service

```typescript
// hmpi-engine.service.ts

const API_BASE = '/api/hmpi-engine';

interface CSVPreviewResult {
  filename: string;
  total_rows: number;
  valid_rows: number;
  detected_columns: {
    station_id: string | null;
    latitude: string | null;
    longitude: string | null;
    state: string | null;
    city: string | null;
  };
  available_calculations: {
    hpi: { available: boolean; metals_found: string[]; missing_metals: string[] };
    mi: { available: boolean; metals_found: string[]; missing_metals: string[] };
    wqi: { available: boolean; params_found: string[]; missing_params: string[] };
  };
  warnings: string[];
}

interface Calculation {
  id: number;
  upload_id: number;
  station_id: string;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
  city: string | null;
  hpi: number | null;
  hpi_classification: string | null;
  mi: number | null;
  mi_classification: string | null;
  mi_class: string | null;
  wqi: number | null;
  wqi_classification: string | null;
  metals_analyzed: string[] | null;
  wqi_params_analyzed: string[] | null;
  created_at: string;
}

interface CalculationResult {
  upload_id: number;
  total_stations: number;
  processed_stations: number;
  failed_stations: number;
  calculations: Calculation[];
  errors: Array<{ row: number; station_id?: string; message: string }>;
}

// Get auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Preview CSV file
export const previewCSV = async (file: File): Promise<CSVPreviewResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/preview`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// Calculate indices
export const calculateIndices = async (file: File): Promise<CalculationResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// List calculations with filters
export const listCalculations = async (params: {
  page?: number;
  limit?: number;
  upload_id?: number;
  state?: string;
  city?: string;
  sort_by?: 'hpi' | 'mi' | 'wqi' | 'created_at' | 'station_id';
  sort_order?: 'asc' | 'desc';
}): Promise<{ calculations: Calculation[]; total: number }> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  const response = await fetch(`${API_BASE}/calculations?${searchParams}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch calculations');
  }

  const result = await response.json();
  return { calculations: result.data, total: result.pagination.total };
};

// Download results as CSV
export const downloadResults = async (uploadId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/uploads/${uploadId}/download`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to download results');
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'results.csv';

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Get statistics
export const getStats = async (params?: {
  state?: string;
  date_from?: string;
  date_to?: string;
}): Promise<any> => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
  }

  const response = await fetch(`${API_BASE}/stats?${searchParams}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }

  const { data } = await response.json();
  return data;
};
```

### React Upload Component

```tsx
// HMPIUploader.tsx

import { useState } from 'react';
import { previewCSV, calculateIndices, CSVPreviewResult, CalculationResult } from './hmpi-engine.service';

export function HMPIUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreviewResult | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreview(null);
    setResult(null);

    // Auto-preview on file selection
    setLoading(true);
    try {
      const previewResult = await previewCSV(selectedFile);
      setPreview(previewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const calcResult = await calculateIndices(file);
      setResult(calcResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hmpi-uploader">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>Processing...</p>}
      {error && <p className="error">{error}</p>}

      {preview && (
        <div className="preview">
          <h3>Preview: {preview.filename}</h3>
          <p>Rows: {preview.valid_rows} / {preview.total_rows}</p>
          
          <h4>Available Calculations:</h4>
          <ul>
            <li>
              HPI: {preview.available_calculations.hpi.available ? '✅' : '❌'}
              {preview.available_calculations.hpi.available && 
                ` (${preview.available_calculations.hpi.metals_found.length} metals)`}
            </li>
            <li>
              MI: {preview.available_calculations.mi.available ? '✅' : '❌'}
            </li>
            <li>
              WQI: {preview.available_calculations.wqi.available ? '✅' : '❌'}
              {preview.available_calculations.wqi.available && 
                ` (${preview.available_calculations.wqi.params_found.length} params)`}
            </li>
          </ul>

          {preview.warnings.length > 0 && (
            <div className="warnings">
              <h4>Warnings:</h4>
              <ul>
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <button onClick={handleCalculate} disabled={loading}>
            Calculate Indices
          </button>
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Calculation Complete!</h3>
          <p>
            Processed: {result.processed_stations} / {result.total_stations} stations
          </p>
          {result.failed_stations > 0 && (
            <p className="warning">
              {result.failed_stations} stations had errors
            </p>
          )}
          <p>Upload ID: {result.upload_id}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "file",
      "message": "Invalid file type"
    }
  ]
}
```

---

## Related Endpoints

- **Upload Feature**: `/api/uploads` - General file upload management
- **Auth Feature**: `/api/auth` - User authentication
