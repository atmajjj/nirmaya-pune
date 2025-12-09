# Formula Editor Feature

Manage calculation formulas for HPI (Heavy Metal Pollution Index), MI (Metal Index), and WQI (Water Quality Index) calculations.

## Overview

The Formula Editor allows administrators and scientists to:
- Create custom formulas with different standards
- Manage parameter values (permissible limits, ideal values)
- Define classification ranges for result interpretation
- Set default formulas for each calculation type

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/formulas` | Create new formula | admin, scientist |
| `GET` | `/api/formulas` | List all formulas | all authenticated |
| `GET` | `/api/formulas/:id` | Get single formula | all authenticated |
| `GET` | `/api/formulas/type/:type` | Get formulas by type | all authenticated |
| `PUT` | `/api/formulas/:id` | Update formula | admin, scientist |
| `DELETE` | `/api/formulas/:id` | Delete formula (soft) | admin only |
| `POST` | `/api/formulas/:id/set-default` | Set as default | admin only |
| `POST` | `/api/formulas/:id/duplicate` | Clone formula | admin, scientist |

## Formula Types

### HPI (Heavy Metal Pollution Index)
Parameters: Si (Standard permissible limit), Ii (Ideal value), MAC (Maximum Allowable Concentration)

```json
{
  "type": "hpi",
  "parameters": {
    "As": { "symbol": "As", "name": "Arsenic", "Si": 50, "Ii": 10, "MAC": 50 },
    "Cu": { "symbol": "Cu", "name": "Copper", "Si": 1500, "Ii": 50, "MAC": 1500 }
  }
}
```

### MI (Metal Index)
Uses same parameters as HPI, primarily MAC values.

### WQI (Water Quality Index)
Parameters: Sn (Standard permissible limit), Vo (Ideal value), unit

```json
{
  "type": "wqi",
  "parameters": {
    "pH": { "symbol": "pH", "name": "pH", "Sn": 8.5, "Vo": 7, "unit": "" },
    "TDS": { "symbol": "TDS", "name": "Total Dissolved Solids", "Sn": 500, "Vo": 0, "unit": "mg/L" }
  }
}
```

## Classification Ranges

Each formula includes classification ranges for interpreting results:

```json
{
  "classification": {
    "ranges": [
      { "max": 25, "label": "Excellent", "severity": 1, "description": "Safe for drinking" },
      { "min": 25, "max": 50, "label": "Good", "severity": 2 },
      { "min": 50, "max": 75, "label": "Poor", "severity": 3 },
      { "min": 75, "max": 100, "label": "Very Poor", "severity": 4 },
      { "min": 100, "label": "Unsuitable", "severity": 5 }
    ]
  }
}
```

## API Examples

### Create Formula

```bash
POST /api/formulas
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "WHO 2024 Standards",
  "type": "hpi",
  "description": "Updated WHO drinking water guidelines 2024",
  "version": "WHO 2024",
  "parameters": {
    "As": { "symbol": "As", "name": "Arsenic", "Si": 10, "Ii": 0, "MAC": 10 },
    "Pb": { "symbol": "Pb", "name": "Lead", "Si": 10, "Ii": 0, "MAC": 10 }
  },
  "classification": {
    "ranges": [
      { "max": 25, "label": "Low pollution", "severity": 1 },
      { "min": 25, "max": 50, "label": "Medium pollution", "severity": 2 },
      { "min": 50, "label": "High pollution", "severity": 3 }
    ]
  },
  "is_default": false,
  "is_active": true
}
```

### List Formulas with Filters

```bash
# Get all formulas
GET /api/formulas

# Filter by type
GET /api/formulas?type=hpi

# Search by name
GET /api/formulas?search=WHO

# Pagination
GET /api/formulas?page=1&limit=10

# Filter by status
GET /api/formulas?is_active=true&is_default=false
```

### Get Formulas by Type

```bash
# Get all HPI formulas
GET /api/formulas/type/hpi

# Get summaries only (for dropdowns)
GET /api/formulas/type/hpi?summary=true

# Get default formula only
GET /api/formulas/type/hpi?default_only=true
```

### Update Formula

```bash
PUT /api/formulas/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Formula Name",
  "description": "Updated description",
  "is_active": false
}
```

### Set Default Formula

```bash
POST /api/formulas/1/set-default
Authorization: Bearer <admin-token>
```

### Duplicate Formula

```bash
POST /api/formulas/1/duplicate
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Copy of WHO Standards"
}
```

## Database Schema

```sql
CREATE TABLE formulas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type TEXT NOT NULL,  -- 'hpi', 'mi', 'wqi'
  description TEXT,
  version VARCHAR(50),
  parameters JSONB NOT NULL,
  classification JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  updated_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);
```

## Default Formulas

The system seeds three default formulas based on BIS 10500:2012 and WHO guidelines:

1. **BIS 10500:2012 / WHO Standards (HPI)** - 19 heavy metals
2. **Standard Metal Index (MI)** - Uses MAC values
3. **BIS Water Quality Index (WQI)** - 9 parameters

Run seed to create defaults:
```bash
npm run db:seed
```

## Integration with Nirmaya Engine

The Formula Service (`formula.service.ts`) provides methods to fetch formulas for calculations:

```typescript
import { getMetalFormulaConfig, getWQIFormulaConfig } from '../services/formula.service';

// Get default HPI formula
const hpiConfig = await getMetalFormulaConfig('hpi');

// Get specific formula by ID
const customConfig = await getMetalFormulaConfig('hpi', formulaId);

// Get WQI formula
const wqiConfig = await getWQIFormulaConfig();
```

## Business Rules

1. **Naming**: Formula names must be unique within the same type
2. **Default**: Only one formula can be default per type
3. **Deletion**: Default formulas cannot be deleted
4. **Inactive**: Inactive formulas cannot be set as default
5. **Type Validation**: HPI/MI formulas require Si, Ii, MAC; WQI requires Sn, Vo, unit

## File Structure

```
src/features/formula-editor/
├── apis/
│   ├── create-formula.ts
│   ├── delete-formula.ts
│   ├── duplicate-formula.ts
│   ├── get-formula.ts
│   ├── get-formulas-by-type.ts
│   ├── list-formulas.ts
│   ├── set-default-formula.ts
│   └── update-formula.ts
├── shared/
│   ├── interface.ts
│   ├── queries.ts
│   └── schema.ts
├── tests/
│   ├── integration/
│   │   ├── fixtures.ts
│   │   └── formula-crud.api.test.ts
│   └── unit/
│       ├── formula-service.test.ts
│       ├── schema.test.ts
│       └── test-helpers.ts
├── seed-formulas.ts
├── index.ts
└── README.md
```

## Response Format

All responses follow the standard format:

```json
{
  "success": true,
  "message": "Formula created successfully",
  "data": {
    "id": 1,
    "name": "WHO 2024 Standards",
    "type": "hpi",
    "description": "...",
    "version": "WHO 2024",
    "parameters": { ... },
    "classification": { ... },
    "is_default": false,
    "is_active": true,
    "created_by": 1,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Validation error (missing/invalid fields) |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Formula not found |
| 409 | Duplicate formula name for type |
