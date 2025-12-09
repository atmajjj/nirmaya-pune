# Data Sources Feature - API Documentation

## Overview

The Data Sources feature enables a collaborative workflow between Field Technicians and Scientists for water quality data analysis:

1. **Field Technicians** upload CSV/Excel files with water quality measurements
2. System automatically **processes and validates** the files
3. **Scientists** select processed files for Nirmaya calculations
4. **Researchers and Policymakers** access calculation results

---

## Table of Contents

- [Authentication](#authentication)
- [Role-Based Access](#role-based-access)
- [API Endpoints](#api-endpoints)
  - [Upload Data Source](#1-upload-data-source)
  - [List Data Sources](#2-list-data-sources)
  - [Get Data Source Details](#3-get-data-source-details)
  - [Delete Data Source](#4-delete-data-source)
  - [Reprocess Data Source](#5-reprocess-data-source)
  - [Calculate from Data Source](#6-calculate-from-data-source)
- [Data Models](#data-models)
- [File Processing](#file-processing)
- [Workflows](#workflows)
- [Error Handling](#error-handling)

---

## Authentication

All endpoints require JWT authentication via Bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

Obtain tokens via the `/api/auth/login` endpoint.

---

## Role-Based Access

| Role | Upload Files | View All | View Own | Delete Own | Delete Any | Reprocess | Calculate |
|------|-------------|----------|----------|------------|------------|-----------|-----------|
| **Field Technician** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Scientist** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Policymaker** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Researcher** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## API Endpoints

### 1. Upload Data Source

Upload a CSV or Excel file containing water quality data.

**Endpoint:** `POST /api/data-sources/upload`

**Authorization:** Admin, Scientist, Field Technician

**Content-Type:** `multipart/form-data`

**⚠️ Important:** Do NOT manually set the `Content-Type` header when using FormData. The browser/client will automatically set it with the correct boundary parameter.

**Request Body:**
```
file: <binary file data>  (required)
description: <string>      (optional)
```

**Supported File Types:**
- `.csv` - Comma-separated values
- `.xlsx` - Excel 2007+ format
- `.xls` - Excel 97-2003 format

**Required CSV/Excel Columns:**
- `Station` - Monitoring station identifier
- `Date` - Measurement date
- Water quality parameters (pH, Temperature, DO, etc.)

**Example Request (cURL):**
```bash
curl -X POST http://localhost:8000/api/data-sources/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@water_quality_2024.csv" \
  -F "description=Monthly water quality measurements - December 2024"
```

**Example Request (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileObject); // File from input element
formData.append('description', 'Monthly water quality measurements - December 2024');

const response = await fetch('http://localhost:8000/api/data-sources/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // DO NOT set Content-Type - let the browser handle it
  },
  body: formData
});

const result = await response.json();
```

**Example Request (Axios):**
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('description', 'Monthly water quality measurements - December 2024');

const response = await axios.post('http://localhost:8000/api/data-sources/upload', formData, {
  headers: {
    'Authorization': `Bearer ${token}`
    // Axios automatically sets Content-Type for FormData
  }
});
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "File uploaded successfully. Processing will begin shortly.",
  "data": {
    "id": 1,
    "filename": "1733745123456-water_quality_2024.csv",
    "original_filename": "water_quality_2024.csv",
    "file_type": "csv",
    "mime_type": "text/csv",
    "file_size": 245678,
    "file_url": "https://s3.amazonaws.com/bucket/path/to/file.csv",
    "status": "pending",
    "description": "Monthly water quality measurements - December 2024",
    "uploaded_by": 5,
    "created_at": "2024-12-09T10:30:45.123Z",
    "updated_at": "2024-12-09T10:30:45.123Z"
  }
}
```

**Error Responses:**

**400 Bad Request - No file uploaded:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "No file uploaded. Please ensure you are sending a multipart/form-data request with a file field named \"file\".",
    "name": "Error"
  }
}
```

**400 Bad Request - Invalid multipart request (missing boundary):**
```json
{
  "success": false,
  "message": "Invalid request format. Please ensure you are sending a multipart/form-data request with Content-Type header and file in \"file\" field.",
  "error": "INVALID_MULTIPART_REQUEST"
}
```

**400 Bad Request - Invalid file type:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Invalid file type. Only CSV, XLS, and XLSX files are allowed.",
    "name": "Error"
  }
}
```

**400 Bad Request - File too large:**
```json
{
  "success": false,
  "message": "File size exceeds 50MB limit",
  "error": "FILE_TOO_LARGE"
}
```

**401 Unauthorized:**
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

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "Access denied. Required role: admin or scientist or field_technician",
    "name": "Error"
  }
}
```

**Background Processing:**

After upload, the system automatically:
1. Uploads file to S3 storage
2. Creates database record with status `pending`
3. Returns response immediately to user
4. **Background processing starts** (asynchronous):
   - Changes status from `pending` → `processing`
   - Downloads file from S3
   - Parses CSV/Excel using native parser (no external dependencies)
   - Validates structure and extracts metadata:
     - Total rows and columns
     - Column names
     - Unique stations (from Station/station_id/station_name columns)
     - Date range (from Date/date/timestamp columns)
     - Preview of first 5 rows
5. Updates status to `available` (success) or `failed` (error)
6. Stores extracted metadata in database

**Processing typically completes in 1-5 seconds for most files.**

---

### 2. List Data Sources

Retrieve a paginated list of data sources with filtering and sorting.

**Endpoint:** `GET /api/data-sources`

**Authorization:** All authenticated users

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 10 | Items per page (max 100) |
| `status` | string | - | Filter by status: `pending`, `available`, `processing`, `archived`, `failed` |
| `file_type` | string | - | Filter by type: `csv`, `xlsx`, `xls` |
| `uploaded_by` | integer | - | Filter by uploader user ID |
| `search` | string | - | Search in filename and description |
| `sort_by` | string | `created_at` | Sort field: `created_at`, `filename`, `file_size` |
| `sort_order` | string | `desc` | Sort order: `asc`, `desc` |

**Field Technician Restriction:** Automatically filtered to show only their own uploads

**Example Request:**
```bash
# Get available CSV files, newest first
curl -X GET "https://api.example.com/api/data-sources?status=available&file_type=csv&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Data sources retrieved successfully",
  "data": [
    {
      "id": 5,
      "filename": "1733745123456-station_data.csv",
      "original_filename": "station_data.csv",
      "file_type": "csv",
      "mime_type": "text/csv",
      "file_size": 156789,
      "file_url": "https://s3.amazonaws.com/bucket/...",
      "status": "available",
      "error_message": null,
      "metadata": {
        "total_rows": 1250,
        "column_count": 12,
        "columns": ["Station", "Date", "pH", "Temperature", "DO", "..."],
        "stations": ["STN001", "STN002", "STN003"],
        "date_range": {
          "from": "2024-01-01",
          "to": "2024-12-31"
        }
      },
      "description": "Annual monitoring data",
      "uploaded_by": 3,
      "uploader": {
        "id": 3,
        "full_name": "John Field",
        "email": "john@example.com"
      },
      "created_at": "2024-12-05T08:15:30.000Z",
      "updated_at": "2024-12-05T08:16:45.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### 3. Get Data Source Details

Retrieve detailed information about a specific data source.

**Endpoint:** `GET /api/data-sources/:id`

**Authorization:** All authenticated users

**Path Parameters:**
- `id` - Data source ID (integer)

**Example Request:**
```bash
curl -X GET https://api.example.com/api/data-sources/5 \
  -H "Authorization: Bearer <token>"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Data source retrieved successfully",
  "data": {
    "id": 5,
    "filename": "1733745123456-station_data.csv",
    "original_filename": "station_data.csv",
    "file_type": "csv",
    "mime_type": "text/csv",
    "file_size": 156789,
    "file_url": "https://s3.amazonaws.com/bucket/...",
    "status": "available",
    "error_message": null,
    "metadata": {
      "total_rows": 1250,
      "column_count": 12,
      "columns": ["Station", "Date", "pH", "Temperature", "DO", "BOD", "..."],
      "stations": ["STN001", "STN002", "STN003"],
      "date_range": {
        "from": "2024-01-01",
        "to": "2024-12-31"
      }
    },
    "description": "Annual monitoring data",
    "uploaded_by": 3,
    "uploader": {
      "id": 3,
      "full_name": "John Field",
      "email": "john@example.com"
    },
    "created_at": "2024-12-05T08:15:30.000Z",
    "updated_at": "2024-12-05T08:16:45.000Z"
  }
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Data source not found",
    "name": "Error"
  }
}
```

**403 Forbidden (Field Technician accessing another user's file):**
```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "You do not have permission to view this data source",
    "name": "Error"
  }
}
```

---

### 4. Delete Data Source

Soft delete a data source (file remains in S3, but marked as deleted in database).

**Endpoint:** `DELETE /api/data-sources/:id`

**Authorization:** 
- Field Technicians can delete their own uploads
- Scientists and Admins can delete any data source

**Path Parameters:**
- `id` - Data source ID (integer)

**Example Request:**
```bash
curl -X DELETE https://api.example.com/api/data-sources/5 \
  -H "Authorization: Bearer <token>"
```

**Success Response (204 No Content):**
```
(Empty response body)
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Data source not found",
    "name": "Error"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "You do not have permission to delete this data source",
    "name": "Error"
  }
}
```

**400 Bad Request (File is processing):**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Cannot delete a data source that is currently being processed",
    "name": "Error"
  }
}
```

---

### 5. Reprocess Data Source

Manually trigger reprocessing of a data source (useful if initial processing failed).

**Endpoint:** `POST /api/data-sources/:id/reprocess`

**Authorization:** Admin, Scientist

**Path Parameters:**
- `id` - Data source ID (integer)

**Example Request:**
```bash
curl -X POST https://api.example.com/api/data-sources/5/reprocess \
  -H "Authorization: Bearer <token>"
```

**Success Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Data source reprocessing started. Check back shortly for updated status.",
  "data": null
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Data source not found",
    "name": "Error"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "Access denied. Required role: admin or scientist",
    "name": "Error"
  }
}
```

---

### 6. Calculate from Data Source

Calculate HMPI indices (HPI, MI, WQI) using a pre-uploaded data source.

**Endpoint:** `POST /api/nirmaya-engine/calculate-from-source`

**Authorization:** Admin, Scientist, Policymaker

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "data_source_id": 5
}
```

**Example Request:**
```bash
curl -X POST https://api.example.com/api/nirmaya-engine/calculate-from-source \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"data_source_id": 5}'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Calculation completed successfully",
  "data": {
    "upload_id": 12,
    "total_stations": 3,
    "total_records": 1250,
    "successful_calculations": 1248,
    "failed_calculations": 2,
    "results": [
      {
        "station": "STN001",
        "date": "2024-12-01",
        "hpi": 85.4,
        "mi": 3.2,
        "wqi": 78.6,
        "classification": "Good",
        "parameters_used": 8,
        "missing_parameters": []
      },
      {
        "station": "STN002",
        "date": "2024-12-01",
        "hpi": 92.1,
        "mi": 2.8,
        "wqi": 88.3,
        "classification": "Excellent",
        "parameters_used": 8,
        "missing_parameters": []
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request - Missing data_source_id:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "data_source_id: Invalid input: expected number, received undefined",
    "name": "Error"
  }
}
```

**400 Bad Request - Invalid ID type:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "data_source_id: Invalid input: expected number, received string",
    "name": "Error"
  }
}
```

**400 Bad Request - Negative or zero ID:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "data_source_id: Too small: expected number to be >0",
    "name": "Error"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Data source not found",
    "name": "Error"
  }
}
```

**400 Bad Request - Data source not available:**
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Data source is not available. Current status: pending",
    "name": "Error"
  }
}
```

Possible status values: `pending`, `processing`, `failed`

**403 Forbidden:**
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

## Data Models

### Data Source Object

```typescript
{
  id: number;                    // Unique identifier
  filename: string;              // Generated filename in storage
  original_filename: string;     // Original uploaded filename
  file_type: 'csv' | 'xlsx' | 'xls';
  mime_type: string;             // MIME type
  file_size: number;             // Size in bytes
  file_url: string;              // S3 URL
  status: DataSourceStatus;      // Current processing status
  error_message: string | null;  // Error details if failed
  metadata: FileMetadata | null; // Extracted metadata
  description: string | null;    // User-provided description
  uploaded_by: number;           // User ID of uploader
  uploader: {                    // Uploader details
    id: number;
    full_name: string;
    email: string;
  };
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Data Source Status

```typescript
type DataSourceStatus = 
  | 'pending'      // Uploaded, waiting for processing
  | 'processing'   // Currently being processed
  | 'available'    // Ready for use
  | 'archived'     // Archived (old data)
  | 'failed';      // Processing failed
```

### File Metadata

```typescript
{
  total_rows: number;           // Total data rows (excluding header)
  column_count: number;         // Number of columns
  columns: string[];            // Column names
  stations: string[];           // Unique station identifiers
  date_range: {                 // Date range in data
    from: string;               // YYYY-MM-DD
    to: string;                 // YYYY-MM-DD
  };
}
```

---

## File Processing

### CSV/Excel Requirements

**Required Columns** (case-insensitive):
- `Station`, `station_id`, or `station_name` - Monitoring station identifier
- `Date`, `date`, or `timestamp` - Measurement date/time

**Optional Water Quality Parameters:**
- pH, Temperature, DO (Dissolved Oxygen), BOD, COD, TDS, Turbidity, etc.
- Metal concentrations: As, Cd, Cr, Cu, Fe, Pb, Mn, Ni, Zn, etc.

**Example CSV Structure:**
```csv
Station,Date,pH,Temperature,DO,BOD,COD,TDS,Turbidity
STN001,2024-01-15,7.2,18.5,6.8,3.2,15.4,250,12.3
STN001,2024-02-15,7.4,19.2,7.1,2.8,14.2,245,10.8
STN002,2024-01-15,6.9,17.8,6.5,4.1,18.7,280,15.6
```

### Processing Steps

1. **Upload** - File uploaded to S3, database record created with status `pending`
2. **Response** - API returns immediately with upload confirmation
3. **Background Processing** - Asynchronous processing begins:
   - Status changes to `processing`
   - File downloaded from S3
   - **Native CSV Parser** used (no papaparse dependency - more reliable)
   - Excel files parsed using `xlsx` library
   - Structure validated
4. **Metadata Extraction**:
   - Count rows and columns
   - Extract unique stations (Station/station_id/station_name)
   - Determine date range (Date/date/timestamp)
   - Store column names
   - Generate preview (first 5 rows)
5. **Update Status** - Set to `available` or `failed`
6. **Ready for Use** - Scientists can now select file for calculations

### Processing Time

- Small files (<1MB): ~1-2 seconds
- Medium files (1-10MB): ~5-15 seconds
- Large files (>10MB): ~30+ seconds

### Validation Rules

**File Size:** Maximum 50MB

**File Types:** `.csv`, `.xlsx`, `.xls` only

**Required Columns:** Must include `Station` and `Date`

**Data Format:** 
- Dates should be in YYYY-MM-DD format or recognizable date format
- Numeric values for water quality parameters

---

## Workflows

### Workflow 1: Field Technician Upload

```
1. Field Technician logs in
2. Uploads CSV file via POST /api/data-sources/upload
3. Receives confirmation with status "pending"
4. System processes file in background
5. Field Technician checks status via GET /api/data-sources/:id
6. Status changes to "available" when ready
```

### Workflow 2: Scientist Calculation

```
1. Scientist logs in
2. Lists available data sources: GET /api/data-sources?status=available
3. Reviews metadata to select appropriate file
4. Initiates calculation: POST /api/nirmaya-engine/calculate-from-source
5. Receives calculation results immediately
6. Downloads results if needed
```

### Workflow 3: Error Recovery

```
1. Upload fails with status "failed"
2. Check error_message field for details
3. Admin/Scientist triggers reprocessing: POST /api/data-sources/:id/reprocess
4. System re-attempts processing
5. Status updates to "available" on success
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing parameters, invalid file type, invalid status |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Data source doesn't exist |
| 413 | Payload Too Large | File exceeds 50MB limit |
| 500 | Internal Server Error | Server-side processing error |

### Error Response Format

All errors follow this structure:
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Detailed error message",
    "name": "Error"
  }
}
```

### Validation Errors

Validation errors include field-specific details:
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "data_source_id: Invalid input: expected number, received string",
    "name": "Error"
  }
}
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Authenticated requests:** 100 requests per minute per user
- **Upload endpoint:** 10 uploads per minute per user

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1733745600
```

---

### Best Practices

### For Field Technicians

1. **File Naming:** Use descriptive names including date/location (e.g., `river_monitoring_2024_dec.csv`)
2. **Add Descriptions:** Provide context in the description field
3. **Check Status:** Wait for processing to complete (1-5 seconds) before checking results
4. **Date Format:** Use consistent date format (YYYY-MM-DD recommended)
5. **File Upload:** Use FormData correctly - DO NOT manually set Content-Type header
6. **Column Names:** Ensure Station and Date columns are named correctly (case-insensitive)

### For Scientists

1. **Upload Files:** Scientists can now upload files directly (not just field technicians)
2. **Filter by Status:** Always filter for `status=available` when selecting files for calculations
3. **Review Metadata:** Check station count, date range, and columns before calculating
4. **Batch Processing:** Process multiple files sequentially rather than concurrently
5. **Error Handling:** Check for failed calculations in results
6. **Reprocess Option:** Use reprocess endpoint if a file failed during initial processing

### For Administrators

1. **Monitor Failed Uploads:** Regularly check for files with `status=failed`
2. **Use Reprocess:** Trigger reprocessing instead of re-uploading
3. **Archive Old Data:** Move old files to archived status to keep lists clean

---

## Support & Contact

For technical issues or questions:
- **API Issues:** Contact backend team
- **Authentication:** Contact system administrator
- **Feature Requests:** Submit via issue tracker

---

## Troubleshooting

### "Multipart: Boundary not found" Error

**Cause:** Incorrectly setting Content-Type header when uploading files.

**Solution:**
```javascript
// ❌ WRONG - Causes boundary error
fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data' // ❌ Missing boundary!
  },
  body: formData
});

// ✅ CORRECT - Let browser/client set Content-Type
fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // ✅ No Content-Type header - browser adds it with boundary
  },
  body: formData
});
```

### File Processing Stuck at "pending"

**Cause:** Background processing may have encountered an error.

**Solutions:**
1. Check Docker logs: `docker logs nirmaya-api-dev -f`
2. Wait 10-30 seconds for processing to complete
3. Trigger manual reprocessing: `POST /api/data-sources/:id/reprocess`

### File Shows "failed" Status

**Cause:** Invalid file format, missing required columns, or parsing error.

**Solutions:**
1. Check `error_message` field in the data source object
2. Verify file has required columns (Station, Date)
3. Ensure file is valid CSV/Excel format
4. Try reprocessing: `POST /api/data-sources/:id/reprocess`

### Cannot Upload Large Files

**Cause:** File exceeds 50MB limit.

**Solutions:**
1. Split large files into smaller chunks
2. Remove unnecessary columns
3. Filter data to specific date ranges

---

## Technical Details

### CSV Parsing
- **Library:** Native Node.js parser (no external dependencies)
- **Features:** Handles quoted values, escaped quotes, multi-line fields
- **Performance:** Faster than external libraries, more reliable in Docker

### Excel Parsing
- **Library:** `xlsx` (industry standard)
- **Formats:** .xlsx (Excel 2007+), .xls (Excel 97-2003)
- **Features:** Automatic date conversion, sheet selection

### File Storage
- **Service:** Amazon S3
- **Path:** `data-sources/{userId}/{timestamp}-{filename}`
- **Retention:** Files retained indefinitely (soft delete only)

### Background Processing
- **Method:** `setImmediate()` for non-blocking execution
- **Error Handling:** Comprehensive logging to Docker logs
- **Status Updates:** Real-time status tracking in database

---

**Document Version:** 2.0.0  
**Last Updated:** December 9, 2025  
**API Version:** v1  
**Changes:** Added scientist upload permissions, native CSV parser, improved error handling, troubleshooting guide
