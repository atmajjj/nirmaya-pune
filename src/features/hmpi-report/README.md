# HMPI Report Generation Feature

## 📋 Overview

This feature provides **automatic PDF report generation** for HMPI (Heavy Metal Pollution Index) water quality calculations. When a user uploads a CSV for HMPI calculation, the system automatically generates a comprehensive report with calculations, visualizations, and classifications, stores it in S3, and provides download access.

---

## 🎯 Key Features

- **Automatic Generation**: Reports created automatically after HMPI calculations complete
- **Comprehensive Analysis**: Includes HPI, MI, and WQI analysis with visualizations
- **Professional PDF Output**: Well-formatted reports with charts and tables
- **S3 Storage**: Scalable cloud storage with presigned download URLs
- **Async Processing**: Non-blocking report generation
- **User-Scoped Access**: Users can only access their own reports

---

## 📂 Feature Structure

```
src/features/hmpi-report/
├── apis/
│   ├── generate-report.ts         # POST /hmpi-engine/uploads/:uploadId/generate-report
│   ├── get-report.ts              # GET /hmpi-engine/reports/:reportId
│   ├── download-report.ts         # GET /hmpi-engine/reports/:reportId/download
│   └── list-reports.ts            # GET /hmpi-engine/reports
├── shared/
│   ├── schema.ts                  # Report metadata table
│   ├── queries.ts                 # Report CRUD operations
│   ├── interface.ts               # TypeScript types
│   └── templates/
│       ├── report-layout.hbs      # Handlebars template for PDF
│       └── styles.css             # Report styling
├── services/
│   ├── report-generator.service.ts    # Core report generation logic
│   ├── chart-generator.service.ts     # Generate charts for visualizations
│   ├── pdf-generator.service.ts       # PDF creation with puppeteer
│   └── report-data.service.ts         # Aggregate data for report
├── tests/
│   ├── unit/
│   │   ├── report-generator.test.ts
│   │   ├── chart-generator.test.ts
│   │   └── pdf-generator.test.ts
│   └── integration/
│       └── report-api.test.ts
└── index.ts                       # Router exports
```

---

## 🗄️ Database Schema

### **Table: `hmpi_reports`**

Stores metadata for generated HMPI reports.

```typescript
hmpi_reports {
  id: serial (PK)
  upload_id: integer (FK → uploads.id) [NOT NULL, CASCADE DELETE]
  
  // Report metadata
  report_title: varchar(255) [NOT NULL]
  report_type: 'comprehensive' | 'summary' [DEFAULT 'comprehensive']
  
  // File information (S3)
  file_name: varchar(255) [NOT NULL]
  file_path: text [NOT NULL]         // S3 path
  file_url: text [NOT NULL]          // S3 presigned URL
  file_size: bigint [NOT NULL]
  
  // Cached statistics
  total_stations: integer [NOT NULL]
  avg_hpi: text
  avg_mi: text
  avg_wqi: text
  
  // Generation status
  status: 'pending' | 'generating' | 'completed' | 'failed' [DEFAULT 'pending']
  error_message: text
  generated_at: timestamp
  
  // Audit fields
  created_by: integer [NOT NULL]
  created_at: timestamp [DEFAULT NOW]
  updated_by: integer
  updated_at: timestamp [DEFAULT NOW]
  is_deleted: boolean [DEFAULT false]
  deleted_by: integer
  deleted_at: timestamp
}

// Indexes
- upload_id_idx ON (upload_id)
- status_idx ON (status)
- created_by_idx ON (created_by)
```

**Relationships:**
- `upload_id` → `uploads.id` (CASCADE DELETE)
- `created_by` → `users.id`

---

## 📊 Report Content Structure

### **1. Cover Page**
- Report Title: "HMPI Water Quality Analysis Report"
- Generated Date & Time
- User Information
- Data Source (filename)
- Total Stations Analyzed

### **2. Executive Summary**
- Overall Statistics:
  - Average HPI, MI, WQI
  - Distribution by classification
  - Total stations analyzed
  - Geographic coverage (states/cities)

### **3. Index-wise Analysis**

#### **A. HPI Analysis**
- HPI distribution chart (bar/pie chart)
- Classification breakdown
- Top 10 most polluted stations
- Metals contributing to pollution
- Geographic heatmap (if lat/long available)

#### **B. MI Analysis**
- MI classification distribution
- MI Class breakdown (I, II, III, IV, V, VI)
- Comparative analysis with HPI

#### **C. WQI Analysis**
- WQI distribution
- Parameter-wise contribution
- Water quality trends

### **4. Station-wise Details**
- Paginated table with all stations:
  - Station ID, Location (State/City)
  - HPI, MI, WQI values
  - Classifications
  - Metals analyzed

### **5. Recommendations**
- Based on classifications
- Stations requiring immediate attention
- Remediation suggestions

### **6. Appendix**
- Methodology
- Standards used (BIS/WHO)
- Formula reference

---

## 🔌 API Endpoints

### **1. Generate Report (Manual Trigger)**

```http
POST /api/hmpi-engine/uploads/:uploadId/generate-report
Authorization: Bearer <token>
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Report generation started",
  "data": {
    "report_id": 123,
    "status": "generating",
    "upload_id": 456
  }
}
```

---

### **2. Get Report Status**

```http
GET /api/hmpi-engine/reports/:reportId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "upload_id": 456,
    "report_title": "Water Quality Report - data.csv",
    "status": "completed",
    "file_name": "hmpi_report_456_1702123456789.pdf",
    "file_size": 2457600,
    "total_stations": 150,
    "avg_hpi": "85.5",
    "avg_mi": "3.2",
    "avg_wqi": "45.8",
    "generated_at": "2025-12-07T10:30:45.123Z",
    "created_at": "2025-12-07T10:30:00.000Z"
  }
}
```

---

### **3. Download Report**

```http
GET /api/hmpi-engine/reports/:reportId/download
Authorization: Bearer <token>
```

**Response:** Redirects to S3 presigned URL for direct download

---

### **4. List Reports**

```http
GET /api/hmpi-engine/reports?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` ('pending' | 'generating' | 'completed' | 'failed')
- `sort_by` ('created_at' | 'generated_at')
- `sort_order` ('asc' | 'desc')

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reports retrieved successfully",
  "data": [
    {
      "id": 123,
      "upload_id": 456,
      "report_title": "Water Quality Report - data.csv",
      "status": "completed",
      "total_stations": 150,
      "generated_at": "2025-12-07T10:30:45.123Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

## 🔄 Integration with HMPI Calculation Flow

### **Automatic Report Generation**

After successful HMPI calculation, report generation is automatically triggered:

```typescript
// Modified: src/features/hmpi-engine/apis/upload-and-calculate.ts

const calculations = await WaterQualityCalculationService.processBatch(
  file.buffer.toString(),
  upload.id,
  userId
);

// Automatically trigger report generation (async - don't wait)
ReportGeneratorService.generateReportAsync(upload.id, userId)
  .catch(error => logger.error('Report generation failed:', error));

// Return calculation results immediately
return ResponseFormatter.success(res, { 
  upload_id: upload.id,
  total_stations: calculations.length,
  calculations,
  report: {
    status: 'generating',
    message: 'Report generation in progress'
  }
}, 'Calculation completed successfully');
```

---

## 🛠️ Implementation Phases

### **Phase 1: Database Schema & Core Structure** ✅ CURRENT
**Time: 2-4 hours**

Tasks:
1. Create `hmpi_reports` table schema
2. Generate and run migration
3. Create TypeScript interfaces
4. Implement basic CRUD queries
5. Set up feature folder structure

Deliverables:
- `src/features/hmpi-report/shared/schema.ts`
- `src/features/hmpi-report/shared/interface.ts`
- `src/features/hmpi-report/shared/queries.ts`
- Migration file in `drizzle/migrations/`

---

### **Phase 2: Report Data Aggregation Service**
**Time: 4-6 hours**

Tasks:
1. Fetch calculations by upload_id
2. Calculate statistics (avg HPI, MI, WQI)
3. Group by classifications
4. Aggregate geographic data
5. Identify top polluted stations

Deliverables:
- `src/features/hmpi-report/services/report-data.service.ts`
- Unit tests

---

### **Phase 3: Chart Generation Service**
**Time: 6-8 hours**

Tasks:
1. Set up Chart.js with node-canvas
2. Generate HPI distribution charts
3. Generate MI classification charts
4. Generate WQI distribution charts
5. Create geographic visualizations (if applicable)
6. Export as image buffers

Deliverables:
- `src/features/hmpi-report/services/chart-generator.service.ts`
- Unit tests

---

### **Phase 4: PDF Generation Service**
**Time: 6-8 hours**

Tasks:
1. Set up Puppeteer for PDF generation
2. Create Handlebars template structure
3. Design report layout (HTML/CSS)
4. Implement PDF rendering with headers/footers
5. Optimize for A4 format

Deliverables:
- `src/features/hmpi-report/services/pdf-generator.service.ts`
- `src/features/hmpi-report/shared/templates/report-layout.hbs`
- `src/features/hmpi-report/shared/templates/styles.css`
- Unit tests

---

### **Phase 5: Report Generator Orchestration**
**Time: 4-6 hours**

Tasks:
1. Coordinate data aggregation
2. Call chart generation
3. Compile template with data
4. Generate PDF
5. Upload to S3
6. Save report metadata
7. Handle errors and status updates

Deliverables:
- `src/features/hmpi-report/services/report-generator.service.ts`
- Unit tests

---

### **Phase 6: API Endpoints**
**Time: 4-6 hours**

Tasks:
1. Implement generate report endpoint
2. Implement get report endpoint
3. Implement download report endpoint
4. Implement list reports endpoint
5. Add authentication and authorization
6. Add validation middleware

Deliverables:
- API endpoint files in `src/features/hmpi-report/apis/`
- Integration tests

---

### **Phase 7: Integration & Testing**
**Time: 4-6 hours**

Tasks:
1. Integrate with HMPI calculation flow
2. End-to-end testing
3. Performance optimization
4. Error handling refinement
5. Documentation updates

Deliverables:
- Modified HMPI calculation endpoint
- Integration tests
- Performance benchmarks

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "puppeteer": "^21.6.0",           // PDF generation
    "chartjs-node-canvas": "^4.1.6",  // Server-side charts
    "chart.js": "^4.4.0",             // Chart library
    "handlebars": "^4.7.8"            // Template engine
  }
}
```

Installation:
```bash
npm install puppeteer chartjs-node-canvas chart.js handlebars
```

---

## 🔐 Security Considerations

1. **User Scoping**: Reports are linked to uploads via `upload_id`, ensuring users can only access their own reports
2. **S3 Presigned URLs**: Time-limited download links (default: 15 minutes)
3. **Soft Deletion**: Reports are soft-deleted, not removed from S3 immediately
4. **Authentication Required**: All endpoints require valid JWT token
5. **File Size Limits**: PDF generation limited to reasonable data sizes

---

## 🧪 Testing Strategy

### **Unit Tests**
- Report data aggregation logic
- Chart generation functions
- PDF generation service
- Query functions

### **Integration Tests**
- End-to-end report generation flow
- API endpoint responses
- S3 upload/download
- Error handling scenarios

### **Performance Tests**
- Large dataset handling (1000+ stations)
- Concurrent report generation
- PDF generation time benchmarks

---

## 📈 Performance Considerations

1. **Async Processing**: Report generation doesn't block calculation response
2. **Caching**: Statistics cached in `hmpi_reports` table
3. **S3 Storage**: Offloads file storage from application server
4. **Pagination**: Large station lists paginated in PDF
5. **Resource Limits**: Puppeteer browser instances properly closed

---

## 🚀 Frontend Integration Guide

### **Step 1: Upload CSV & Get Calculations**
```javascript
const response = await fetch('/api/hmpi-engine/calculate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { data } = await response.json();
const uploadId = data.upload_id;
```

### **Step 2: Poll for Report Status**
```javascript
async function checkReportStatus(uploadId) {
  const response = await fetch(`/api/hmpi-engine/reports?upload_id=${uploadId}`);
  const { data } = await response.json();
  
  if (data.length > 0 && data[0].status === 'completed') {
    return data[0]; // Report ready
  }
  
  // Poll again after 2 seconds
  setTimeout(() => checkReportStatus(uploadId), 2000);
}
```

### **Step 3: Download Report**
```javascript
function downloadReport(reportId) {
  window.open(`/api/hmpi-engine/reports/${reportId}/download`, '_blank');
}
```

---

## 📝 Usage Example

```typescript
// Automatic generation after calculation
const upload = await uploadCSV(file);
// Report generation starts automatically in background

// Manual generation (if needed)
const report = await generateReport(upload.id);

// Check status
const status = await getReportStatus(report.id);

// Download when ready
if (status.status === 'completed') {
  const url = await downloadReport(report.id);
}
```

---

## 🔧 Configuration

Environment variables:
```env
# S3 Configuration (already configured)
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket

# Report Generation Settings
REPORT_GENERATION_TIMEOUT=300000  # 5 minutes
MAX_CHART_WIDTH=1200
MAX_CHART_HEIGHT=600
PDF_PAGE_FORMAT=A4
```

---

## 🐛 Troubleshooting

### **Report generation stuck in "generating" status**
- Check logs for Puppeteer errors
- Verify sufficient memory for PDF generation
- Check S3 upload permissions

### **Charts not rendering**
- Ensure `chartjs-node-canvas` is properly installed
- Check canvas dependencies on server
- Verify chart data format

### **PDF too large**
- Reduce chart resolution
- Paginate station details
- Compress images in template

---

## 📚 References

- [Puppeteer Documentation](https://pptr.dev/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Handlebars Guide](https://handlebarsjs.com/)
- [BIS 10500:2012 Standards](https://www.bis.gov.in/)

---

## ✅ Implementation Checklist

- [ ] Phase 1: Database Schema & Core Structure
- [ ] Phase 2: Report Data Aggregation Service
- [ ] Phase 3: Chart Generation Service
- [ ] Phase 4: PDF Generation Service
- [ ] Phase 5: Report Generator Orchestration
- [ ] Phase 6: API Endpoints
- [ ] Phase 7: Integration & Testing

---

**Status**: 🚧 Phase 1 in progress
**Estimated Completion**: ~40 hours total
**Current Phase**: Database Schema & Core Structure
