/**
 * Admin Stats Route
 * Provides comprehensive system-wide statistics for admin dashboard
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getStatsRouter from './apis/get-stats';

class AdminStatsRoute implements Route {
  public path = '/admin';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use(this.path, getStatsRouter);
  }
}

export default AdminStatsRoute;
