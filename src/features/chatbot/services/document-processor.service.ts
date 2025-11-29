/**
 * Document Processor Service
 *
 * Handles text extraction from various document formats:
 * - PDF (using pdf.js)
 * - DOCX (using mammoth)
 * - TXT (direct read)
 * - MD (direct read)
 */

import mammoth from 'mammoth';
import { logger } from '../../../utils/logger';
import HttpException from '../../../utils/httpException';
import { downloadAsBuffer } from '../../../utils/s3Upload';

// pdfjs-dist is ESM-only in v5+, use dynamic import
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
  }
  return pdfjsLib;
}

/**
 * Extract text from a document based on its MIME type
 * @param filePath - S3 file path/key
 * @param mimeType - MIME type of the document
 * @returns Extracted text content
 */
export async function extractTextFromDocument(filePath: string, mimeType: string): Promise<string> {
  try {
    logger.info(`📄 Extracting text from document: ${filePath} (${mimeType})`);

    // Download file from S3
    const fileBuffer = await downloadAsBuffer(filePath);

    let text: string;

    switch (mimeType) {
      case 'application/pdf':
        text = await extractTextFromPDF(fileBuffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await extractTextFromDOCX(fileBuffer);
        break;
      case 'text/plain':
      case 'text/markdown':
        text = fileBuffer.toString('utf-8');
        break;
      default:
        throw new HttpException(400, `Unsupported file type: ${mimeType}`);
    }

    // Clean up the extracted text
    text = cleanText(text);

    logger.info(`✅ Extracted ${text.length} characters from document`);

    return text;
  } catch (error) {
    logger.error('❌ Text extraction failed:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException(
      500,
      `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from a Buffer based on MIME type (for direct upload processing)
 */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    let text: string;

    switch (mimeType) {
      case 'application/pdf':
        text = await extractTextFromPDF(buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await extractTextFromDOCX(buffer);
        break;
      case 'text/plain':
      case 'text/markdown':
        text = buffer.toString('utf-8');
        break;
      default:
        throw new HttpException(400, `Unsupported file type: ${mimeType}`);
    }

    return cleanText(text);
  } catch (error) {
    logger.error('❌ Text extraction from buffer failed:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException(
      500,
      `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from PDF using pdf.js
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Get pdfjs dynamically (ESM module)
    const pdfjs = await getPdfjs();

    // Convert buffer to Uint8Array
    const data = new Uint8Array(buffer);

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    logger.debug(`📑 PDF has ${numPages} pages`);

    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      textParts.push(pageText);
    }

    return textParts.join('\n\n');
  } catch (error) {
    logger.error('Error extracting text from PDF:', error);
    throw new HttpException(
      500,
      `PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      logger.debug('DOCX extraction messages:', result.messages);
    }

    return result.value;
  } catch (error) {
    logger.error('Error extracting text from DOCX:', error);
    throw new HttpException(
      500,
      `DOCX text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

// Re-export utility functions for backwards compatibility
export {
  isValidFileType,
  isValidFileSize,
  getExtensionFromMimeType,
} from './document-utils.service';
