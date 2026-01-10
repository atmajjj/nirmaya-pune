export interface AIReportRequest {
  uploadId: number;
}

export interface WaterQualityData {
  stationId: string;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  location?: string | null;
  year?: number | null;
  hpi?: number | null;
  hpiClassification?: string | null;
  mi?: number | null;
  miClassification?: string | null;
  miClass?: string | null;
  wqi?: number | null;
  wqiClassification?: string | null;
  metalsAnalyzed?: string | null;
  paramsAnalyzed?: string | null;
}

export interface DataSummary {
  totalStations: number;
  avgHPI: number | null;
  avgMI: number | null;
  avgWQI: number | null;
  hasHPI: boolean;
  hasMI: boolean;
  hasWQI: boolean;
  criticalStations: number;
  excellentStations: number;
  states: string[];
  districts: string[];
  years: number[];
}

export interface AIInsights {
  executiveSummary: string;
  keyFindings: string[];
  geographicalAnalysis: string;
  criticalStations: string[];
  recommendations: string[];
  temporalTrends?: string;
}

export interface ChartData {
  wqiDistributionChart?: string; // URL to chart image
  classificationPieChart?: string;
  hpiMiComparisonChart?: string;
  geographicalChart?: string;
}

export interface AIReportResponse {
  success: boolean;
  message: string;
  reportId?: number;
  pdfUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}
