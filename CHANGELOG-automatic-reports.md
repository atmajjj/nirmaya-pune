# Automatic Report Generation Implementation

**Date**: December 9, 2025  
**Feature**: Automatic HMPI Report Generation After Calculations

## Summary

Implemented automatic PDF report generation that triggers in the background immediately after successful water quality calculations. Reports are now automatically created and stored in the database without requiring manual API calls.

## Changes Made

### 1. Updated `/api/hmpi-engine/calculate` endpoint
**File**: `src/features/hmpi-engine/apis/calculate.ts`

**Changes**:
- Added imports for `ReportGeneratorService` and `logger`
- Modified `processCSVCalculation()` function to automatically trigger report generation after successful calculations
- Report generation runs asynchronously in background (non-blocking)
- Only generates reports when `processed_stations > 0`
- Added logging for successful report generation and error handling
- Updated response messages to inform users that "Report generation started"

### 2. Updated `/api/hmpi-engine/calculate-from-source` endpoint
**File**: `src/features/hmpi-engine/apis/calculate-from-source.ts`

**Changes**:
- Same improvements as calculate endpoint
- Triggers automatic report generation when calculations complete
- Includes data source ID in logging for traceability
- Background report generation with error handling

## How It Works

### Calculation Flow (Before)
1. User uploads CSV file
2. System calculates HPI, MI, WQI indices
3. Results saved to database
4. Response returned to user
5. **User must manually call `/api/hmpi-report/generate`** ❌

### Calculation Flow (After - Current)
1. User uploads CSV file
2. System calculates HPI, MI, WQI indices
3. Results saved to database
4. **Automatic report generation triggered in background** ✅
5. Response returned immediately (non-blocking)
6. Report generated asynchronously with status tracking

## Technical Implementation

```typescript
// After successful calculation completion
if (result.processed_stations > 0) {
  ReportGeneratorService.generateReport(uploadId, userId, 'comprehensive')
    .then(() => {
      logger.info(`Auto-generated report for upload ${uploadId}`);
    })
    .catch(error => {
      logger.error(`Failed to auto-generate report for upload ${uploadId}:`, error);
    });
}
```

### Key Features
- **Non-blocking**: Report generation happens asynchronously
- **Error isolation**: If report generation fails, calculation results are still saved
- **Logging**: Full tracking of report generation success/failure
- **Conditional**: Only triggers when at least one station processed successfully
- **Type**: Always generates 'comprehensive' reports by default

## Database Impact

### Reports Table (`hmpi_reports`)
Reports are now automatically populated with:
- `upload_id`: Reference to the calculation upload
- `report_title`: Auto-generated title
- `report_type`: 'comprehensive'
- `status`: Tracks generation progress (pending → generating → completed/failed)
- `file_path`, `file_url`: S3 storage details
- `total_stations`, `avg_hpi`, `avg_mi`, `avg_wqi`: Cached statistics
- Audit fields: `created_by`, `created_at`, etc.

## Admin Panel Integration

### Reports Now Visible In Admin Stats
The admin dashboard (`/api/admin/stats`) automatically includes:
```json
{
  "reports": {
    "total": 342,
    "by_status": {
      "generating": 5,
      "completed": 320,
      "failed": 17
    },
    "recent_reports": 48  // Last 30 days
  }
}
```

### List All Reports
Admins can view all reports via:
- `GET /api/hmpi-report` - All reports with pagination/filtering
- `GET /api/hmpi-report/upload/:uploadId` - Reports for specific upload
- Filter by status: `pending`, `generating`, `completed`, `failed`
- Sort by: `created_at`, `generated_at`, `file_size`, `total_stations`

## Benefits

1. **User Experience**: No need to manually request report generation
2. **Consistency**: Every calculation automatically gets a report
3. **Admin Visibility**: All reports tracked and visible in admin panel
4. **Performance**: Non-blocking approach doesn't slow down calculations
5. **Reliability**: Error handling ensures calculation success isn't affected by report failures

## Testing

### Manual Testing
1. Upload CSV file via `/api/hmpi-engine/calculate`
2. Check response includes "Report generation started"
3. Wait a few seconds for report generation
4. Verify report exists via `/api/hmpi-report/upload/:uploadId`
5. Check admin stats via `/api/admin/stats` to see report count

### Checking Report Status
```bash
# Get report status by upload ID
GET /api/hmpi-report/upload/:uploadId

# Download report once completed
GET /api/hmpi-report/:reportId/download
```

## Backwards Compatibility

✅ **Fully backwards compatible**
- Manual report generation (`/api/hmpi-report/generate`) still works
- Existing reports remain unchanged
- No breaking changes to existing APIs
- Additional reports won't be created if one already exists (handled by ReportGeneratorService)

## Monitoring

### Logs to Watch
```
INFO: Auto-generated report for upload ${uploadId}
ERROR: Failed to auto-generate report for upload ${uploadId}: ${error}
```

### Admin Dashboard Metrics
- Total reports generated
- Reports by status (track failures)
- Recent reports (last 30 days)

## Future Enhancements

1. **Configurable Report Types**: Allow users to choose 'summary' vs 'comprehensive'
2. **Email Notifications**: Notify users when report is ready
3. **Retry Logic**: Automatically retry failed report generations
4. **Report Templates**: Multiple report formats/styles
5. **Scheduled Reports**: Generate reports at specific intervals

## Rollback Plan

If issues arise, revert commits to:
- `src/features/hmpi-engine/apis/calculate.ts`
- `src/features/hmpi-engine/apis/calculate-from-source.ts`

Remove the report generation trigger blocks and restore original response messages.

---

**Status**: ✅ Implemented and Tested  
**Build**: ✅ Passing  
**Ready for**: Production Deployment
