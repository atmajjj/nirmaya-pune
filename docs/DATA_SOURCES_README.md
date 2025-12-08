# Data Sources Feature

> Collaborative water quality data management system enabling field technicians to upload CSV/Excel files and scientists to perform HMPI calculations.

## Quick Start

### For Field Technicians

**1. Upload a Data File**
```bash
curl -X POST https://api.example.com/api/data-sources/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@water_quality_data.csv" \
  -F "description=Monthly monitoring - December 2024"
```

**2. Check Processing Status**
```bash
curl -X GET https://api.example.com/api/data-sources/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Wait for `status: "available"` before scientists can use the file.

### For Scientists

**1. List Available Files**
```bash
curl -X GET "https://api.example.com/api/data-sources?status=available" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Calculate HMPI Indices**
```bash
curl -X POST https://api.example.com/api/hmpi-engine/calculate-from-source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data_source_id": 5}'
```

---

## Features

### ✅ Automated File Processing
- Upload CSV or Excel files
- Automatic parsing and validation
- Metadata extraction (stations, date ranges, columns)
- Background processing (non-blocking)

### ✅ Role-Based Access Control
- **Field Technicians:** Upload and manage their own files
- **Scientists:** View all files, perform calculations, reprocess failed uploads
- **Admins:** Full access to all operations
- **Policymakers:** View files and perform calculations
- **Researchers:** Read-only access

### ✅ HMPI Integration
- Calculate water quality indices from pre-uploaded files
- No need to re-upload data for each calculation
- Reuse files across multiple analysis sessions

### ✅ Comprehensive Filtering
- Filter by status (pending, available, processing, failed, archived)
- Filter by file type (CSV, Excel)
- Filter by uploader
- Search by filename or description
- Sort by date, filename, or file size

---

## Architecture

### Feature-Based Structure

```
src/features/data-sources/
├── apis/              # Self-contained endpoint files
│   ├── upload.ts      # File upload
│   ├── list.ts        # List with filters
│   ├── get.ts         # Get single file
│   ├── delete.ts      # Soft delete
│   └── reprocess.ts   # Retry processing
├── services/
│   └── processor.service.ts  # Background processing
├── utils/
│   └── file-parser.ts        # CSV/Excel parsing
└── shared/
    ├── schema.ts      # Database table
    ├── queries.ts     # Database operations
    └── interface.ts   # TypeScript types
```

Each API file contains:
- Router configuration
- Zod validation schema
- Business logic function
- Request handler
- Exports configured router

---

## Data Flow

### Upload & Processing

```
Field Technician → Upload File → S3 Storage
                               ↓
                          DB Record (pending)
                               ↓
                    Background Processor
                               ↓
                    Parse & Extract Metadata
                               ↓
                    Update Status (available)
```

### Scientist Calculation

```
Scientist → List Available Files → Select File by ID
                                       ↓
                            Calculate HMPI Indices
                                       ↓
                              View/Download Results
```

---

## File Requirements

### Supported Formats
- `.csv` - Comma-separated values
- `.xlsx` - Excel 2007+ format
- `.xls` - Excel 97-2003 format

### Required Columns
- `Station` - Monitoring station identifier
- `Date` - Measurement date (YYYY-MM-DD preferred)

### Optional Columns
Water quality parameters: pH, Temperature, DO, BOD, COD, TDS, Turbidity, etc.

### Example Structure
```csv
Station,Date,pH,Temperature,DO,BOD,COD
STN001,2024-01-15,7.2,18.5,6.8,3.2,15.4
STN001,2024-02-15,7.4,19.2,7.1,2.8,14.2
STN002,2024-01-15,6.9,17.8,6.5,4.1,18.7
```

---

## Status Lifecycle

```
pending     → File uploaded, waiting for processing
processing  → Currently being parsed and validated
available   → Ready for use in calculations
failed      → Processing error occurred
archived    → Old data, no longer active
```

---

## API Endpoints

### Data Sources

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/data-sources/upload` | Upload CSV/Excel file | Field Tech, Admin |
| GET | `/api/data-sources` | List with filters | All authenticated |
| GET | `/api/data-sources/:id` | Get details | All authenticated |
| DELETE | `/api/data-sources/:id` | Soft delete | Owner, Scientist, Admin |
| POST | `/api/data-sources/:id/reprocess` | Retry processing | Scientist, Admin |

### HMPI Calculations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/hmpi-engine/calculate-from-source` | Calculate indices | Scientist, Admin, Policymaker |

---

## Usage Examples

### Upload with Description
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'River monitoring - Winter 2024');

const response = await fetch('/api/data-sources/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await response.json();
console.log(`File uploaded with ID: ${data.id}, Status: ${data.status}`);
```

### Poll for Processing Completion
```javascript
async function waitForProcessing(dataSourceId) {
  while (true) {
    const response = await fetch(`/api/data-sources/${dataSourceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const { data } = await response.json();
    
    if (data.status === 'available') {
      console.log('Processing complete!', data.metadata);
      break;
    } else if (data.status === 'failed') {
      console.error('Processing failed:', data.error_message);
      break;
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### List and Filter
```javascript
// Get all available CSV files
const response = await fetch('/api/data-sources?status=available&file_type=csv&page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data, pagination } = await response.json();

data.forEach(file => {
  console.log(`${file.original_filename} - ${file.metadata.total_rows} rows, ${file.metadata.stations.length} stations`);
});
```

### Calculate HMPI
```javascript
const response = await fetch('/api/hmpi-engine/calculate-from-source', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data_source_id: 5 })
});

const { data } = await response.json();
console.log(`Calculated ${data.successful_calculations} records from ${data.total_stations} stations`);
console.log('Results:', data.results);
```

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Unit Tests
```bash
npm test -- src/features/data-sources/tests/unit
```

### Run Integration Tests
```bash
npm test -- src/features/hmpi-engine/tests/integration/calculate-from-source.test.ts
```

### Test Coverage
```bash
npm run test:coverage
```

**Current Test Status:**
- ✅ File parser unit tests: 5/5 passing
- ✅ Calculate from source integration tests: 14/14 passing

---

## Configuration

### Environment Variables

Required in `.env` files:

```bash
# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nirmaya

# JWT Authentication
JWT_SECRET=your_jwt_secret_min_32_characters
```

### Multer Configuration

File upload limits in `src/middlewares/upload.middleware.ts`:

```typescript
limits: {
  fileSize: 50 * 1024 * 1024, // 50MB max
}
```

---

## Database Schema

### `data_sources` Table

```sql
CREATE TABLE data_sources (
  id SERIAL PRIMARY KEY,
  
  -- File info
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  
  -- Metadata (JSONB)
  metadata JSONB,
  
  -- Uploader
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  description TEXT,
  
  -- Audit fields
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX data_sources_uploaded_by_is_deleted_idx ON data_sources(uploaded_by, is_deleted);
CREATE INDEX data_sources_status_is_deleted_idx ON data_sources(status, is_deleted);
CREATE INDEX data_sources_file_type_idx ON data_sources(file_type);
CREATE INDEX data_sources_created_at_idx ON data_sources(created_at);
```

---

## Troubleshooting

### File Stuck in "processing"

**Cause:** Background processor may have crashed or timed out

**Solution:**
```bash
# Trigger manual reprocessing
curl -X POST https://api.example.com/api/data-sources/:id/reprocess \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### "Data source not found" Error

**Cause:** File may be soft-deleted or ID is wrong

**Solution:**
```bash
# Check file details
curl -X GET https://api.example.com/api/data-sources/:id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Processing Failed

**Cause:** Invalid file structure or missing required columns

**Solution:**
1. Check `error_message` field in response
2. Verify file has `Station` and `Date` columns
3. Ensure dates are in readable format (YYYY-MM-DD preferred)
4. Check for empty rows or invalid characters

### Permission Denied

**Cause:** Insufficient role permissions

**Solution:**
- Field Technicians can only access their own uploads
- Use Scientist/Admin role for broader access
- Check JWT token is valid and not expired

---

## Performance Notes

### Processing Times

| File Size | Processing Time |
|-----------|----------------|
| < 1MB | 1-2 seconds |
| 1-10MB | 5-15 seconds |
| 10-50MB | 30+ seconds |

### Recommendations

1. **Upload during off-peak hours** for large files
2. **Use CSV format** when possible (faster than Excel)
3. **Split large datasets** into multiple files for faster processing
4. **Monitor status** via polling rather than blocking requests

---

## Security

### Authentication
- All endpoints require valid JWT token
- Tokens obtained via `/api/auth/login`

### Authorization
- Role-based access control
- Field Technicians restricted to own uploads
- Scientists can access all data

### File Validation
- MIME type checking
- File size limits (50MB)
- Extension validation (.csv, .xlsx, .xls only)

### S3 Security
- Pre-signed URLs for temporary access
- Private bucket (no public access)
- Unique filenames prevent collisions

---

## Documentation

### 📖 [API Documentation](./DATA_SOURCES_API.md)
Complete API reference with request/response examples, error codes, and usage patterns.

### 🏗️ [Implementation Guide](./DATA_SOURCES_IMPLEMENTATION.md)
Technical architecture, data flow diagrams, code patterns, and development guidelines.

---

## Changelog

### Version 1.0.0 (December 2024)

**Features:**
- ✅ File upload endpoint with S3 integration
- ✅ Automatic CSV/Excel parsing and validation
- ✅ Background processing with status tracking
- ✅ Metadata extraction (rows, columns, stations, dates)
- ✅ List endpoint with filtering and pagination
- ✅ Get, Delete, and Reprocess endpoints
- ✅ HMPI calculation integration
- ✅ Role-based access control
- ✅ Comprehensive test suite (19 tests passing)
- ✅ Complete API and implementation documentation

---

## Support

### Common Questions

**Q: How long does processing take?**  
A: Most files process in 1-15 seconds. Check status via GET endpoint.

**Q: Can I delete a file after uploading?**  
A: Yes, use DELETE endpoint. Files are soft-deleted (can be recovered).

**Q: What happens if processing fails?**  
A: Status changes to "failed" with error message. Use reprocess endpoint to retry.

**Q: Can scientists upload files?**  
A: No, only Field Technicians and Admins can upload. Scientists can view and use uploaded files.

**Q: How do I know when a file is ready?**  
A: Poll the GET endpoint until status changes from "processing" to "available".

### Getting Help

- **Technical Issues:** Check logs and error messages
- **API Questions:** See [API Documentation](./DATA_SOURCES_API.md)
- **Architecture Questions:** See [Implementation Guide](./DATA_SOURCES_IMPLEMENTATION.md)

---

## License

This feature is part of the Nirmaya Backend project.

---

**Version:** 1.0.0  
**Last Updated:** December 9, 2024  
**Status:** ✅ Production Ready
