/**
 * Upload Routes
 * Combines all upload API endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import createUploadRouter from './apis/create-upload';
import getUploadsRouter from './apis/get-uploads';
import updateUploadRouter from './apis/update-upload';
import deleteUploadRouter from './apis/delete-upload';
import uploadStatsRouter from './apis/upload-stats';
import downloadFileRouter from './apis/download-file';

class UploadRoute implements Route {
  public path = '/uploads';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Mount all upload routes
    // Note: stats must be before /:id routes to match /stats correctly
    this.router.use(this.path, uploadStatsRouter);
    this.router.use(this.path, createUploadRouter);
    this.router.use(this.path, getUploadsRouter);
    this.router.use(this.path, updateUploadRouter);
    this.router.use(this.path, deleteUploadRouter);
    this.router.use(this.path, downloadFileRouter);
  }
}

export default UploadRoute;
