import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import HttpException from './httpException';
import { logger } from './logger';
import { config } from './validateEnv';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Initialize S3 client with proper Supabase configuration
export const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY,
    secretAccessKey: config.AWS_SECRET_KEY,
  },
  region: config.AWS_REGION,
  endpoint: config.AWS_ENDPOINT,
  forcePathStyle: true, // Required for Supabase S3
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

    // Upload to S3 with Supabase-compatible settings
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      Metadata: {
        'uploaded-by': userId.toString(),
        'upload-timestamp': timestamp.toString(),
      },
    });

    await s3Client.send(command);

    // Generate presigned URL for access
    const url = await getPresignedDownloadUrl(key);

    logger.info(`File uploaded to S3: ${key}`);

    return {
      key,
      url,
      bucket,
      size: buffer.length,
      contentType: mimetype,
    };
  } catch (error) {
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('S3 upload failed', { 
      error: errorMessage,
      stack: errorStack,
      bucket: config.AWS_BUCKET_NAME,
      endpoint: config.AWS_ENDPOINT,
    });
    
    // DEVELOPMENT FALLBACK: Use local file storage if S3 fails
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  S3 upload failed. Falling back to local file storage (DEVELOPMENT ONLY)');
      logger.warn('📝 To use S3 properly, follow the guide in SUPABASE-S3-SETUP.md');
      
      try {
        // Create local uploads directory structure
        const localUploadDir = path.join(process.cwd(), 'local-uploads', 'uploads', userId.toString());
        await fs.mkdir(localUploadDir, { recursive: true });
        
        // Sanitize filename
        const sanitizedFilename = filename
          .replace(/^\.+/, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_');
        
        const timestamp = Date.now();
        const localFilename = `${timestamp}_${sanitizedFilename}`;
        const localFilePath = path.join(localUploadDir, localFilename);
        
        // Save file locally
        await fs.writeFile(localFilePath, buffer);
        
        const key = `uploads/${userId}/${localFilename}`;
        const url = `/local-uploads/${key}`;
        
        logger.info(`✅ File saved locally (fallback): ${localFilePath}`);
        
        return {
          key,
          url,
          bucket: 'local-fallback',
          size: buffer.length,
          contentType: mimetype,
        };
      } catch (localError) {
        logger.error('Local fallback also failed', { error: localError });
        throw new HttpException(500, 'Failed to upload file to storage');
      }
    }
    
    // Provide helpful error message based on error type
    if (errorMessage.includes('Deserialization') || errorMessage.includes('char')) {
      throw new HttpException(500, 
        'S3 storage configuration error. Please verify:\n' +
        '1. Bucket exists in Supabase Storage dashboard\n' +
        '2. Bucket name is correct\n' +
        '3. S3 credentials (Access Key & Secret) are valid\n' +
        '4. Bucket has public or proper access policies'
      );
    }
    
    if (errorMessage.includes('NoSuchBucket')) {
      throw new HttpException(500, 
        `Bucket "${config.AWS_BUCKET_NAME}" does not exist. ` +
        'Please create it in Supabase Storage dashboard.'
      );
    }
    
    if (errorMessage.includes('InvalidAccessKeyId') || errorMessage.includes('SignatureDoesNotMatch')) {
      throw new HttpException(500, 
        'Invalid S3 credentials. Please check AWS_ACCESS_KEY and AWS_SECRET_KEY in .env'
      );
    }
    
    // Generic error
    throw new HttpException(500, 'Failed to upload file to storage. Please try again later.');
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

/**
 * Download a file from S3 as a Buffer
 * Useful for processing file contents directly
 */
export async function downloadAsBuffer(key: string): Promise<Buffer> {
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

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    logger.info(`File downloaded from S3 as buffer: ${key}`);

    return Buffer.concat(chunks);
  } catch (error) {
    logger.error('S3 buffer download error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to download file. Please try again later.');
  }
}

/**
 * Delete a file from S3
 * @param key - S3 object key to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const bucket = config.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`File deleted from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to delete file. Please try again later.');
  }
}

/**
 * Delete all files with a specific prefix from S3
 * Useful for cleaning up test uploads or user data
 * @param prefix - S3 key prefix (e.g., 'uploads/test-user/')
 */
export async function deleteByPrefixFromS3(prefix: string): Promise<number> {
  try {
    const bucket = config.AWS_BUCKET_NAME;
    if (!bucket) {
      throw new HttpException(500, 'S3 bucket not configured');
    }

    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResponse = await s3Client.send(listCommand);
      
      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucket,
              Key: object.Key,
            });
            await s3Client.send(deleteCommand);
            deletedCount++;
          }
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    logger.info(`Deleted ${deletedCount} files from S3 with prefix: ${prefix}`);
    return deletedCount;
  } catch (error) {
    logger.error('S3 batch delete error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      prefix
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to delete files. Please try again later.');
  }
}