/**
 * Standards Management Feature
 * 
 * Allows scientists and admins to manage water quality standards:
 * - Metal standards (for HPI/MI calculations)
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import listMetalStandardsRouter from './apis/list-metal-standards';
import getMetalStandardRouter from './apis/get-metal-standard';
import updateMetalStandardRouter from './apis/update-metal-standard';

export default class StandardsRoute implements Route {
  public path = '/api/standards';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // List endpoints
    this.router.use(this.path, listMetalStandardsRouter);
    
    // Get single endpoints
    this.router.use(this.path, getMetalStandardRouter);
    
    // Update endpoints
    this.router.use(this.path, updateMetalStandardRouter);
  }
}

// Export schema and queries for use in other features
export * from './shared/schema';
export * from './shared/queries';
