# HMPI Report API Documentation

## Overview
The HMPI Report API provides endpoints for automated PDF report generation from HMPI water quality calculations. Reports include statistical analysis, visualizations, and recommendations.

## Base URL
```
/api/hmpi-report
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Generate Report
Generate a new HMPI report for a specific upload.

**Endpoint:** `POST /api/hmpi-report/generate`  
**Access:** Admin, Scientist, Researcher  

**Request Body:**
```json
{
  "upload_id": 123,
  "report_type": "comprehensive"  // optional: "summary" | "comprehensive" (default: "comprehensive")
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Report generation initiated successfully",
  "data": {
    "report": {
      "id": 456,
      "upload_id": 123,
      "report_title": "HMPI Report - Upload 123",
      "report_type": "comprehensive",
      "status": "generating",
      "file_name": "",
      "file_path": "",
      "file_url": "",
      "file_size": 0,
      "total_stations": 0,
      "avg_hpi": null,
      "avg_mi": null,
      "avg_wqi": null,
      "error_message": null,
      "generated_at": null,
      "created_by": 1,
      "created_at": "2025-12-07T10:00:00.000Z",
      "updated_by": 1,
      "updated_at": "2025-12-07T10:00:00.000Z"
    },
    "estimatedTime": 45,
    "message": "Report generation started. Check status using the report ID."
  }
}
```

**Errors:**
- `400` - Upload has no calculations
- `401` - Unauthorized
- `403` - Insufficient permissions

---

### 2. Get Report Details
Retrieve metadata and status of a specific report.

**Endpoint:** `GET /api/hmpi-report/:id`  
**Access:** All authenticated users  

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report retrieved successfully",
  "data": {
    "report": {
      "id": 456,
      "upload_id": 123,
      "report_title": "HMPI Report - Upload 123",
      "report_type": "comprehensive",
      "status": "completed",
      "file_name": "hmpi-report-456-1733566800000.pdf",
      "file_path": "uploads/1/1733566800000_hmpi-report-456-1733566800000.pdf",
      "file_url": "https://s3.amazonaws.com/...",
      "file_size": 524288,
      "total_stations": 150,
      "avg_hpi": "45.67",
      "avg_mi": "12.34",
      "avg_wqi": "78.90",
      "error_message": null,
      "generated_at": "2025-12-07T10:05:00.000Z",
      "created_by": 1,
      "created_at": "2025-12-07T10:00:00.000Z",
      "updated_by": 1,
      "updated_at": "2025-12-07T10:05:00.000Z"
    }
  }
}
```

**Errors:**
- `400` - Invalid report ID
- `404` - Report not found
- `401` - Unauthorized

---

### 3. Get Report Status
Check the current status and progress of report generation.

**Endpoint:** `GET /api/hmpi-report/:id/status`  
**Access:** All authenticated users  

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report status retrieved successfully",
  "data": {
    "reportId": 456,
    "status": "generating",
    "progress": 60,
    "errorMessage": null,
    "createdAt": "2025-12-07T10:00:00.000Z",
    "generatedAt": null,
    "isComplete": false,
    "isFailed": false,
    "canDownload": false
  }
}
```

**Status Values:**
- `pending` - Report queued (0% progress)
- `generating` - Report generation in progress (0-99% progress)
- `completed` - Report ready for download (100% progress)
- `failed` - Report generation failed

**Errors:**
- `400` - Invalid report ID
- `404` - Report not found
- `401` - Unauthorized

---

### 4. Download Report
Generate a secure pre-signed URL for downloading the report PDF.

**Endpoint:** `GET /api/hmpi-report/:id/download`  
**Access:** All authenticated users  

**Query Parameters:**
- `expires_in` (optional): URL expiration time in seconds (60-86400, default: 3600)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Download URL generated successfully",
  "data": {
    "downloadUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...",
    "fileName": "hmpi-report-456-1733566800000.pdf",
    "fileSize": 524288,
    "expiresIn": 3600,
    "expiresAt": "2025-12-07T11:05:00.000Z"
  }
}
```

**Errors:**
- `400` - Report not completed or invalid expires_in value
- `404` - Report not found
- `401` - Unauthorized

---

### 5. List Reports by Upload
Retrieve all reports for a specific upload with filtering and pagination.

**Endpoint:** `GET /api/hmpi-report/upload/:uploadId`  
**Access:** All authenticated users  

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)
- `status` (optional): Filter by status (pending/generating/completed/failed)
- `report_type` (optional): Filter by type (summary/comprehensive)
- `sort_by` (optional): Sort field (created_at/generated_at/file_size/total_stations, default: created_at)
- `sort_order` (optional): Sort direction (asc/desc, default: desc)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Retrieved 2 report(s) for upload 123",
  "data": [
    {
      "id": 456,
      "upload_id": 123,
      "report_title": "HMPI Report - Upload 123",
      "status": "completed",
      "...": "..."
    },
    {
      "id": 457,
      "upload_id": 123,
      "report_title": "HMPI Report - Upload 123",
      "status": "failed",
      "...": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

**Errors:**
- `400` - Invalid parameters
- `401` - Unauthorized

---

### 6. List All Reports
Retrieve all reports with advanced filtering and pagination.

**Endpoint:** `GET /api/hmpi-report`  
**Access:** All authenticated users  

**Query Parameters:** Same as "List Reports by Upload"

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Retrieved 25 report(s)",
  "data": [
    {
      "id": 456,
      "upload_id": 123,
      "...": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

---

### 7. Regenerate Report
Re-generate a failed report or create a new version with updated data.

**Endpoint:** `POST /api/hmpi-report/:id/regenerate`  
**Access:** Admin, Scientist  

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report regeneration completed",
  "data": {
    "report": {
      "id": 456,
      "upload_id": 123,
      "status": "completed",
      "file_name": "hmpi-report-456-regenerated-1733566900000.pdf",
      "...": "..."
    },
    "message": "Report has been regenerated successfully."
  }
}
```

**Errors:**
- `400` - Invalid report ID
- `404` - Report not found
- `401` - Unauthorized
- `403` - Insufficient permissions

---

## Report Structure

Generated PDF reports include:

1. **Executive Summary**
   - Total stations analyzed
   - Average HPI, MI, WQI values
   - Generation metadata

2. **HPI Analysis**
   - Distribution histogram
   - Classification pie chart
   - Classification breakdown table

3. **MI Analysis**
   - Distribution histogram
   - Classification pie chart
   - Classification breakdown table

4. **WQI Analysis**
   - Distribution histogram
   - Classification pie chart
   - Classification breakdown table

5. **Top Polluted Stations**
   - Horizontal bar chart showing top 10 stations by HPI
   - Station IDs and pollution levels

6. **Geographic Distribution**
   - Bar chart of stations by state
   - Regional analysis summary

7. **Recommendations**
   - Data quality insights
   - Action items based on analysis
   - Classification summaries

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details (dev environment only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Resource created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

---

## Usage Examples

### Generate a Report (curl)
```bash
curl -X POST http://localhost:3000/api/hmpi-report/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"upload_id": 123, "report_type": "comprehensive"}'
```

### Poll Report Status (curl)
```bash
curl -X GET http://localhost:3000/api/hmpi-report/456/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download Report (curl)
```bash
curl -X GET "http://localhost:3000/api/hmpi-report/456/download?expires_in=7200" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Reports (curl)
```bash
curl -X GET "http://localhost:3000/api/hmpi-report?page=1&limit=20&status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

- Reports are generated asynchronously. Use the status endpoint to poll for completion.
- PDFs are stored privately on S3. Access requires pre-signed URLs from the download endpoint.
- Pre-signed URLs expire after the specified duration (default: 1 hour).
- Soft-deleted reports return 404 errors.
- Report generation time varies based on the number of stations (estimate: ~0.03 seconds per station).
