# Standards Management API

## Overview
The Standards Management feature allows scientists and admins to view and modify the water quality standards used in calculations. These standards control the limits and thresholds for:
- **Metal Standards** - Used in HPI (Heavy Metal Pollution Index) and MI (Metal Index) calculations
- **WQI Standards** - Used in WQI (Water Quality Index) calculations

## Authorization
All endpoints require authentication and either **scientist** or **admin** role.

---

## Endpoints

### List Metal Standards
**GET** `/api/standards/metals`

Get all metal standards (active and inactive).

**Response:**
```json
{
  "success": true,
  "message": "Metal standards retrieved successfully",
  "data": [
    {
      "id": 1,
      "symbol": "As",
      "name": "Arsenic",
      "si": "50.000",
      "ii": "10.000",
      "mac": "50.000",
      "unit": "ppb",
      "description": "Arsenic (BIS 10500:2012)",
      "is_active": true,
      "created_by": 1,
      "created_at": "2025-12-09T08:00:00.000Z",
      "updated_by": null,
      "updated_at": null,
      "is_deleted": false,
      "deleted_by": null,
      "deleted_at": null
    }
  ]
}
```

---

### List WQI Standards
**GET** `/api/standards/wqi`

Get all WQI standards (active and inactive).

**Response:** Similar to metal standards response.

---

### Get Single Metal Standard
**GET** `/api/standards/metals/:id`

Get a specific metal standard by ID.

**Parameters:**
- `id` (path) - Metal standard ID

**Response:**
```json
{
  "success": true,
  "message": "Metal standard retrieved successfully",
  "data": {
    "id": 1,
    "symbol": "As",
    "name": "Arsenic",
    "si": "50.000",
    "ii": "10.000",
    "mac": "50.000",
    "unit": "ppb",
    "description": "Arsenic (BIS 10500:2012)",
    "is_active": true
  }
}
```

---

### Get Single WQI Standard
**GET** `/api/standards/wqi/:id`

Get a specific WQI standard by ID.

**Parameters:**
- `id` (path) - WQI standard ID

---

### Update Metal Standard
**PUT** `/api/standards/metals/:id`

Update a metal standard's values.

**Parameters:**
- `id` (path) - Metal standard ID

**Request Body:**
```json
{
  "name": "Arsenic",
  "si": 50,
  "ii": 10,
  "mac": 50,
  "description": "Updated description",
  "is_active": true
}
```

**Field Descriptions:**
- `name` (optional) - Display name of the metal
- `si` (optional) - Standard permissible limit in ppb
- `ii` (optional) - Ideal value in ppb
- `mac` (optional) - Maximum Allowable Concentration in ppb
- `description` (optional) - Additional information
- `is_active` (optional) - Whether this standard is active

**Response:**
```json
{
  "success": true,
  "message": "Metal standard updated successfully",
  "data": {
    "id": 1,
    "symbol": "As",
    "name": "Arsenic",
    "si": "50.000",
    "ii": "10.000",
    "mac": "50.000",
    "unit": "ppb",
    "description": "Updated description",
    "is_active": true,
    "updated_by": 2,
    "updated_at": "2025-12-09T09:00:00.000Z"
  }
}
```

---

### Update WQI Standard
**PUT** `/api/standards/wqi/:id`

Update a WQI standard's values.

**Parameters:**
- `id` (path) - WQI standard ID

**Request Body:**
```json
{
  "name": "pH",
  "sn": 8.5,
  "vo": 7.0,
  "unit": "unitless",
  "description": "Updated pH standard",
  "is_active": true
}
```

**Field Descriptions:**
- `name` (optional) - Display name of the parameter
- `sn` (optional) - Standard permissible limit
- `vo` (optional) - Ideal value
- `unit` (optional) - Unit of measurement
- `description` (optional) - Additional information
- `is_active` (optional) - Whether this standard is active

**Response:** Similar to metal standard update response.

---

## Default Standards

### Metal Standards (19 metals)
Based on BIS 10500:2012 and WHO Guidelines:

| Symbol | Name | Si (ppb) | Ii (ppb) | MAC (ppb) |
|--------|------|----------|----------|-----------|
| As | Arsenic | 50 | 10 | 50 |
| Cu | Copper | 1500 | 50 | 1500 |
| Zn | Zinc | 15000 | 5000 | 15000 |
| Hg | Mercury | 2 | 1 | 1 |
| Cd | Cadmium | 10 | 0 | 3 |
| Ni | Nickel | 70 | 20 | 20 |
| Pb | Lead | 50 | 0 | 10 |
| Cr | Chromium | 50 | 0 | 50 |
| Fe | Iron | 1000 | 300 | 300 |
| Mn | Manganese | 300 | 100 | 100 |
| Al | Aluminum | 200 | 0 | 200 |
| Ba | Barium | 700 | 0 | 700 |
| Se | Selenium | 10 | 0 | 10 |
| Ag | Silver | 100 | 0 | 100 |
| Mo | Molybdenum | 70 | 0 | 70 |
| Sb | Antimony | 20 | 0 | 20 |
| Co | Cobalt | 50 | 0 | 50 |
| V | Vanadium | 100 | 0 | 100 |
| U | Uranium | 30 | 0 | 30 |

### WQI Standards (9 parameters)
Based on BIS 10500:2012:

| Symbol | Name | Sn | Vo | Unit |
|--------|------|----|----|------|
| pH | pH | 8.5 | 7.0 | unitless |
| EC | Electrical Conductivity | 300 | 0 | µS/cm |
| TDS | Total Dissolved Solids | 500 | 0 | mg/L |
| TH | Total Hardness | 200 | 0 | mg/L |
| Ca | Calcium | 75 | 0 | mg/L |
| Mg | Magnesium | 30 | 0 | mg/L |
| Fe | Iron | 0.3 | 0 | mg/L |
| F | Fluoride | 1.0 | 0 | mg/L |
| Turbidity | Turbidity | 5 | 0 | NTU |

---

## How It Works

1. **Initial Setup**: Standards are seeded into the database during initial setup with default BIS 10500:2012 values
2. **Calculations**: The calculation engines (HPI, MI, WQI) automatically use database standards when available
3. **Fallback**: If database standards are unavailable, the system falls back to hardcoded constants
4. **Updates**: Scientists can modify standards, and all new calculations will use the updated values
5. **Audit Trail**: All changes are tracked with `updated_by` and `updated_at` fields

---

## Example Usage

### Update Arsenic Limit
```bash
curl -X PUT http://localhost:8000/api/standards/metals/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "si": 60,
    "description": "Updated based on new research"
  }'
```

### Disable a Standard
```bash
curl -X PUT http://localhost:8000/api/standards/wqi/3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

---

## Notes

- **Symbol cannot be changed** - Metal symbols (As, Cu, etc.) are unique identifiers
- **Positive values only** - Si and MAC must be positive, Ii/Vo can be zero or positive
- **Decimal precision** - Values stored with 3 decimal places
- **Active standards only** - Only `is_active: true` standards are used in calculations
- **Soft deletes** - Standards are never hard-deleted from the database
