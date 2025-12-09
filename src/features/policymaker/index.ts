/**
 * Policymaker Routes
 * Dashboard APIs for policymakers including alerts, risks, and location data
 *
 * Access: policymaker, admin
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routes
import listAlertsRouter from './apis/list-alerts';
import getAlertRouter from './apis/get-alert';
import getAlertStatsRouter from './apis/get-alert-stats';
import acknowledgeAlertRouter from './apis/acknowledge-alert';
import resolveAlertRouter from './apis/resolve-alert';
import generateAlertsRouter from './apis/generate-alerts';
import downloadLocationsRouter from './apis/download-locations';
import getLocationSummaryRouter from './apis/get-location-summary';

class PolicymakerRoute implements Route {
  public path = '/policymaker';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Alert management routes
    // GET /api/policymaker/alerts - List alerts with filters
    this.router.use(this.path, listAlertsRouter);

    // GET /api/policymaker/alerts/stats - Get alert statistics for dashboard
    this.router.use(this.path, getAlertStatsRouter);

    // GET /api/policymaker/alerts/:id - Get single alert
    this.router.use(this.path, getAlertRouter);

    // PATCH /api/policymaker/alerts/:id/acknowledge - Acknowledge alert
    this.router.use(this.path, acknowledgeAlertRouter);

    // PATCH /api/policymaker/alerts/:id/resolve - Resolve alert
    this.router.use(this.path, resolveAlertRouter);

    // POST /api/policymaker/alerts/generate - Generate alerts (admin only)
    this.router.use(this.path, generateAlertsRouter);

    // Location data routes
    // GET /api/policymaker/locations/summary - Get location count by risk level
    this.router.use(this.path, getLocationSummaryRouter);

    // GET /api/policymaker/locations/download?risk_level=safe|moderate|unsafe - Download CSV
    this.router.use(this.path, downloadLocationsRouter);
  }
}

export default PolicymakerRoute;
