/**
 * Researcher Routes
 * Handles researcher application submissions and admin management
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import joinRouter from './apis/join';
import getApplicationsRouter from './apis/get-applications';
import acceptApplicationRouter from './apis/accept-application';
import rejectApplicationRouter from './apis/reject-application';

class ResearcherRoute implements Route {
  public path = '/researcher';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Public route - anyone can apply
    this.router.use(this.path, joinRouter);

    // Admin routes - manage applications
    this.router.use(this.path, getApplicationsRouter);
    this.router.use(this.path, acceptApplicationRouter);
    this.router.use(this.path, rejectApplicationRouter);
  }
}

export default ResearcherRoute;