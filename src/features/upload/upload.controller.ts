import { Response } from 'express';
import { RequestWithUser } from '../../interfaces/request.interface';
import {
  GetUploadsService,
  CreateUploadService,
  UpdateUploadService,
  DeleteUploadService,
  UploadStatsService,
} from './services';
import { UpdateUpload } from './upload.validation';
import { UploadStatus } from './upload.schema';
import { ResponseFormatter } from '../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../utils/controllerHelpers';
import { uploadToS3, downloadFromS3 } from '../../utils/s3Upload';
import HttpException from '../../utils/httpException';
import { Readable } from 'stream';

class UploadController {
  public getUploadsService = new GetUploadsService();
  public createUploadService = new CreateUploadService();
  public updateUploadService = new UpdateUploadService();
  public deleteUploadService = new DeleteUploadService();
  public uploadStatsService = new UploadStatsService();

  /**
   * Get all uploads for the authenticated user
   */
  public getAllUploads = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = getUserId(req);

    // Parse query parameters
    const filters = {
      status: req.query.status as UploadStatus,
      mime_type: req.query.mime_type as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as 'created_at' | 'file_size' | 'original_filename',
      sort_order: req.query.sort_order as 'asc' | 'desc',
    };

    const result = await this.getUploadsService.getAllUploadsByUserId(userId, filters);

    ResponseFormatter.paginated(
      res,
      result.uploads,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Uploads retrieved successfully'
    );
  });

  /**
   * Get upload by ID
   */
  public getUploadById = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const uploadId = parseIdParam(req);
    const userId = getUserId(req);

    const upload = await this.getUploadsService.getUploadById(uploadId, userId);

    ResponseFormatter.success(res, upload, 'Upload retrieved successfully');
  });

  /**
   * Upload a file to S3 and create upload record
   */
  public createUpload = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = getUserId(req);
    const file = req.file;

    if (!file) {
      throw new HttpException(400, 'No file uploaded');
    }

    // Upload to S3
    const s3Result = await uploadToS3(file.buffer, file.originalname, file.mimetype, userId);

    // Create upload record with S3 data
    const upload = await this.createUploadService.createUpload({
      filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: s3Result.key,
      file_url: s3Result.url,
      user_id: userId,
      created_by: userId,
    });

    ResponseFormatter.created(res, upload, 'File uploaded successfully');
  });

  /**
   * Update an upload
   */
  public updateUpload = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const uploadId = parseIdParam(req);
    const userId = getUserId(req);
    const updateData: UpdateUpload = req.body;

    const upload = await this.updateUploadService.updateUpload(
      uploadId,
      {
        ...updateData,
        updated_by: userId,
      },
      userId
    );

    ResponseFormatter.success(res, upload, 'Upload updated successfully');
  });

  /**
   * Delete an upload
   */
  public deleteUpload = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const uploadId = parseIdParam(req);
    const userId = getUserId(req);

    await this.deleteUploadService.deleteUpload(uploadId, userId);

    ResponseFormatter.success(res, null, 'Upload deleted successfully');
  });

  /**
   * Get upload statistics for the authenticated user
   */
  public getUploadStats = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = getUserId(req);

    const stats = await this.uploadStatsService.getUploadStats(userId);

    ResponseFormatter.success(res, stats, 'Upload statistics retrieved successfully');
  });

  /**
   * Get uploads by status
   */
  public getUploadsByStatus = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = getUserId(req);
    const status = req.params.status as UploadStatus;

    const uploads = await this.getUploadsService.getUploadsByStatus(userId, status);

    ResponseFormatter.success(
      res,
      uploads,
      `Uploads with status '${status}' retrieved successfully`
    );
  });

  /**
   * Download a file from S3
   */
  public downloadFile = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const uploadId = parseIdParam(req);
    const userId = getUserId(req);

    // Get upload record to verify ownership and get S3 key
    const upload = await this.getUploadsService.getUploadById(uploadId, userId);

    if (!upload) {
      throw new HttpException(404, 'Upload not found');
    }

    // Download from S3
    const { stream, contentType, contentLength } = await downloadFromS3(upload.file_path);

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${upload.original_filename}"`);

    // Stream the file to response
    if (stream instanceof Readable) {
      stream.pipe(res);
    } else {
      // For AWS SDK v3, Body might be a different type
      const readableStream = stream as Readable;
      readableStream.pipe(res);
    }
  });
}

export default UploadController;
