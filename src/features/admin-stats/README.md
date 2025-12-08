# Admin Statistics API

**Feature**: Admin Dashboard Statistics  
**Base Path**: `/api/admin`  
**Authorization**: Admin role required  
**Version**: 1.0.0

## Overview

Provides comprehensive system-wide statistics for the admin dashboard. This endpoint aggregates metrics from all features including users, uploads, calculations, data sources, reports, and formulas.

## Endpoints

### GET /api/admin/stats

Get comprehensive admin dashboard statistics.

**Authentication**: Required (JWT Bearer token)  
**Authorization**: `admin` role only  
**Rate Limit**: Standard rate limits apply

#### Request

```http
GET /api/admin/stats HTTP/1.1
Host: api.nirmaya.com
Authorization: Bearer <jwt_token>
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Admin statistics retrieved successfully",
  "data": {
    "overview": {
      "total_users": 145,
      "total_uploads": 523,
      "total_calculations": 1834,
      "total_reports": 342,
      "total_data_sources": 289,
      "total_formulas": 12
    },
    "users": {
      "by_role": {
        "admin": 3,
        "scientist": 28,
        "field_technician": 67,
        "researcher": 34,
        "policymaker": 13
      },
      "recent_registrations": 15,
      "active_users": 132
    },
    "uploads": {
      "total": 523,
      "by_status": {
        "pending": 5,
        "processing": 2,
        "completed": 498,
        "failed": 18
      },
      "total_size_bytes": 2473928192,
      "total_size_mb": 2359.45,
      "recent_uploads": 42
    },
    "calculations": {
      "total": 1834,
      "by_index": {
        "hpi": 1834,
        "mi": 1834,
        "wqi": 1834,
        "cdeg": 1834,
        "hei": 1834,
        "pig": 1834
      },
      "by_classification": {
        "hpi": {
          "Low": 423,
          "Medium": 891,
          "High": 367,
          "Very High": 153
        },
        "mi": {
          "Excellent": 234,
          "Good": 567,
          "Poor": 678,
          "Very Poor": 298,
          "Unsuitable": 57
        },
        "wqi": {
          "Excellent": 156,
          "Good": 489,
          "Poor": 723,
          "Very Poor": 389,
          "Unsuitable": 77
        },
        "cdeg": {},
        "hei": {},
        "pig": {}
      },
      "recent_calculations": 178
    },
    "data_sources": {
      "total": 289,
      "by_status": {
        "pending": 3,
        "processing": 1,
        "available": 267,
        "archived": 15,
        "failed": 3
      },
      "by_file_type": {
        "csv": 198,
        "xlsx": 78,
        "xls": 13
      },
      "total_size_bytes": 1847293847,
      "total_size_mb": 1761.82,
      "recent_uploads": 28
    },
    "reports": {
      "total": 342,
      "by_status": {
        "generating": 2,
        "completed": 329,
        "failed": 11
      },
      "by_format": {
        "pdf": 0,
        "json": 0
      },
      "recent_reports": 34
    },
    "formulas": {
      "total": 12,
      "by_type": {
        "hpi": 5,
        "mi": 4,
        "wqi": 3
      },
      "active_formulas": 11,
      "default_formulas": 3
    },
    "system": {
      "database_status": "healthy",
      "redis_status": "healthy",
      "api_version": "1.0.0",
      "environment": "production"
    }
  }
}
```

**Error Responses**

```json
// 401 Unauthorized - Missing or invalid token
{
  "success": false,
  "message": "Unauthorized - No token provided"
}

// 403 Forbidden - Non-admin user
{
  "success": false,
  "message": "Forbidden - Admin role required"
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

## Data Structure

### Overview Section
- **total_users**: Total non-deleted users in the system
- **total_uploads**: Total upload records
- **total_calculations**: Total water quality calculations performed
- **total_reports**: Total reports generated
- **total_data_sources**: Total data source files uploaded
- **total_formulas**: Total custom formulas created

### Users Section
- **by_role**: User count grouped by role (admin, scientist, field_technician, researcher, policymaker)
- **recent_registrations**: Users registered in last 30 days
- **active_users**: Users with activity in last 30 days (currently same as total_users)

### Uploads Section
- **total**: Total upload records
- **by_status**: Count by status (pending, processing, completed, failed)
- **total_size_bytes**: Total size of all uploads in bytes
- **total_size_mb**: Total size in megabytes (rounded to 2 decimals)
- **recent_uploads**: Uploads created in last 30 days

### Calculations Section
- **total**: Total calculation records
- **by_index**: Count of calculations for each index (hpi, mi, wqi, cdeg, hei, pig)
- **by_classification**: Distribution of results by classification for each index
  - HPI: Low, Medium, High, Very High
  - MI: Excellent, Good, Poor, Very Poor, Unsuitable
  - WQI: Excellent, Good, Poor, Very Poor, Unsuitable
  - CDEG, HEI, PIG: Classifications currently empty (not grouped by default)
- **recent_calculations**: Calculations created in last 30 days

### Data Sources Section
- **total**: Total data source records
- **by_status**: Count by status (pending, processing, available, archived, failed)
- **by_file_type**: Count by file type (csv, xlsx, xls)
- **total_size_bytes**: Total size of all data sources in bytes
- **total_size_mb**: Total size in megabytes (rounded to 2 decimals)
- **recent_uploads**: Data sources uploaded in last 30 days

### Reports Section
- **total**: Total report records
- **by_status**: Count by status (generating, completed, failed)
- **by_format**: Count by format (pdf, json) - currently always 0 as format not tracked separately
- **recent_reports**: Reports created in last 30 days

### Formulas Section
- **total**: Total formula records
- **by_type**: Count by formula type (hpi, mi, wqi)
- **active_formulas**: Formulas marked as active
- **default_formulas**: Formulas marked as default

### System Section
- **database_status**: Database health (healthy, degraded, down)
- **redis_status**: Redis health (healthy, degraded, down)
- **api_version**: Current API version
- **environment**: Runtime environment (development, test, production)

## Frontend Integration

### React/Next.js Example

```typescript
import { useState, useEffect } from 'react';

interface AdminStats {
  overview: {
    total_users: number;
    total_uploads: number;
    total_calculations: number;
    total_reports: number;
    total_data_sources: number;
    total_formulas: number;
  };
  // ... other sections
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('token'); // or your token storage method
        
        const response = await fetch('http://localhost:8000/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // Optional: Set up polling for live updates
    const interval = setInterval(fetchStats, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{stats.overview.total_users}</p>
        </div>
        <div className="stat-card">
          <h3>Total Calculations</h3>
          <p>{stats.overview.total_calculations}</p>
        </div>
        {/* Add more cards... */}
      </div>

      {/* User Distribution Chart */}
      <div className="chart-section">
        <h2>Users by Role</h2>
        {/* Use your charting library (Chart.js, Recharts, etc.) */}
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h2>Recent Activity</h2>
        <p>Recent Registrations: {stats.users.recent_registrations}</p>
        <p>Recent Uploads: {stats.uploads.recent_uploads}</p>
        <p>Recent Calculations: {stats.calculations.recent_calculations}</p>
      </div>
    </div>
  );
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fetch admin stats
export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data.data;
};
```

## Performance Considerations

1. **Caching**: The endpoint performs multiple database queries. Consider implementing Redis caching:
   ```typescript
   // Cache for 5 minutes
   const cacheKey = 'admin:stats';
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   
   const stats = await getAdminStatistics();
   await redis.setex(cacheKey, 300, JSON.stringify(stats));
   ```

2. **Parallel Queries**: All database queries are already executed in parallel using `Promise.all()` for optimal performance.

3. **Rate Limiting**: Standard rate limits apply. For dashboard pages that poll frequently, consider:
   - Increasing the refresh interval (60+ seconds)
   - Implementing exponential backoff on errors
   - Using WebSocket connections for real-time updates

4. **Indexing**: Ensure database tables have proper indexes on:
   - `created_at` (for recent activity queries)
   - `is_deleted` (for filtering soft-deleted records)
   - Status fields (for grouping by status)

## Testing

```bash
# Test with curl
curl -X GET http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer <your_admin_token>"

# Test authentication
curl -X GET http://localhost:8000/api/admin/stats
# Expected: 401 Unauthorized

# Test authorization (with non-admin token)
curl -X GET http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer <researcher_token>"
# Expected: 403 Forbidden
```

## Security Notes

- **Admin Only**: This endpoint exposes sensitive system-wide metrics and must only be accessible to admin users
- **Token Required**: All requests must include a valid JWT token
- **CORS**: Ensure CORS is properly configured for your frontend domain
- **Rate Limiting**: Default rate limits apply (100 requests per 15 minutes per IP)
- **Audit Logging**: All admin stats requests should be logged for security auditing

## Future Enhancements

- Add `active_users` tracking based on last activity timestamp
- Implement classification grouping for CDEG, HEI, and PIG indices
- Add time-series data for trend analysis
- Include error rate and system performance metrics
- Add filtering by date range (last 7 days, 30 days, 90 days, custom)
- WebSocket support for real-time updates
- Export functionality (CSV, PDF reports)

## Integration Checklist

- [ ] Set up authentication token in frontend
- [ ] Create admin dashboard route/page (protected)
- [ ] Implement stats fetching with error handling
- [ ] Design UI components (cards, charts, tables)
- [ ] Add loading and error states
- [ ] Implement optional polling/refresh mechanism
- [ ] Set up charting library for visualizations
- [ ] Add responsive design for mobile devices
- [ ] Test with different user roles (ensure non-admins blocked)
- [ ] Implement caching strategy if needed
- [ ] Monitor performance and optimize queries if needed

## Support

For issues or questions regarding the Admin Stats API:
1. Check this README for integration guidance
2. Review the TypeScript interfaces in `shared/interface.ts`
3. Test the endpoint with curl/Postman to verify functionality
4. Contact the backend team for API-specific issues
