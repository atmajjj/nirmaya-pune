# Policymaker API Documentation

## Overview

The Policymaker API provides endpoints for managing water quality alerts, viewing risk assessments, and downloading location data. This feature is designed for policymakers and administrators to monitor water quality across different regions.

**Base URL:** `/api/policymaker`

**Authentication:** All endpoints require JWT authentication via Bearer token.

**Access Control:** 
- Most endpoints: `policymaker`, `admin` roles
- Generate alerts: `admin` only

---

## Table of Contents

1. [Alerts Management](#alerts-management)
   - [List Alerts](#1-list-alerts)
   - [Get Alert by ID](#2-get-alert-by-id)
   - [Get Alert Statistics](#3-get-alert-statistics)
   - [Acknowledge Alert](#4-acknowledge-alert)
   - [Resolve Alert](#5-resolve-alert)
   - [Generate Alerts](#6-generate-alerts-admin-only)
2. [Location Data](#location-data)
   - [Get Location Summary](#7-get-location-summary)
   - [Download Locations CSV](#8-download-locations-csv)
3. [Data Types](#data-types)
4. [Risk Level Thresholds](#risk-level-thresholds)
5. [Error Handling](#error-handling)

---

## Alerts Management

### 1. List Alerts

Retrieve a paginated list of alerts with optional filters.

**Endpoint:** `GET /api/policymaker/alerts`

**Access:** `policymaker`, `admin`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-indexed) |
| `limit` | number | No | 20 | Items per page (1-100) |
| `severity` | string | No | - | Filter by severity: `low`, `medium`, `high`, `critical` |
| `status` | string | No | - | Filter by status: `active`, `acknowledged`, `resolved`, `dismissed` |
| `alert_type` | string | No | - | Filter by type: `hpi`, `mi`, `wqi`, `combined` |
| `risk_level` | string | No | - | Filter by risk: `safe`, `moderate`, `unsafe` |
| `state` | string | No | - | Filter by state (partial match) |
| `district` | string | No | - | Filter by district (partial match) |
| `sort_by` | string | No | `created_at` | Sort field: `created_at`, `severity`, `risk_level`, `state` |
| `sort_order` | string | No | `desc` | Sort order: `asc`, `desc` |

#### Example Request

```javascript
// Using fetch
const response = await fetch('/api/policymaker/alerts?page=1&limit=10&severity=critical&status=active', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Using axios
const { data } = await axios.get('/api/policymaker/alerts', {
  params: {
    page: 1,
    limit: 10,
    severity: 'critical',
    status: 'active'
  },
  headers: { Authorization: `Bearer ${token}` }
});
```

#### Response

```json
{
  "success": true,
  "message": "Alerts fetched successfully",
  "data": [
    {
      "id": 1,
      "calculation_id": 42,
      "alert_type": "combined",
      "severity": "critical",
      "status": "active",
      "station_id": "STATION_001",
      "state": "Maharashtra",
      "district": "Pune",
      "location": "Khadki",
      "latitude": 18.5678,
      "longitude": 73.8234,
      "hpi_value": 89.45,
      "hpi_classification": "Very Poor - High pollution",
      "mi_value": 5.23,
      "mi_classification": "Strongly Affected",
      "wqi_value": null,
      "wqi_classification": null,
      "risk_level": "unsafe",
      "title": "⚠️ CRITICAL Water Quality Alert at STATION_001 (HPI: 89.45, MI: 5.23)",
      "description": "Water quality assessment indicates elevated contamination levels...",
      "recommendations": "• Immediate action required...",
      "acknowledged_by": null,
      "acknowledged_at": null,
      "resolution_notes": null,
      "resolved_at": null,
      "created_at": "2024-12-09T10:30:00.000Z",
      "updated_at": "2024-12-09T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 2. Get Alert by ID

Retrieve a single alert by its ID.

**Endpoint:** `GET /api/policymaker/alerts/:id`

**Access:** `policymaker`, `admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Alert ID |

#### Example Request

```javascript
const response = await fetch('/api/policymaker/alerts/1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Response

```json
{
  "success": true,
  "message": "Alert fetched successfully",
  "data": {
    "id": 1,
    "calculation_id": 42,
    "alert_type": "combined",
    "severity": "critical",
    "status": "active",
    "station_id": "STATION_001",
    "state": "Maharashtra",
    "district": "Pune",
    "location": "Khadki",
    "latitude": 18.5678,
    "longitude": 73.8234,
    "hpi_value": 89.45,
    "hpi_classification": "Very Poor - High pollution",
    "mi_value": 5.23,
    "mi_classification": "Strongly Affected",
    "wqi_value": null,
    "wqi_classification": null,
    "risk_level": "unsafe",
    "title": "⚠️ CRITICAL Water Quality Alert at STATION_001",
    "description": "Water quality assessment indicates elevated contamination levels...",
    "recommendations": "• Immediate action required...",
    "acknowledged_by": null,
    "acknowledged_at": null,
    "resolution_notes": null,
    "resolved_at": null,
    "created_at": "2024-12-09T10:30:00.000Z",
    "updated_at": "2024-12-09T10:30:00.000Z"
  }
}
```

#### Error Response (404)

```json
{
  "success": false,
  "message": "Alert not found"
}
```

---

### 3. Get Alert Statistics

Get aggregated statistics for the dashboard.

**Endpoint:** `GET /api/policymaker/alerts/stats`

**Access:** `policymaker`, `admin`

#### Example Request

```javascript
const response = await fetch('/api/policymaker/alerts/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Response

```json
{
  "success": true,
  "message": "Alert statistics fetched successfully",
  "data": {
    "total": 150,
    "by_severity": {
      "low": 20,
      "medium": 45,
      "high": 55,
      "critical": 30
    },
    "by_status": {
      "active": 80,
      "acknowledged": 40,
      "resolved": 25,
      "dismissed": 5
    },
    "by_risk_level": {
      "safe": 0,
      "moderate": 70,
      "unsafe": 80
    },
    "by_state": [
      { "state": "Maharashtra", "count": 35 },
      { "state": "Gujarat", "count": 28 },
      { "state": "Rajasthan", "count": 22 },
      { "state": "Karnataka", "count": 18 }
    ],
    "recent_alerts": [
      {
        "id": 150,
        "calculation_id": 500,
        "alert_type": "combined",
        "severity": "critical",
        "status": "active",
        "station_id": "STATION_500",
        "state": "Maharashtra",
        "risk_level": "unsafe",
        "title": "⚠️ CRITICAL Water Quality Alert...",
        "created_at": "2024-12-09T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Acknowledge Alert

Mark an alert as acknowledged.

**Endpoint:** `PATCH /api/policymaker/alerts/:id/acknowledge`

**Access:** `policymaker`, `admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Alert ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | string | No | Optional acknowledgment notes |

#### Example Request

```javascript
const response = await fetch('/api/policymaker/alerts/1/acknowledge', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notes: 'Reviewed by water quality team. Site inspection scheduled.'
  })
});
```

#### Response

```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "data": {
    "id": 1,
    "status": "acknowledged",
    "acknowledged_by": 5,
    "acknowledged_at": "2024-12-09T14:30:00.000Z"
  }
}
```

#### Error Response (400)

```json
{
  "success": false,
  "message": "Cannot acknowledge alert with status: resolved"
}
```

---

### 5. Resolve Alert

Mark an alert as resolved with resolution notes.

**Endpoint:** `PATCH /api/policymaker/alerts/:id/resolve`

**Access:** `policymaker`, `admin`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Alert ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolution_notes` | string | **Yes** | Notes describing the resolution |

#### Example Request

```javascript
const response = await fetch('/api/policymaker/alerts/1/resolve', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resolution_notes: 'Water treatment plant installed. Follow-up testing shows improved quality.'
  })
});
```

#### Response

```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "id": 1,
    "status": "resolved",
    "resolution_notes": "Water treatment plant installed...",
    "resolved_at": "2024-12-09T16:00:00.000Z"
  }
}
```

#### Error Response (400)

```json
{
  "success": false,
  "message": "Alert is already resolved"
}
```

---

### 6. Generate Alerts (Admin Only)

Generate alerts for a specific upload or regenerate all alerts.

**Endpoint:** `POST /api/policymaker/alerts/generate`

**Access:** `admin` only

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upload_id` | number | No | Generate alerts for specific upload |
| `regenerate_all` | boolean | No | Regenerate all alerts (default: false) |
| `thresholds` | object | No | Custom risk thresholds |

#### Thresholds Object

```typescript
{
  hpi: {
    safe: number,     // HPI < this = safe (default: 25)
    moderate: number  // HPI < this = moderate (default: 75)
  },
  mi: {
    safe: number,     // MI < this = safe (default: 1)
    moderate: number  // MI < this = moderate (default: 4)
  }
}
```

#### Example Requests

**Generate for specific upload:**
```javascript
const response = await fetch('/api/policymaker/alerts/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    upload_id: 42
  })
});
```

**Regenerate all with custom thresholds:**
```javascript
const response = await fetch('/api/policymaker/alerts/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    regenerate_all: true,
    thresholds: {
      hpi: { safe: 20, moderate: 60 },
      mi: { safe: 0.5, moderate: 3 }
    }
  })
});
```

#### Response

```json
{
  "success": true,
  "message": "Alerts generated for upload 42",
  "data": {
    "generated": 15,
    "skipped": 3
  }
}
```

**For regenerate_all:**
```json
{
  "success": true,
  "message": "All alerts regenerated successfully",
  "data": {
    "generated": 150,
    "total_calculations": 500
  }
}
```

---

## Location Data

### 7. Get Location Summary

Get a summary of locations grouped by risk level.

**Endpoint:** `GET /api/policymaker/locations/summary`

**Access:** `policymaker`, `admin`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | string | No | Filter by state (partial match) |
| `year` | number | No | Filter by sampling year |

#### Example Request

```javascript
const response = await fetch('/api/policymaker/locations/summary?state=Maharashtra', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Response

```json
{
  "success": true,
  "message": "Location summary fetched successfully",
  "data": {
    "summary": {
      "total": 500,
      "safe": 200,
      "moderate": 180,
      "unsafe": 120,
      "safe_percentage": "40.0",
      "moderate_percentage": "36.0",
      "unsafe_percentage": "24.0"
    },
    "thresholds": {
      "hpi": {
        "safe": "< 25",
        "moderate": "25 - 75",
        "unsafe": ">= 75"
      },
      "mi": {
        "safe": "< 1",
        "moderate": "1 - 4",
        "unsafe": ">= 4"
      }
    },
    "by_state": [
      { "state": "Maharashtra", "count": 85 },
      { "state": "Gujarat", "count": 72 },
      { "state": "Rajasthan", "count": 65 }
    ],
    "by_year": [
      { "year": 2024, "count": 200 },
      { "year": 2023, "count": 180 },
      { "year": 2022, "count": 120 }
    ]
  }
}
```

---

### 8. Download Locations CSV

Download a CSV file of locations filtered by risk level.

**Endpoint:** `GET /api/policymaker/locations/download`

**Access:** `policymaker`, `admin`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `risk_level` | string | **Yes** | Risk level: `safe`, `moderate`, `unsafe` |
| `state` | string | No | Filter by state (partial match) |
| `year` | number | No | Filter by sampling year |

#### Example Request

```javascript
// Download unsafe locations
const response = await fetch('/api/policymaker/locations/download?risk_level=unsafe', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Trigger file download
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'unsafe_locations.csv';
a.click();
```

#### Response

Returns a CSV file with the following headers:

```csv
station_id,state,district,location,latitude,longitude,year,hpi,hpi_classification,mi,mi_classification,mi_class,risk_level,metals_analyzed
STATION_001,Maharashtra,Pune,Khadki,18.5678,73.8234,2024,89.45,"Very Poor - High pollution",5.23,"Strongly Affected","Class V",unsafe,"As,Cu,Zn,Pb,Cd"
```

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="unsafe_locations_2024-12-09.csv"
```

---

## Data Types

### Alert Response

```typescript
interface AlertResponse {
  id: number;
  calculation_id: number;
  alert_type: 'hpi' | 'mi' | 'wqi' | 'combined';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  station_id: string;
  state: string | null;
  district: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  hpi_value: number | null;
  hpi_classification: string | null;
  mi_value: number | null;
  mi_classification: string | null;
  wqi_value: number | null;
  wqi_classification: string | null;
  risk_level: 'safe' | 'moderate' | 'unsafe';
  title: string;
  description: string | null;
  recommendations: string | null;
  acknowledged_by: number | null;
  acknowledged_at: string | null;  // ISO 8601 date string
  resolution_notes: string | null;
  resolved_at: string | null;      // ISO 8601 date string
  created_at: string;              // ISO 8601 date string
  updated_at: string;              // ISO 8601 date string
}
```

### Alert Statistics

```typescript
interface AlertStats {
  total: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_status: {
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
  };
  by_risk_level: {
    safe: number;
    moderate: number;
    unsafe: number;
  };
  by_state: Array<{ state: string; count: number }>;
  recent_alerts: AlertResponse[];
}
```

### Location Summary

```typescript
interface LocationSummary {
  summary: {
    total: number;
    safe: number;
    moderate: number;
    unsafe: number;
    safe_percentage: string;
    moderate_percentage: string;
    unsafe_percentage: string;
  };
  thresholds: {
    hpi: { safe: string; moderate: string; unsafe: string };
    mi: { safe: string; moderate: string; unsafe: string };
  };
  by_state: Array<{ state: string; count: number }>;
  by_year: Array<{ year: number; count: number }>;
}
```

---

## Risk Level Thresholds

The system uses the following default thresholds to classify locations:

### HPI (Heavy Metal Pollution Index)

| Risk Level | HPI Range | Classification |
|------------|-----------|----------------|
| Safe | < 25 | Excellent - Low pollution |
| Moderate | 25 - 75 | Good to Poor |
| Unsafe | ≥ 75 | Very Poor to Critical |

### MI (Metal Index)

| Risk Level | MI Range | Classification |
|------------|----------|----------------|
| Safe | < 1 | Very Pure to Pure |
| Moderate | 1 - 4 | Slightly to Moderately Affected |
| Unsafe | ≥ 4 | Strongly to Seriously Affected |

### Alert Severity Mapping

| Severity | Condition |
|----------|-----------|
| Critical | HPI > 100 OR MI > 6 |
| High | HPI > 75 OR MI > 4 |
| Medium | HPI > 50 OR MI > 2 |
| Low | Other elevated values |

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error, invalid state transition) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |

### Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "resolution_notes",
      "message": "Resolution notes are required"
    }
  ]
}
```

---

## Frontend Integration Examples

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UseAlertsOptions {
  page?: number;
  limit?: number;
  severity?: string;
  status?: string;
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(options.page || 1),
        limit: String(options.limit || 20),
        ...(options.severity && { severity: options.severity }),
        ...(options.status && { status: options.status }),
      });

      const response = await fetch(`/api/policymaker/alerts?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      const data = await response.json();
      setAlerts(data.data);
      setPagination(data.pagination);
      setLoading(false);
    }

    fetchAlerts();
  }, [options.page, options.limit, options.severity, options.status]);

  return { alerts, loading, pagination };
}
```

### Download CSV Helper

```typescript
async function downloadLocationsCsv(riskLevel: 'safe' | 'moderate' | 'unsafe') {
  const response = await fetch(
    `/api/policymaker/locations/download?risk_level=${riskLevel}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

  if (!response.ok) throw new Error('Download failed');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${riskLevel}_locations_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

---

## API Summary Table

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/policymaker/alerts` | List alerts with filters | policymaker, admin |
| GET | `/api/policymaker/alerts/stats` | Get dashboard statistics | policymaker, admin |
| GET | `/api/policymaker/alerts/:id` | Get single alert | policymaker, admin |
| PATCH | `/api/policymaker/alerts/:id/acknowledge` | Acknowledge alert | policymaker, admin |
| PATCH | `/api/policymaker/alerts/:id/resolve` | Resolve alert | policymaker, admin |
| POST | `/api/policymaker/alerts/generate` | Generate alerts | admin only |
| GET | `/api/policymaker/locations/summary` | Location summary by risk | policymaker, admin |
| GET | `/api/policymaker/locations/download` | Download locations CSV | policymaker, admin |
