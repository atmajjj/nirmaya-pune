/**
 * HMPI Engine Routes
 * Heavy Metal Pollution Index calculation API endpoints
 * Calculates HPI, MI, and WQI indices from water quality data
 *
 * Access: All roles except 'researcher'
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routes
import previewRouter from './apis/preview';
import calculateRouter from './apis/calculate';
import listCalculationsRouter from './apis/list-calculations';
import getCalculationRouter from './apis/get-calculation';
import downloadResultsRouter from './apis/download-results';
import getStatsRouter from './apis/get-stats';

class HMPIEngineRoute implements Route {
  public path = '/hmpi-engine';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Mount all HMPI engine routes
    // POST /api/hmpi-engine/preview - Preview CSV and detect available calculations
    this.router.use(this.path, previewRouter);
    
    // POST /api/hmpi-engine/calculate - Upload CSV and calculate indices
    this.router.use(this.path, calculateRouter);
    
    // GET /api/hmpi-engine/calculations - List calculations with filters
    this.router.use(this.path, listCalculationsRouter);
    
    // GET /api/hmpi-engine/calculations/:id - Get single calculation
    this.router.use(this.path, getCalculationRouter);
    
    // GET /api/hmpi-engine/uploads/:upload_id/download - Download results as CSV
    this.router.use(this.path, downloadResultsRouter);
    
    // GET /api/hmpi-engine/stats - Get statistics
    this.router.use(this.path, getStatsRouter);
  }
}

export default HMPIEngineRoute;
