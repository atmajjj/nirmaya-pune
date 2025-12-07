/**
 * HMPI Report Feature
 * 
 * Provides automatic PDF report generation for HMPI water quality calculations.
 * Reports include comprehensive analysis with charts, statistics, and recommendations.
 * 
 * Status: Phase 6 Complete (API Endpoints)
 * Note: Chart generation and PDF require system dependencies (canvas, chromium) in production
 */

// Export schema
export * from './shared/schema';

// Export interfaces
export * from './shared/interface';

// Export queries
export * from './shared/queries';

// Export services
export { ReportDataService } from './services/report-data.service';
export { ChartGeneratorService } from './services/chart-generator.service';
export { PDFGeneratorService } from './services/pdf-generator.service';
export { ReportGeneratorService } from './services/report-generator.service';

// Export routes
export { default as HMPIReportRoutes } from './hmpi-report.routes';
