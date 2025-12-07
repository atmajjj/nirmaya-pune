import { hmpiReports, ReportType, ReportStatus } from './schema';

// ============================================================================
// HMPI Report Interfaces
// ============================================================================

/**
 * HMPI Report entity interface
 * Used for API responses
 */
export interface HMPIReport {
  id: number;
  upload_id: number;
  report_title: string;
  report_type: ReportType;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  total_stations: number;
  avg_hpi: string | null;
  avg_mi: string | null;
  avg_wqi: string | null;
  status: ReportStatus;
  error_message: string | null;
  generated_at: string | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: string | null;
}

/**
 * Input for creating a new report
 */
export interface CreateReportInput {
  upload_id: number;
  report_title: string;
  report_type?: ReportType;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  total_stations: number;
  avg_hpi?: number | null;
  avg_mi?: number | null;
  avg_wqi?: number | null;
  status?: ReportStatus;
  error_message?: string | null;
  generated_at?: Date | null;
  created_by: number;
}

/**
 * Input for updating a report
 */
export interface UpdateReportInput {
  report_title?: string;
  file_name?: string;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  total_stations?: number;
  avg_hpi?: number | null;
  avg_mi?: number | null;
  avg_wqi?: number | null;
  status?: ReportStatus;
  error_message?: string | null;
  generated_at?: Date | null;
  updated_by: number;
}

/**
 * Report list query parameters
 */
export interface ReportListParams {
  page?: number;
  limit?: number;
  upload_id?: number;
  status?: ReportStatus;
  report_type?: ReportType;
  created_by?: number;
  sort_by?: 'created_at' | 'generated_at' | 'file_size' | 'total_stations';
  sort_order?: 'asc' | 'desc';
}

/**
 * Report list response with pagination
 */
export interface ReportListResult {
  reports: HMPIReport[];
  total: number;
}

/**
 * Report statistics for aggregation
 */
export interface ReportStatistics {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  pendingReports: number;
  generatingReports: number;
  totalStations: number;
  avgHPI: number | null;
  avgMI: number | null;
  avgWQI: number | null;
}

/**
 * Report data aggregation result
 * Used by report generation services
 */
export interface ReportData {
  uploadId: number;
  uploadFilename: string;
  totalStations: number;
  avgHPI: number | null;
  avgMI: number | null;
  avgWQI: number | null;
  hpiStats: {
    classificationCounts: Record<string, number>;
    topPollutedStations: Array<{
      stationId: string;
      hpi: number;
      classification: string;
      location?: string;
    }>;
  };
  miStats: {
    classificationCounts: Record<string, number>;
    classCounts: Record<string, number>;
  };
  wqiStats: {
    classificationCounts: Record<string, number>;
    parameterContributions?: Record<string, number>;
  };
  geoData: {
    states: Array<{ state: string; count: number }>;
    cities: Array<{ city: string; count: number }>;
  };
  calculationDate: Date;
  generatedBy: number;
}

/**
 * Chart image data
 * Base64-encoded strings for embedding in PDF
 */
export interface ChartImages {
  hpiDistribution: string;
  miDistribution: string;
  wqiDistribution: string;
  hpiClassification: string;
  miClassification: string;
  wqiClassification: string;
  topPollutedStations: string;
  geographicDistribution: string;
}

/**
 * Convert Drizzle report to API response format
 */
export function convertReport(
  drizzleReport: typeof hmpiReports.$inferSelect
): HMPIReport {
  return {
    ...drizzleReport,
    created_at: drizzleReport.created_at.toISOString(),
    updated_at: drizzleReport.updated_at.toISOString(),
    deleted_at: drizzleReport.deleted_at?.toISOString() || null,
    generated_at: drizzleReport.generated_at?.toISOString() || null,
  };
}
