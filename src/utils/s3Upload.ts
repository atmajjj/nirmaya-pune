import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import HttpException from './httpException';
import { logger } from './logger';
import { config } from './validateEnv';

// Initialize S3 client
export const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY,
    secretAccessKey: config.AWS_SECRET_KEY,
  },
  region: config.AWS_REGION,
  endpoint: config.AWS_ENDPOINT,
  forcePathStyle: true, // Required for some S3-compatible services
});

/** Pre-signed URL expiration time in seconds (1 hour) */
const PRESIGNED_URL_EXPIRY = 3600;

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

/**
 * Generate a pre-signed URL for secure file access
 * Files are private by default, use this to grant temporary access
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const bucket = config.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    logger.info(`Generated pre-signed URL for: ${key}`, { expiresIn });

    return presignedUrl;
  } catch (error) {
    logger.error(`Failed to generate pre-signed URL: ${error instanceof Error ? error.message : String(error)}`);
    throw new HttpException(500, 'Failed to generate download URL');
  }
}

/**
 * Upload a file buffer to S3 (private by default)
 * Files are stored securely and accessed via pre-signed URLs
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  userId: number
): Promise<S3UploadResult> {
  try {
    const bucket = config.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/[^a-zA-Z0-9.-]/g, '_');

    // Create a folder structure: uploads/{userId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const key = `uploads/${userId}/${timestamp}_${sanitizedFilename}`;

    // Upload to S3 (private by default - no ACL specified)
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // No ACL - files are private by default
      // Use getPresignedDownloadUrl() for secure access
    });

    await s3Client.send(command);

    // Generate initial pre-signed URL for immediate access
    const url = await getPresignedDownloadUrl(key);

    logger.info(`File uploaded to S3 (private): ${key}`);

    return {
      key,
      url,
      bucket,
      size: buffer.length,
      contentType: mimetype,
    };
  } catch (error) {
    // Log full error internally for debugging
    logger.error('S3 upload error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return generic message to client - don't expose internal details
    throw new HttpException(500, 'Failed to upload file. Please try again later.');
  }
}

/**
 * Upload multiple files to S3
 */
export async function uploadMultipleToS3(
  files: Array<{ buffer: Buffer; filename: string; mimetype: string }>,
  userId: number
): Promise<S3UploadResult[]> {
  try {
    const uploadPromises = files.map(file =>
      uploadToS3(file.buffer, file.filename, file.mimetype, userId)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    logger.error('Multiple S3 upload error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new HttpException(500, 'Failed to upload files. Please try again later.');
  }
}

/**
 * Download a file from S3
 * Returns the file as a readable stream
 */
export async function downloadFromS3(
  key: string
): Promise<{ stream: unknown; contentType: string; contentLength: number }> {
  try {
    const bucket = config.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new HttpException(404, 'File not found in S3');
    }

    logger.info(`File downloaded from S3: ${key}`);

    return {
      stream: response.Body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  } catch (error) {
    logger.error('S3 download error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to download file. Please try again later.');
  }
}
