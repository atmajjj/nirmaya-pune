import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import uploadRouter from './apis/upload';
import listRouter from './apis/list';
import getRouter from './apis/get';
import deleteRouter from './apis/delete';
import reprocessRouter from './apis/reprocess';

/**
 * Data Sources Feature
 * Allows field technicians to upload CSV/Excel files
 * Scientists can view and select these files for HMPI calculations
 */
export default class DataSourcesRoute implements Route {
  public path = '/data-sources';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // POST /api/data-sources/upload - Field technicians upload files
    this.router.use(uploadRouter);
    
    // GET /api/data-sources - List all data sources (with filters)
    this.router.use(listRouter);
    
    // GET /api/data-sources/:id - Get specific data source details
    this.router.use(getRouter);
    
    // DELETE /api/data-sources/:id - Soft delete a data source
    this.router.use(deleteRouter);
    
    // POST /api/data-sources/:id/reprocess - Reprocess file (admin/scientist)
    this.router.use(reprocessRouter);
  }
}
