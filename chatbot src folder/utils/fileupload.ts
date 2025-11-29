import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from "mime-types";
import { extractText } from "../features/source/services/textExtractor";

// Helper to extract inserted ID from knex returning result
export function extractInsertedId(result: any): number {
  if (!result || result.length === 0)
    throw new Error("Failed to create source record");
  const rec = result[0];
  return typeof rec === "object" && rec !== null
    ? rec.id || Number(rec)
    : Number(rec);
}

// Define allowed file types and max size
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_UPLOAD = 10;

export const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true, // Supabase documentation recommends true for S3 compatibility
});

// Upload a single file (exportable for services)
export interface FileUploadResult {
  Location: string; // Custom URL
  Key: string;
  Bucket: string;
  ETag: string;
  ContentType?: string;
  size?: number;
  textContent?: string; // Added for text extraction
}

// Upload a single file from multipart form data
export const uploadMulterFile = async (
  file: Express.Multer.File,
  folderPath: string = "uploads"
): Promise<FileUploadResult> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Sanitize filename and folder path to prevent path traversal
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const sanitizedFolder = folderPath
    .replace(/[^a-zA-Z0-9\/_-]/g, "_")
    .replace(/^\/+|\/+$/g, "");

  // Generate a unique filename to prevent overwriting
  const timestamp = new Date().getTime();
  const uniqueFilename = `${timestamp}_${sanitizedName}`;
  const filePath = `${sanitizedFolder}/${uniqueFilename}`;

  // Create S3 upload parameters
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filePath,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read" as any, // Make the file public
  };

  try {
    // Upload to S3
    const uploadResult = await new Upload({
      client: s3,
      params,
    }).done();

    // Extract text content if possible
    let textContent = "";
    try {
      textContent = await extractText(file.buffer, file.mimetype);
    } catch (err) {
      console.warn(`Text extraction failed: ${err.message}`);
    }

    // Construct the proper URL for Supabase Storage
    // Format should be: https://[project-ref].storage.supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
    const bucketName = process.env.AWS_BUCKET_NAME;
    const endpoint = process.env.AWS_ENDPOINT?.replace("/s3", "");

    return {
      Location:
        uploadResult.Location ||
        `${endpoint}/object/public/${bucketName}/${filePath}`,
      Key: uploadResult.Key,
      Bucket: uploadResult.Bucket,
      ETag: uploadResult.ETag,
      ContentType: file.mimetype,
      size: file.size,
      textContent,
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Upload multiple files from multer (multipart/form-data)
export const uploadMultipleFilesMulter = async (
  files: Express.Multer.File[],
  folderPath: string = "uploads"
): Promise<FileUploadResult[]> => {
  // Validate file count
  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error(`Too many files. Maximum allowed: ${MAX_FILES_PER_UPLOAD}`);
  }

  const uploadPromises = files.map((file) =>
    uploadMulterFile(file, folderPath)
  );
  const results = await Promise.all(uploadPromises);
  return results;
};

// Export validation constants for external use
export { ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD };
