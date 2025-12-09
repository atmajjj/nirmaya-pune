import {
  AlertSeverity,
  AlertType,
  AlertStatus,
  RiskLevel,
  PolicymakerAlert,
} from './schema';

/**
 * Alert entity interface for API responses
 */
export interface AlertResponse {
  id: number;
  calculation_id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  station_id: string;
  state: string | null;
  district: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  hpi_value: number | null;
  hpi_classification: string | null;
  mi_value: number | null;
  mi_classification: string | null;
  wqi_value: number | null;
  wqi_classification: string | null;
  risk_level: RiskLevel;
  title: string;
  description: string | null;
  recommendations: string | null;
  acknowledged_by: number | null;
  acknowledged_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Alert statistics for dashboard
 */
export interface AlertStats {
  total: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_status: {
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
  };
  by_risk_level: {
    safe: number;
    moderate: number;
    unsafe: number;
  };
  by_state: Array<{
    state: string;
    count: number;
  }>;
  recent_alerts: AlertResponse[];
}

/**
 * Location risk summary for downloads
 */
export interface LocationRiskSummary {
  station_id: string;
  state: string | null;
  district: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  hpi_value: number | null;
  hpi_classification: string | null;
  mi_value: number | null;
  mi_classification: string | null;
  wqi_value: number | null;
  wqi_classification: string | null;
  risk_level: RiskLevel;
  year: number | null;
}

/**
 * Query parameters for listing alerts
 */
export interface AlertQueryParams {
  page?: number;
  limit?: number;
  severity?: AlertSeverity;
  status?: AlertStatus;
  alert_type?: AlertType;
  risk_level?: RiskLevel;
  state?: string;
  district?: string;
  sort_by?: 'created_at' | 'severity' | 'risk_level' | 'state';
  sort_order?: 'asc' | 'desc';
}

/**
 * Input for acknowledging an alert
 */
export interface AcknowledgeAlertInput {
  notes?: string;
}

/**
 * Input for resolving an alert
 */
export interface ResolveAlertInput {
  resolution_notes: string;
}

/**
 * Risk thresholds configuration
 */
export interface RiskThresholds {
  hpi: {
    safe: number;      // HPI < this = safe
    moderate: number;  // HPI < this = moderate, else unsafe
  };
  mi: {
    safe: number;      // MI < this = safe
    moderate: number;  // MI < this = moderate, else unsafe
  };
}

/**
 * Default risk thresholds based on standard classifications
 * HPI: <25 safe, 25-75 moderate, >75 unsafe
 * MI: <1 safe, 1-4 moderate, >4 unsafe
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  hpi: {
    safe: 25,      // Excellent
    moderate: 75,  // Good to Poor
  },
  mi: {
    safe: 1,       // Very Pure to Pure
    moderate: 4,   // Slightly to Moderately Affected
  },
};

/**
 * Convert DB alert to API response format
 */
export function convertAlertToResponse(alert: PolicymakerAlert): AlertResponse {
  return {
    id: alert.id,
    calculation_id: alert.calculation_id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    status: alert.status,
    station_id: alert.station_id,
    state: alert.state,
    district: alert.district,
    location: alert.location,
    latitude: alert.latitude ? parseFloat(String(alert.latitude)) : null,
    longitude: alert.longitude ? parseFloat(String(alert.longitude)) : null,
    hpi_value: alert.hpi_value ? parseFloat(String(alert.hpi_value)) : null,
    hpi_classification: alert.hpi_classification,
    mi_value: alert.mi_value ? parseFloat(String(alert.mi_value)) : null,
    mi_classification: alert.mi_classification,
    wqi_value: alert.wqi_value ? parseFloat(String(alert.wqi_value)) : null,
    wqi_classification: alert.wqi_classification,
    risk_level: alert.risk_level,
    title: alert.title,
    description: alert.description,
    recommendations: alert.recommendations,
    acknowledged_by: alert.acknowledged_by,
    acknowledged_at: alert.acknowledged_at ? alert.acknowledged_at.toISOString() : null,
    resolution_notes: alert.resolution_notes,
    resolved_at: alert.resolved_at ? alert.resolved_at.toISOString() : null,
    created_at: alert.created_at.toISOString(),
    updated_at: alert.updated_at.toISOString(),
  };
}
