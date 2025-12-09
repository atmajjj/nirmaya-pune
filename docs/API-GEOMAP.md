# Geomap API Documentation

## Endpoint
`GET /api/nirmaya-engine/geomap`

## Description
Returns geographical map data for all water quality monitoring stations with coordinates, HPI scores, MI scores, and risk level classifications. This endpoint is designed specifically for frontend map visualization.

## Authentication
Requires JWT authentication token and one of the following roles:
- `admin`
- `scientist`
- `policymaker`
- `researcher`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | string | No | Filter by state name (case-insensitive) |
| `upload_id` | number | No | Filter by specific upload ID |
| `risk_level` | enum | No | Filter by risk level: `safe`, `moderate`, `unsafe` |
| `year` | number | No | Filter by year |
| `min_hpi` | number | No | Minimum HPI score |
| `max_hpi` | number | No | Maximum HPI score |

## Risk Level Classification

The `risk_level` is automatically calculated based on HPI score:

| Risk Level | HPI Range | Description |
|------------|-----------|-------------|
| `safe` | 0 - 49.99 | Excellent to Good water quality |
| `moderate` | 50 - 99.99 | Poor to Very Poor water quality |
| `unsafe` | 100+ | Unsuitable/Critical pollution levels |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Retrieved 15 monitoring stations",
  "data": [
    {
      "id": 123,
      "station_id": "STATION_001",
      "name": "Delhi Central Monitoring Station",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "state": "Delhi",
        "district": "Central Delhi",
        "city": "New Delhi"
      },
      "year": 2024,
      "hpi_score": 45.5,
      "hpi_classification": "Excellent - Low pollution",
      "mi_score": 0.85,
      "mi_classification": "Very Pure",
      "risk_level": "safe",
      "metals_analyzed": ["As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb"]
    },
    {
      "id": 124,
      "station_id": "STATION_002",
      "name": "Mumbai Industrial Zone",
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "district": "Mumbai",
        "city": "Mumbai"
      },
      "year": 2024,
      "hpi_score": 78.3,
      "hpi_classification": "Poor - Medium pollution",
      "mi_score": 2.15,
      "mi_classification": "Slightly Affected",
      "risk_level": "moderate",
      "metals_analyzed": ["As", "Cu", "Zn", "Pb", "Cr"]
    },
    {
      "id": 125,
      "station_id": "STATION_003",
      "name": "Kolkata River Bank",
      "location": {
        "latitude": 22.5726,
        "longitude": 88.3639,
        "state": "West Bengal",
        "district": "Kolkata",
        "city": "Kolkata"
      },
      "year": 2024,
      "hpi_score": 125.7,
      "hpi_classification": "Unsuitable - Critical pollution",
      "mi_score": 4.52,
      "mi_classification": "Strongly Affected",
      "risk_level": "unsafe",
      "metals_analyzed": ["As", "Pb", "Cd", "Cr", "Hg"]
    }
  ]
}
```

## Example Requests

### Get all stations
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by state
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap?state=Delhi" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by risk level (unsafe stations only)
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap?risk_level=unsafe" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by HPI range (moderate pollution)
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap?min_hpi=50&max_hpi=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by upload ID
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap?upload_id=42" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Combine multiple filters
```bash
curl -X GET "http://localhost:4000/api/nirmaya-engine/geomap?state=Maharashtra&risk_level=unsafe&year=2024" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required role: admin, scientist, policymaker, researcher"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid query parameters",
  "errors": [
    {
      "field": "risk_level",
      "message": "Invalid enum value. Expected 'safe' | 'moderate' | 'unsafe'"
    }
  ]
}
```

## Frontend Integration Example

### JavaScript/TypeScript

```typescript
interface GeomapStation {
  id: number;
  station_id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    state: string | null;
    district: string | null;
    city: string | null;
  };
  year: number | null;
  hpi_score: number | null;
  hpi_classification: string | null;
  mi_score: number | null;
  mi_classification: string | null;
  risk_level: 'safe' | 'moderate' | 'unsafe';
  metals_analyzed: string[];
}

async function fetchGeomapData(filters?: {
  state?: string;
  risk_level?: 'safe' | 'moderate' | 'unsafe';
  upload_id?: number;
}): Promise<GeomapStation[]> {
  const queryParams = new URLSearchParams();
  
  if (filters?.state) queryParams.append('state', filters.state);
  if (filters?.risk_level) queryParams.append('risk_level', filters.risk_level);
  if (filters?.upload_id) queryParams.append('upload_id', filters.upload_id.toString());
  
  const response = await fetch(
    `http://localhost:4000/api/nirmaya-engine/geomap?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  
  const result = await response.json();
  return result.data;
}

// Usage examples
const allStations = await fetchGeomapData();
const delhiStations = await fetchGeomapData({ state: 'Delhi' });
const unsafeStations = await fetchGeomapData({ risk_level: 'unsafe' });
```

### React Component Example

```tsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

function WaterQualityMap() {
  const [stations, setStations] = useState<GeomapStation[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    const filters = riskFilter !== 'all' ? { risk_level: riskFilter } : undefined;
    fetchGeomapData(filters).then(setStations);
  }, [riskFilter]);

  const getMarkerColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return 'green';
      case 'moderate': return 'orange';
      case 'unsafe': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div>
      <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
        <option value="all">All Stations</option>
        <option value="safe">Safe</option>
        <option value="moderate">Moderate</option>
        <option value="unsafe">Unsafe</option>
      </select>

      <MapContainer center={[20.5937, 78.9629]} zoom={5}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.location.latitude, station.location.longitude]}
          >
            <Popup>
              <div>
                <h3>{station.name}</h3>
                <p><strong>Station ID:</strong> {station.station_id}</p>
                <p><strong>Location:</strong> {station.location.city}, {station.location.state}</p>
                <p><strong>HPI Score:</strong> {station.hpi_score?.toFixed(2)}</p>
                <p><strong>Classification:</strong> {station.hpi_classification}</p>
                <p><strong>Risk Level:</strong> 
                  <span style={{ color: getMarkerColor(station.risk_level) }}>
                    {station.risk_level.toUpperCase()}
                  </span>
                </p>
                <p><strong>Metals Analyzed:</strong> {station.metals_analyzed.join(', ')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

## Notes

- Only stations with valid latitude and longitude coordinates are returned
- Stations are sorted by HPI score in descending order (highest pollution first)
- Only non-deleted calculations are included
- All numeric values (HPI, MI, coordinates) are returned as actual numbers, not strings
- The `metals_analyzed` array is automatically parsed from the comma-separated database field

## Performance Considerations

- For large datasets, consider implementing pagination in the frontend
- Use state/upload_id filters to reduce payload size when possible
- Cache responses in the frontend for frequently accessed data
- Consider using WebSocket for real-time updates if needed
