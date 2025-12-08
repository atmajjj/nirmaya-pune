# Data Sources Feature - Phase 3 Complete

## Overview
Phase 3 added Excel/CSV parsing capabilities to automatically extract metadata from uploaded files and update their status from 'pending' to 'available' after successful processing.

## What Was Implemented

### 1. Libraries Installed
- **xlsx** (`^0.18.5`) - Excel file parsing (.xls and .xlsx)
- **@types/xlsx** - TypeScript definitions for xlsx
- **papaparse** (`^5.4.1`) - High-performance CSV parsing
- **@types/papaparse** - TypeScript definitions for papaparse

### 2. File Parser Utility
**Location:** `src/features/data-sources/utils/file-parser.ts`

**Features:**
- Unified interface for parsing CSV, XLS, and XLSX files
- Extracts comprehensive metadata:
  - Total row count
  - Column count and names
  - Unique stations (if Station column exists)
  - Date range (if Date column exists)
  - Preview rows (first 5 rows for quick inspection)
- Robust error handling with descriptive messages
- Type-safe with full TypeScript support

**Functions:**
- `parseDataSourceFile(buffer, fileType)` - Main parsing function
- `validateHMPIColumns(columns)` - Optional validation for required HMPI parameters
- Internal `parseCSV()` - CSV-specific parsing logic
- Internal `parseExcel()` - Excel-specific parsing logic

**CSV Parsing:**
- Uses PapaParse for high-performance parsing
- Automatic header detection
- Handles various CSV dialects and edge cases
- Skips empty lines

**Excel Parsing:**
- Supports both .xls and .xlsx formats
- Reads first sheet by default
- Converts Excel serial date numbers to ISO format
- Handles empty cells gracefully

### 3. Processing Service
**Location:** `src/features/data-sources/services/processor.service.ts`

**Functions:**
- `processDataSourceFile(id)` - Process single data source
  1. Updates status to 'processing'
  2. Downloads file from S3
  3. Parses file and extracts metadata
  4. Updates database with metadata
  5. Changes status to 'available' (or 'failed' if errors)
  
- `processBatchDataSources(ids)` - Process multiple files in batch

**Error Handling:**
- Catches parsing errors and marks files as 'failed'
- Stores error messages in database
- Logs all operations for debugging
- Non-blocking - doesn't crash the server

### 4. Background Processing
**Integration in Upload API:**
- After file upload, processing starts automatically in background
- Uses non-blocking async execution (`.catch()` instead of `await`)
- Upload response returns immediately with 'pending' status
- Client can poll GET endpoint to check when status changes to 'available'

**Flow:**
```
1. Field technician uploads file → Status: 'pending'
2. File saved to S3 → Database record created
3. Response returned immediately
4. Background: Download from S3 → Parse → Extract metadata
5. Status updated to 'available' (or 'failed')
6. Scientists can now see and use the file
```

### 5. Reprocess Endpoint
**New API:** `POST /api/data-sources/:id/reprocess`

**Purpose:** Allows admins/scientists to manually trigger reprocessing if:
- Initial processing failed
- File was re-uploaded to S3
- Metadata needs to be refreshed

**Permissions:** Admin and Scientist roles only

**Response:** Returns immediately, processing happens in background

### 6. Unit Tests
**Location:** `src/features/data-sources/tests/unit/file-parser.test.ts`

**Test Coverage:**
- ✅ CSV parsing with multiple rows and columns
- ✅ Station extraction from Station column
- ✅ Empty file handling
- ✅ Excel parsing error handling
- ✅ Date range extraction
- ✅ Preview rows generation

**Results:** All 5 tests passing ✅

## Metadata Structure

### Stored in Database
```typescript
{
  total_rows: 1250,           // Number of data rows
  column_count: 15,           // Number of columns
  columns: [                  // Column names
    "Station", "Date", "pH", "Temperature", "DO", ...
  ],
  stations: [                 // Unique station values (if exists)
    "Mumbai", "Delhi", "Bangalore"
  ],
  date_range: {               // Date range (if date column exists)
    from: "2024-01-01",
    to: "2024-12-31"
  }
}
```

### Available in API Responses
All the above plus `preview_rows` (first 5 rows) for quick preview without downloading entire file.

## API Updates

### Upload Response Enhanced
```json
{
  "success": true,
  "message": "File uploaded successfully. Processing will begin shortly.",
  "data": {
    "id": 1,
    "filename": "water_quality.csv",
    "status": "pending",  // Will change to 'available' after processing
    ...
  }
}
```

### List/Get Responses Include Metadata
```json
{
  "id": 1,
  "filename": "water_quality.csv",
  "status": "available",
  "metadata": {
    "total_rows": 1250,
    "column_count": 15,
    "columns": ["Station", "pH", ...],
    "stations": ["Mumbai", "Delhi", ...],
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  ...
}
```

## Status Lifecycle

```
pending → processing → available
                    ↘ failed
```

- **pending** - Just uploaded, waiting to be processed
- **processing** - Currently parsing and extracting metadata
- **available** - Ready for use by scientists in HMPI calculations
- **failed** - Processing failed (error message stored)

## Example Usage

### 1. Field Technician Uploads File
```bash
POST /api/data-sources/upload
Content-Type: multipart/form-data

file: mumbai_water_data.csv
description: "Mumbai station data Q1 2024"

# Immediate response (status: pending)
```

### 2. Automatic Processing (Background)
```
- File downloaded from S3
- Parsed (CSV/Excel)
- Metadata extracted:
  * 1,250 rows
  * 15 columns
  * 3 stations
  * Date range: Jan-Mar 2024
- Status → 'available'
```

### 3. Scientist Views Available Files
```bash
GET /api/data-sources?status=available

# Response includes full metadata for each file
# Scientist can see rows, columns, stations before selecting
```

### 4. Manual Reprocess (If Needed)
```bash
POST /api/data-sources/1/reprocess
Authorization: Bearer {admin_or_scientist_token}

# Triggers background reprocessing
```

## Error Handling

### Parsing Errors
If file is corrupt, invalid format, or empty:
- Status set to 'failed'
- Error message stored in `error_message` field
- Example: "Failed to parse CSV: Unexpected end of input"

### S3 Download Errors
If file missing or inaccessible:
- Status set to 'failed'
- Error message: "File not found in S3" or similar

### Field Technician View
```json
{
  "id": 5,
  "status": "failed",
  "error_message": "File contains no data rows",
  ...
}
```

## Performance Considerations

### Background Processing Benefits
- Upload endpoint responds in <1 second
- Processing doesn't block API server
- Multiple files can be processed concurrently
- Failed processing doesn't affect other operations

### File Size Limits
- Multer: 50MB max upload size
- Parser: Handles large files efficiently
  - PapaParse: Streams CSV data
  - XLSX: Optimized for large spreadsheets

### Database Efficiency
- Metadata stored as JSONB (indexed, queryable)
- Preview rows excluded from DB (only in API response)
- Efficient queries with proper indexes

## Testing Status

✅ **Build:** TypeScript compilation successful (0 errors)  
✅ **Unit Tests:** 5/5 passing for file parser  
✅ **Integration:** Background processing working  
✅ **Error Handling:** Failed parsing properly handled  

## Files Created/Modified

### New Files:
- `src/features/data-sources/utils/file-parser.ts` - CSV/Excel parsing logic
- `src/features/data-sources/services/processor.service.ts` - Background processing
- `src/features/data-sources/apis/reprocess.ts` - Manual reprocess endpoint
- `src/features/data-sources/tests/unit/file-parser.test.ts` - Parser tests

### Modified Files:
- `src/features/data-sources/apis/upload.ts` - Added background processing trigger
- `src/features/data-sources/index.ts` - Registered reprocess route
- `package.json` - Added xlsx and papaparse dependencies

## Next Steps (Phase 4)

**HMPI Engine Integration:**
- Modify HMPI calculation APIs to accept `data_source_id` parameter
- Scientists select from available data sources instead of direct upload
- Fetch file from S3 using data source record
- Pass to existing HMPI calculation logic
- Link HMPI results to data source for traceability

**Benefits:**
- Reusable data - one upload, multiple calculations
- Audit trail - track which data source was used for each calculation
- Validation - ensure data quality before calculations
- Collaboration - field technicians provide data, scientists analyze

## Status: ✅ Phase 3 Complete

All Excel/CSV parsing functionality is implemented and tested. Files are automatically processed after upload, metadata is extracted, and scientists can now see comprehensive file information before using them in HMPI calculations.
