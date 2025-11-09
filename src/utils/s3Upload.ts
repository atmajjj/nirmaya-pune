import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import HttpException from './httpException';
import { logger } from './logger';

// Initialize S3 client
export const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
  },
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true, // Required for some S3-compatible services
});

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file buffer to S3
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  userId: number
): Promise<S3UploadResult> {
  try {
    const bucket = process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    // Create a folder structure: uploads/{userId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${userId}/${timestamp}_${sanitizedFilename}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read', // Make file publicly accessible
    });

    await s3Client.send(command);

    // Construct the URL based on your S3 configuration
    // For standard AWS S3: https://bucket-name.s3.region.amazonaws.com/key
    // For S3-compatible services (like Supabase): endpoint/bucket/key
    let url: string;
    const endpoint = process.env.AWS_ENDPOINT || '';
    const region = process.env.AWS_REGION || '';

    if (endpoint) {
      // For S3-compatible services with custom endpoint
      // Remove trailing slashes and clean up the endpoint
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      url = `${cleanEndpoint}/${bucket}/${key}`;
    } else {
      // For standard AWS S3
      url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    logger.info(`File uploaded to S3: ${key}`);

    return {
      key,
      url,
      bucket,
      size: buffer.length,
      contentType: mimetype,
    };
  } catch (error) {
    logger.error(`S3 upload error: ${error.message}`);
    throw new HttpException(500, `Failed to upload file to S3: ${error.message}`);
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
    logger.error(`Multiple S3 upload error: ${error.message}`);
    throw new HttpException(500, `Failed to upload files to S3: ${error.message}`);
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
    const bucket = process.env.AWS_BUCKET_NAME;
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
    logger.error(`S3 download error: ${error.message}`);
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, `Failed to download file from S3: ${error.message}`);
  }
}
