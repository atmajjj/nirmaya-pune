/**
 * Document Processor Service Unit Tests
 *
 * Tests for pure functions in document processor utilities.
 * Using document-utils.service.ts to avoid ESM module issues with pdfjs-dist.
 */

import {
  isValidFileType,
  isValidFileSize,
  getExtensionFromMimeType,
} from '../../services/document-utils.service';

describe('Document Processor Service - Pure Functions', () => {
  describe('isValidFileType', () => {
    describe('should accept valid MIME types', () => {
      it('should accept PDF files', () => {
        expect(isValidFileType('application/pdf')).toBe(true);
      });

      it('should accept plain text files', () => {
        expect(isValidFileType('text/plain')).toBe(true);
      });

      it('should accept Markdown files', () => {
        expect(isValidFileType('text/markdown')).toBe(true);
      });

      it('should accept DOCX files', () => {
        expect(isValidFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      });
    });

    describe('should reject invalid MIME types', () => {
      it('should reject image files', () => {
        expect(isValidFileType('image/png')).toBe(false);
        expect(isValidFileType('image/jpeg')).toBe(false);
        expect(isValidFileType('image/gif')).toBe(false);
      });

      it('should reject video files', () => {
        expect(isValidFileType('video/mp4')).toBe(false);
        expect(isValidFileType('video/avi')).toBe(false);
      });

      it('should reject audio files', () => {
        expect(isValidFileType('audio/mpeg')).toBe(false);
        expect(isValidFileType('audio/wav')).toBe(false);
      });

      it('should reject Excel files', () => {
        expect(isValidFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(false);
      });

      it('should reject old Word format (.doc)', () => {
        expect(isValidFileType('application/msword')).toBe(false);
      });

      it('should reject HTML files', () => {
        expect(isValidFileType('text/html')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(isValidFileType('')).toBe(false);
      });

      it('should reject arbitrary strings', () => {
        expect(isValidFileType('not-a-mime-type')).toBe(false);
        expect(isValidFileType('random')).toBe(false);
      });
    });
  });

  describe('isValidFileSize', () => {
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB

    describe('should accept valid file sizes', () => {
      it('should accept 0 bytes', () => {
        expect(isValidFileSize(0)).toBe(true);
      });

      it('should accept 1 byte', () => {
        expect(isValidFileSize(1)).toBe(true);
      });

      it('should accept 1 KB', () => {
        expect(isValidFileSize(1024)).toBe(true);
      });

      it('should accept 1 MB', () => {
        expect(isValidFileSize(1024 * 1024)).toBe(true);
      });

      it('should accept 10 MB', () => {
        expect(isValidFileSize(10 * 1024 * 1024)).toBe(true);
      });

      it('should accept exactly 20 MB (boundary)', () => {
        expect(isValidFileSize(MAX_SIZE)).toBe(true);
      });
    });

    describe('should reject invalid file sizes', () => {
      it('should reject 20 MB + 1 byte', () => {
        expect(isValidFileSize(MAX_SIZE + 1)).toBe(false);
      });

      it('should reject 21 MB', () => {
        expect(isValidFileSize(21 * 1024 * 1024)).toBe(false);
      });

      it('should reject 100 MB', () => {
        expect(isValidFileSize(100 * 1024 * 1024)).toBe(false);
      });

      it('should reject negative numbers', () => {
        expect(isValidFileSize(-1)).toBe(false);
        expect(isValidFileSize(-1000)).toBe(false);
      });
    });
  });

  describe('getExtensionFromMimeType', () => {
    describe('should return correct extensions for supported types', () => {
      it('should return .pdf for PDF MIME type', () => {
        expect(getExtensionFromMimeType('application/pdf')).toBe('.pdf');
      });

      it('should return .txt for plain text MIME type', () => {
        expect(getExtensionFromMimeType('text/plain')).toBe('.txt');
      });

      it('should return .md for Markdown MIME type', () => {
        expect(getExtensionFromMimeType('text/markdown')).toBe('.md');
      });

      it('should return .docx for DOCX MIME type', () => {
        expect(getExtensionFromMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('.docx');
      });
    });

    describe('should return .bin for unsupported types', () => {
      it('should return .bin for unknown MIME types', () => {
        expect(getExtensionFromMimeType('application/unknown')).toBe('.bin');
        expect(getExtensionFromMimeType('image/png')).toBe('.bin');
        expect(getExtensionFromMimeType('')).toBe('.bin');
      });
    });
  });
});
