# Data Sources Feature - Implementation Guide

## Architecture Overview

The Data Sources feature implements a **feature-based, API-per-file architecture** where each endpoint is self-contained with its own router, schema validation, handler, and business logic.

### Directory Structure

```
src/features/data-sources/
├── apis/
│   ├── upload.ts           # POST /upload - Upload CSV/Excel files
│   ├── list.ts             # GET / - List data sources with filters
│   ├── get.ts              # GET /:id - Get single data source
│   ├── delete.ts           # DELETE /:id - Soft delete data source
│   └── reprocess.ts        # POST /:id/reprocess - Retry processing
├── shared/
│   ├── schema.ts           # Drizzle table schema + TypeScript types
│   ├── queries.ts          # Reusable database queries
│   └── interface.ts        # TypeScript interfaces for API contracts
├── services/
│   └── processor.service.ts # Background file processing logic
├── utils/
│   └── file-parser.ts      # CSV/Excel parsing and metadata extraction
├── tests/
│   ├── unit/
│   │   └── file-parser.test.ts
│   └── integration/
│       └── (integration tests would go here)
└── index.ts                # Routes aggregator
```

---

## Core Components

### 1. Database Schema (`shared/schema.ts`)

**Table:** `data_sources`

**Key Fields:**
- **File Information:** `filename`, `original_filename`, `file_type`, `file_size`, `file_path`, `file_url`
- **Status Tracking:** `status` (pending → processing → available/failed)
- **Metadata:** JSONB field storing extracted file metadata
- **Audit Fields:** `created_by`, `created_at`, `updated_by`, `updated_at`, `is_deleted`, etc.

**Indexes:**
- `uploaded_by_is_deleted_idx` - For field technician's uploads
- `status_is_deleted_idx` - For filtering by status
- `file_type_idx` - For file type filters
- `created_at_idx` - For sorting/pagination

### 2. File Parser (`utils/file-parser.ts`)

**Purpose:** Parse CSV/Excel files and extract comprehensive metadata

**Main Function:** `parseDataSourceFile(buffer: Buffer, fileType: string)`

**Capabilities:**
- Parses CSV using PapaParse library
- Parses Excel (.xlsx, .xls) using xlsx library
- Validates required columns (Station, Date)
- Extracts metadata:
  - Total rows and column count
  - Column names array
  - Unique station identifiers
  - Date range (min/max dates)
  - Preview of first 5 rows

**Error Handling:**
- Returns `{success: false, error: string}` on failure
- Validates file structure before processing
- Handles missing columns gracefully

### 3. Background Processor (`services/processor.service.ts`)

**Purpose:** Asynchronously process uploaded files without blocking API responses

**Main Function:** `processDataSourceFile(dataSourceId: number)`

**Processing Flow:**
```
1. Update status to 'processing'
2. Download file from S3 using downloadAsBuffer()
3. Call file parser with buffer
4. Extract metadata (excluding preview_rows)
5. Update database with metadata and status 'available'
6. On error: Set status to 'failed' with error message
```

**Non-Blocking Design:**
- Called with `.catch()` but not `await`ed in upload endpoint
- Runs independently after API response sent
- Field technician gets immediate response, processing happens in background

### 4. API Endpoints

#### Upload Endpoint (`apis/upload.ts`)

**Pattern:**
```typescript
1. Validate file exists (multer middleware)
2. Validate file type (.csv, .xlsx, .xls)
3. Upload to S3
4. Create database record with status='pending'
5. Trigger background processing (non-blocking)
6. Return 201 response immediately
```

**Key Features:**
- Role restriction: field_technician, admin
- File size limit via multer configuration
- S3 upload with unique filename
- Immediate response, background processing

#### List Endpoint (`apis/list.ts`)

**Query Parameters:**
- Pagination: `page`, `limit`
- Filters: `status`, `file_type`, `uploaded_by`, `search`
- Sorting: `sort_by`, `sort_order`

**Auto-filtering:**
- Field technicians see only their own uploads
- Other roles see all data sources

**Response:**
- Paginated results with metadata
- Includes uploader details via JOIN

#### Get Endpoint (`apis/get.ts`)

**Access Control:**
- Field technicians can only view their own uploads
- Other roles can view any data source

**Response:**
- Complete data source details
- Includes uploader information
- Shows processing metadata

#### Delete Endpoint (`apis/delete.ts`)

**Soft Delete:**
- Sets `is_deleted=true`, `deleted_by`, `deleted_at`
- File remains in S3
- Excluded from future queries

**Access Control:**
- Field technicians can delete their own
- Scientists/admins can delete any

**Validation:**
- Cannot delete files with status='processing'

#### Reprocess Endpoint (`apis/reprocess.ts`)

**Purpose:** Manually retry failed processing

**Access Control:**
- Admin and scientist only

**Behavior:**
- Triggers `processDataSourceFile()` again
- Returns 202 Accepted (async operation)
- Useful for transient failures

---

## Integration with HMPI Engine

### Calculate from Source Endpoint

**Location:** `src/features/hmpi-engine/apis/calculate-from-source.ts`

**Integration Points:**

1. **Query Data Source:**
```typescript
const dataSource = await findDataSourceById(data_source_id);
```

2. **Validate Status:**
```typescript
if (dataSource.status !== 'available') {
  throw new HttpException(400, `Data source is not available. Current status: ${dataSource.status}`);
}
```

3. **Download from S3:**
```typescript
const fileBuffer = await downloadAsBuffer(dataSource.file_path);
```

4. **Process with Existing Service:**
```typescript
const result = await WaterQualityCalculationService.processCSV(
  fileBuffer,
  dataSource.file_type === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
  dataSource.original_filename
);
```

5. **Create Upload Record:**
```typescript
const upload = await createUploadFromDataSource(dataSource, userId);
```

**Key Design Decision:**
- Reuses existing HMPI calculation service
- No code duplication
- Scientists can calculate without re-uploading files

---

## Access Control Patterns

### Role-Based Filtering

**Pattern 1: Auto-filter in query (List endpoint)**
```typescript
if (req.userRole === 'field_technician') {
  query.uploaded_by = req.userId;
}
```

**Pattern 2: Explicit permission check (Get/Delete endpoints)**
```typescript
if (userRole === 'field_technician' && dataSource.uploaded_by !== userId) {
  throw new HttpException(403, 'You do not have permission...');
}
```

**Pattern 3: Role middleware (Reprocess endpoint)**
```typescript
router.post('/:id/reprocess',
  requireAuth,
  requireRole(['admin', 'scientist']),  // Middleware handles rejection
  handler
);
```

### Permission Matrix

| Action | Field Tech | Scientist | Admin | Policymaker | Researcher |
|--------|-----------|-----------|-------|-------------|------------|
| Upload | ✅ Own | ❌ | ✅ Any | ❌ | ❌ |
| List | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ All |
| View Details | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ All |
| Delete | ✅ Own | ✅ All | ✅ All | ❌ | ❌ |
| Reprocess | ❌ | ✅ | ✅ | ❌ | ❌ |
| Calculate | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Data Flow Diagrams

### Upload & Processing Flow

```
┌─────────────────┐
│ Field Technician│
│  Uploads File   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  POST /api/data-sources/upload  │
│  • Validate file                │
│  • Upload to S3                 │
│  • Create DB record (pending)   │
│  • Return 201 immediately       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Background Processor           │
│  • Download from S3             │
│  • Parse CSV/Excel              │
│  • Extract metadata             │
│  • Update status (available)    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database                       │
│  status: pending → processing   │
│         → available/failed      │
└─────────────────────────────────┘
```

### Scientist Calculation Flow

```
┌──────────────┐
│  Scientist   │
│  Selects File│
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│  GET /api/data-sources?status=available│
│  • Returns list of processed files     │
│  • Shows metadata, stations, dates     │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  POST /api/hmpi-engine/calculate-from- │
│       source                            │
│  • Validate data_source_id             │
│  • Check status = 'available'          │
│  • Download from S3                    │
│  • Calculate HPI, MI, WQI              │
│  • Return results immediately          │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Database                              │
│  • water_quality_calculations          │
│  • uploads (tracking record)           │
└────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

**File Parser Tests** (`tests/unit/file-parser.test.ts`)

Tests cover:
- ✅ CSV parsing with valid data
- ✅ Empty file handling
- ✅ Excel file error handling
- ✅ Date range extraction
- ✅ Preview rows generation

**Coverage:** 5/5 tests passing

### Integration Tests

**Calculate from Source Tests** (`hmpi-engine/tests/integration/calculate-from-source.test.ts`)

Test categories:
1. **Authentication & Authorization** (5 tests)
   - 401 without token
   - 403 for unauthorized roles
   - Success for authorized roles

2. **Input Validation** (4 tests)
   - Missing parameters
   - Invalid types
   - Negative/zero values

3. **Data Source Validation** (4 tests)
   - Non-existent data sources
   - Status checks (pending, processing, failed)

4. **Workflow Documentation** (1 test)
   - Documents complete workflow

**Coverage:** 14/14 tests passing

### Test Infrastructure

**Database Setup:**
```bash
# Start test database
docker compose -f docker/compose.test.yaml up -d

# Run migrations
NODE_ENV=test npm run db:migrate

# Run tests
npm test
```

**Test Helpers:**
- `ApiTestHelper` - HTTP request helper
- `AuthTestHelper` - User creation and authentication
- `dbHelper` - Database cleanup and reset

---

## Error Handling

### Processing Errors

**Graceful Degradation:**
```typescript
try {
  const parseResult = await parseDataSourceFile(fileBuffer, dataSource.file_type);
  if (!parseResult.success) {
    // Set status to failed with error message
    await updateDataSourceStatus(dataSourceId, 'failed', parseResult.error);
    return;
  }
  // Continue processing...
} catch (error) {
  // Log error and set failed status
  logger.error('Processing error:', error);
  await updateDataSourceStatus(dataSourceId, 'failed', error.message);
}
```

**User-Facing Errors:**
- Stored in `error_message` field
- Displayed when checking status
- Can trigger manual reprocessing

### Common Error Scenarios

| Scenario | Status | Error Message | Resolution |
|----------|--------|---------------|------------|
| Invalid CSV structure | failed | "Missing required column: Station" | Fix file and re-upload |
| Unparseable dates | failed | "Invalid date format" | Use YYYY-MM-DD format |
| Empty file | failed | "File contains no data rows" | Upload file with data |
| S3 download failure | failed | "Failed to download file from S3" | Trigger reprocess |
| Corrupted Excel | failed | "Failed to parse Excel file" | Re-save and upload |

---

## Performance Considerations

### File Size Limits

**Multer Configuration:**
```typescript
limits: {
  fileSize: 50 * 1024 * 1024, // 50MB
}
```

**Processing Times:**
- Small (<1MB): 1-2 seconds
- Medium (1-10MB): 5-15 seconds
- Large (10-50MB): 30+ seconds

### Background Processing Benefits

**Non-Blocking Response:**
- User gets immediate 201 response
- Processing happens asynchronously
- No timeout issues for large files

**Status Polling:**
```typescript
// Client-side polling pattern
async function pollStatus(dataSourceId) {
  const response = await fetch(`/api/data-sources/${dataSourceId}`);
  const { data } = await response.json();
  
  if (data.status === 'processing') {
    setTimeout(() => pollStatus(dataSourceId), 2000);
  } else {
    // Processing complete (available or failed)
    handleComplete(data);
  }
}
```

### Database Indexing

**Optimized Queries:**
- `uploaded_by + is_deleted` index for field tech queries
- `status + is_deleted` index for status filtering
- `created_at` index for sorting

---

## Security Considerations

### File Upload Security

**Validation:**
1. **File Type Check:** Only .csv, .xlsx, .xls allowed
2. **MIME Type Verification:** Checked by multer
3. **File Size Limit:** 50MB maximum
4. **Virus Scanning:** (Recommended for production)

**S3 Security:**
- Files stored with unique names (timestamp-based)
- Pre-signed URLs for access control
- Bucket policies restrict public access

### Access Control

**Authentication:**
- JWT tokens required for all endpoints
- Token validated by `requireAuth` middleware

**Authorization:**
- Role-based access via `requireRole` middleware
- Per-resource ownership checks (field technician restrictions)

**Soft Deletes:**
- Prevents accidental data loss
- Maintains audit trail
- Files can be recovered if needed

---

## Deployment Checklist

### Environment Variables

Required in `.env` files:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# S3/AWS
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket

# JWT
JWT_SECRET=your_secret_min_32_chars
```

### Database Migration

```bash
# Generate migration from schema
npm run db:generate

# Apply migrations
npm run db:migrate:prod
```

### Docker Deployment

```bash
# Build and start
docker compose -f docker/compose.prod.yaml up -d

# Check logs
docker logs nirmaya-api-prod -f
```

---

## Future Enhancements

### Potential Features

1. **Batch Upload:** Upload multiple files at once
2. **File Validation Rules:** Custom validation per data type
3. **Data Preview API:** Return preview without full processing
4. **File Versioning:** Track changes to same monitoring location
5. **Scheduled Processing:** Retry failed uploads automatically
6. **Archival Strategy:** Auto-archive old files after X months
7. **Duplicate Detection:** Warn about similar existing files
8. **Export API:** Download processed data in various formats

### Scalability Improvements

1. **Queue System:** Use Redis Queue for background jobs
2. **Worker Processes:** Separate processing workers
3. **Caching:** Cache frequently accessed metadata
4. **CDN Integration:** Serve files via CloudFront
5. **Database Partitioning:** Partition by date for large datasets

---

## Troubleshooting Guide

### Common Issues

**Issue 1: Files stuck in "processing"**
```bash
# Check background processor logs
docker logs nirmaya-api-prod | grep "processDataSourceFile"

# Manually trigger reprocess
curl -X POST https://api.example.com/api/data-sources/:id/reprocess
```

**Issue 2: "Data source not found" errors**
```sql
-- Check if file is soft-deleted
SELECT * FROM data_sources WHERE id = X;

-- Restore if needed (admin only)
UPDATE data_sources 
SET is_deleted = false, deleted_by = NULL, deleted_at = NULL 
WHERE id = X;
```

**Issue 3: S3 download failures**
```bash
# Verify S3 credentials
aws s3 ls s3://your-bucket/

# Check file exists
aws s3 ls s3://your-bucket/path/to/file
```

**Issue 4: Parsing errors**
```
# Check file structure manually
# Ensure Station and Date columns exist
# Verify date format (YYYY-MM-DD preferred)
```

---

## Code Examples

### Adding a New Endpoint

```typescript
// src/features/data-sources/apis/my-endpoint.ts
import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';

const handler = asyncHandler(async (req: any, res: Response) => {
  // Your logic here
  ResponseFormatter.success(res, data, 'Success message');
});

const router = Router();
router.get('/my-route', requireAuth, handler);
export default router;
```

Then register in `index.ts`:
```typescript
import myEndpointRouter from './apis/my-endpoint';
router.use('/', myEndpointRouter);
```

### Adding a New Query

```typescript
// src/features/data-sources/shared/queries.ts
export async function myCustomQuery(param: number): Promise<DataSource[]> {
  return await db
    .select()
    .from(dataSources)
    .where(and(
      eq(dataSources.some_field, param),
      eq(dataSources.is_deleted, false)
    ));
}
```

---

## Contributing Guidelines

### Code Style

- Follow existing patterns in API files
- Use TypeScript strict mode
- Include JSDoc comments for public functions
- Export types alongside implementations

### Testing Requirements

- Write unit tests for utility functions
- Write integration tests for new endpoints
- Ensure all tests pass before committing
- Maintain test coverage above 80%

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes following architecture patterns
3. Add/update tests
4. Update documentation
5. Run full test suite
6. Submit PR with description

---

**Document Version:** 1.0.0  
**Last Updated:** December 9, 2024  
**Maintainer:** Backend Team
