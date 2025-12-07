// src/features/hmpi-report/hmpi-report.routes.ts
import { Router } from 'express';
import type Route from '../../interfaces/route.interface';

// Import all API routers
import generateReportRouter from './apis/generate-report';
import getReportRouter from './apis/get-report';
import downloadReportRouter from './apis/download-report';
import listReportsRouter from './apis/list-reports';
import regenerateReportRouter from './apis/regenerate-report';
import getReportStatusRouter from './apis/get-report-status';

/**
 * HMPI Report Routes
 * 
 * Manages automated PDF report generation for HMPI water quality analysis.
 * Provides endpoints for generating, retrieving, downloading, and managing reports.
 * 
 * Routes:
 * - POST   /api/hmpi-report/generate         - Generate new report
 * - GET    /api/hmpi-report/:id              - Get report details
 * - GET    /api/hmpi-report/:id/download     - Download report PDF
 * - GET    /api/hmpi-report/:id/status       - Get generation status
 * - POST   /api/hmpi-report/:id/regenerate   - Regenerate failed report
 * - GET    /api/hmpi-report/upload/:uploadId - List reports by upload
 * - GET    /api/hmpi-report                  - List all reports
 */
class HMPIReportRoutes implements Route {
  public path = '/hmpi-report';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Generate new report
    this.router.use(this.path, generateReportRouter);

    // Get report status (must come before /:id to avoid conflicts)
    this.router.use(this.path, getReportStatusRouter);

    // Download report PDF
    this.router.use(this.path, downloadReportRouter);

    // Regenerate failed report
    this.router.use(this.path, regenerateReportRouter);

    // List reports by upload ID and all reports
    this.router.use(this.path, listReportsRouter);

    // Get report details (must come last to avoid path conflicts)
    this.router.use(this.path, getReportRouter);
  }
}

export default HMPIReportRoutes;
