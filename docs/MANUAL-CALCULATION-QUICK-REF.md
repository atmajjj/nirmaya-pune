# Manual Calculation Endpoint - Quick Reference

## Endpoint Created

✅ **`POST /api/nirmaya-engine/calculate-manual`**

### Purpose
Allows users to manually enter water quality measurements and calculate HPI, MI, and WQI indices without uploading a CSV file.

### Access
- **Admin** ✅
- **Scientist** ✅  
- **Policymaker** ✅
- **Field Technician** ❌
- **Researcher** ❌

---

## Quick Start

### Minimum Request (Station ID + At least one measurement)

```json
POST /api/nirmaya-engine/calculate-manual
Authorization: Bearer <token>

{
  "station_id": "STN001",
  "metals": {
    "As": 10.5,
    "Pb": 5.2
  }
}
```

### Complete Request Example

```json
{
  "station_id": "STN001",
  "state": "Maharashtra",
  "city": "Mumbai",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "metals": {
    "As": 0.048,
    "Cu": 2.54,
    "Zn": 43.89,
    "Hg": 2.83,
    "Cd": 0.06,
    "Ni": 0.095,
    "Pb": 0.215
  },
  "wqi_params": {
    "pH": 7.9,
    "EC": 100.33,
    "TDS": 67.22,
    "TH": 40.67,
    "Ca": 55.61,
    "Mg": 6.48,
    "Fe": 0.05,
    "F": 0.02,
    "Turbidity": 1.3
  },
  "save_to_database": true
}
```

---

## Input Fields Summary

### Required
- `station_id` (string, 1-100 chars)

### Optional Location
- `state`, `city` (string)
- `latitude` (-90 to 90), `longitude` (-180 to 180)

### Heavy Metals (ppb/µg/L) - For HPI/MI Calculation
Common: `As`, `Cd`, `Cr`, `Cu`, `Fe`, `Pb`, `Hg`, `Ni`, `Zn`
Advanced: `Al`, `Ba`, `Mn`, `Se`, `Ag`, `Mo`, `Sb`, `Co`, `V`, `U`

### WQI Parameters - For WQI Calculation
- `pH` (unitless, 0-14)
- `EC` (µS/cm, Electrical Conductivity)
- `TDS` (mg/L, Total Dissolved Solids)
- `TH` (mg/L, Total Hardness)
- `Ca`, `Mg`, `Fe`, `F` (mg/L)
- `Turbidity` (NTU)

### Options
- `save_to_database` (boolean, default: true)

---

## Response Structure

```json
{
  "success": true,
  "message": "Manual calculation completed successfully",
  "data": {
    "calculation": {
      "station_id": "STN001",
      "location": { ... },
      "indices": {
        "hpi": { "value": 146.33, "classification": "...", ... },
        "mi": { "value": 12.33, "classification": "...", ... },
        "wqi": { "value": 15.24, "classification": "...", ... }
      }
    },
    "validation": {
      "warnings": { "metals": [], "wqi": [] },
      "is_valid": true
    },
    "saved_id": 123
  }
}
```

---

## Implementation Files

1. **API Endpoint:** `/src/features/hmpi-engine/apis/calculate-manual.ts`
2. **Route Registration:** `/src/features/hmpi-engine/index.ts`
3. **Frontend Guide:** `/docs/MANUAL-CALCULATION-FRONTEND-GUIDE.md`

---

## Testing

```bash
# Test with curl
curl -X POST http://localhost:8000/api/nirmaya-engine/calculate-manual \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "TEST-001",
    "metals": {"As": 10, "Pb": 5},
    "save_to_database": false
  }'
```

---

## Key Features

✅ No file upload required
✅ Real-time calculation
✅ Supports partial data (metals only OR wqi params only)
✅ Optional database storage
✅ Returns validation warnings
✅ Detailed breakdown of each index

---

## Documentation

📖 **Complete Frontend Guide:** `docs/MANUAL-CALCULATION-FRONTEND-GUIDE.md`
- Detailed field specifications
- Frontend form structure recommendations
- React/TypeScript examples
- UI/UX best practices
- Complete testing examples
