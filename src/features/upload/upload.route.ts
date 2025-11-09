import { Router } from 'express';
import UploadController from './upload.controller';
import Route from '../../interfaces/route.interface';
import { updateUploadSchema, uploadQuerySchema } from './upload.validation';
import validationMiddleware from '../../middlewares/validation.middleware';
import { requireAuth } from '../../middlewares/auth.middleware';
import { uploadSingleFileMiddleware } from '../../middlewares/upload.middleware';

class UploadRoute implements Route {
  public path = '/uploads';
  public router = Router();
  public uploadController = new UploadController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/v1/uploads - Get all uploads for authenticated user
    this.router.get(
      `${this.path}`,
      requireAuth,
      validationMiddleware(uploadQuerySchema, 'query'),
      this.uploadController.getAllUploads
    );

    // GET /api/v1/uploads/stats - Get upload statistics
    this.router.get(`${this.path}/stats`, requireAuth, this.uploadController.getUploadStats);

    // GET /api/v1/uploads/status/:status - Get uploads by status
    this.router.get(
      `${this.path}/status/:status`,
      requireAuth,
      this.uploadController.getUploadsByStatus
    );

    // POST /api/v1/uploads - Upload file to S3
    // This route accepts multipart/form-data with a 'file' field
    this.router.post(
      `${this.path}`,
      requireAuth,
      uploadSingleFileMiddleware, // Requires a file upload
      this.uploadController.createUpload
    );

    // GET /api/v1/uploads/:id - Get upload by ID
    this.router.get(`${this.path}/:id`, requireAuth, this.uploadController.getUploadById);

    // GET /api/v1/uploads/:id/download - Download file from S3
    this.router.get(`${this.path}/:id/download`, requireAuth, this.uploadController.downloadFile);

    // PUT /api/v1/uploads/:id - Update upload
    this.router.put(
      `${this.path}/:id`,
      requireAuth,
      validationMiddleware(updateUploadSchema),
      this.uploadController.updateUpload
    );

    // DELETE /api/v1/uploads/:id - Delete upload
    this.router.delete(`${this.path}/:id`, requireAuth, this.uploadController.deleteUpload);
  }
}

export default UploadRoute;
