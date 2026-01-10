/**
 * Nirmaya Engine Routes
 * Water Quality Index calculation API endpoints
 * Calculates HPI, MI, and WQI indices from water quality data
 *
 * Access: All roles except 'researcher'
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routes
import previewRouter from './apis/preview';
import calculateRouter from './apis/calculate';
import calculateFromSourceRouter from './apis/calculate-from-source';
import calculateManualRouter from './apis/calculate-manual';
import listCalculationsRouter from './apis/list-calculations';
import getCalculationRouter from './apis/get-calculation';
import downloadResultsRouter from './apis/download-results';
import getStatsRouter from './apis/get-stats';
import getGeomapDataRouter from './apis/get-geomap-data';
import aiReportRouter from '../ai-reports/apis/generate-report';

class NirmayaEngineRoute implements Route {
  public path = '/nirmaya-engine';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Mount all Nirmaya engine routes
    // POST /api/nirmaya-engine/preview - Preview CSV and detect available calculations
    this.router.use(this.path, previewRouter);
    
    // POST /api/nirmaya-engine/calculate - Upload CSV and calculate indices
    this.router.use(this.path, calculateRouter);
    
    // POST /api/nirmaya-engine/calculate-from-source - Calculate from pre-uploaded data source
    this.router.use(this.path, calculateFromSourceRouter);
    
    // POST /api/nirmaya-engine/calculate-manual - Calculate from manually entered values
    this.router.use(this.path, calculateManualRouter);
    
    // GET /api/nirmaya-engine/calculations - List calculations with filters
    this.router.use(this.path, listCalculationsRouter);
    
    // GET /api/nirmaya-engine/calculations/:id - Get single calculation
    this.router.use(this.path, getCalculationRouter);
    
    // GET /api/nirmaya-engine/uploads/:upload_id/download - Download results as CSV
    this.router.use(this.path, downloadResultsRouter);
    
    // GET /api/nirmaya-engine/stats - Get statistics
    this.router.use(this.path, getStatsRouter);
    
    // GET /api/nirmaya-engine/geomap - Get geomap data for visualization
    this.router.use(this.path, getGeomapDataRouter);
    
    // POST /api/nirmaya-engine/ai-report - Generate AI-powered report
    this.router.use(this.path, aiReportRouter);
  }
}

export default NirmayaEngineRoute;
