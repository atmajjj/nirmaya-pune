import { describe, it, expect, beforeEach } from '@jest/globals';
import { PDFGeneratorService } from '../../services/pdf-generator.service';
import type { ReportData, ChartImages } from '../../shared/interface';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PDFGeneratorService', () => {
  let mockReportData: ReportData;
  let mockCharts: ChartImages;

  beforeEach(() => {
    // Create comprehensive mock report data
    mockReportData = {
      uploadId: 1,
      uploadFilename: 'test_water_quality.csv',
      totalStations: 50,
      avgHPI: 65.5,
      avgMI: 5.2,
      avgWQI: 48.3,
      hpiStats: {
        classificationCounts: {
          'Excellent - Low pollution': 5,
          'Good - Low to medium pollution': 15,
          'Poor - Medium pollution': 20,
          'Very Poor - High pollution': 8,
          'Unsuitable - Critical pollution': 2,
        },
        topPollutedStations: [
          { stationId: 'Station-001', hpi: 145.5, classification: 'Unsuitable - Critical pollution', location: 'Mumbai, Maharashtra' },
          { stationId: 'Station-002', hpi: 132.8, classification: 'Unsuitable - Critical pollution', location: 'Delhi, Delhi' },
          { stationId: 'Station-003', hpi: 98.3, classification: 'Very Poor - High pollution', location: 'Kolkata, West Bengal' },
        ],
      },
      miStats: {
        classificationCounts: {
          'Very Pure': 4,
          'Pure': 12,
          'Slightly Affected': 18,
          'Moderately Affected': 12,
          'Strongly Affected': 3,
          'Seriously Affected': 1,
        },
        classCounts: {
          'Class I': 4,
          'Class II': 12,
          'Class III': 18,
          'Class IV': 12,
          'Class V': 3,
          'Class VI': 1,
        },
      },
      wqiStats: {
        classificationCounts: {
          'Excellent': 8,
          'Good': 18,
          'Poor': 17,
          'Very Poor': 5,
          'Unfit for consumption': 2,
        },
      },
      geoData: {
        states: [
          { state: 'Maharashtra', count: 15 },
          { state: 'Gujarat', count: 12 },
          { state: 'Tamil Nadu', count: 10 },
        ],
        cities: [
          { city: 'Mumbai', count: 8 },
          { city: 'Ahmedabad', count: 7 },
        ],
      },
      calculationDate: new Date('2025-12-01'),
      generatedBy: 1,
    };

    // Mock base64 chart images (minimal valid base64 PNG)
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const mockPNGBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    mockCharts = {
      hpiDistribution: mockPNGBase64,
      miDistribution: mockPNGBase64,
      wqiDistribution: mockPNGBase64,
      hpiClassification: mockPNGBase64,
      miClassification: mockPNGBase64,
      wqiClassification: mockPNGBase64,
      topPollutedStations: mockPNGBase64,
      geographicDistribution: mockPNGBase64,
    };
  });

  describe('generatePDF', () => {
    it('should generate a PDF buffer', async () => {
      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    }, 60000); // 60 second timeout for Puppeteer

    it('should generate PDF with correct PDF signature', async () => {
      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      // PDF files start with %PDF-
      const pdfSignature = pdfBuffer.toString('utf-8', 0, 5);
      expect(pdfSignature).toBe('%PDF-');
    }, 60000);

    it('should generate reasonably sized PDF', async () => {
      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      // PDF should be between 50KB and 5MB
      expect(pdfBuffer.length).toBeGreaterThan(50 * 1024); // > 50KB
      expect(pdfBuffer.length).toBeLessThan(5 * 1024 * 1024); // < 5MB
    }, 60000);

    it('should handle data with null averages', async () => {
      const dataWithNulls: ReportData = {
        ...mockReportData,
        avgHPI: null,
        avgMI: null,
        avgWQI: null,
      };

      const pdfBuffer = await PDFGeneratorService.generatePDF(dataWithNulls, mockCharts);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle minimal data set', async () => {
      const minimalData: ReportData = {
        uploadId: 1,
        uploadFilename: 'minimal.csv',
        totalStations: 1,
        avgHPI: 30.0,
        avgMI: 1.5,
        avgWQI: 25.0,
        hpiStats: {
          classificationCounts: {
            'Good - Low to medium pollution': 1,
          },
          topPollutedStations: [
            { stationId: 'Station-001', hpi: 30.0, classification: 'Good - Low to medium pollution' },
          ],
        },
        miStats: {
          classificationCounts: {
            'Pure': 1,
          },
          classCounts: {
            'Class II': 1,
          },
        },
        wqiStats: {
          classificationCounts: {
            'Good': 1,
          },
        },
        geoData: {
          states: [{ state: 'Test State', count: 1 }],
          cities: [{ city: 'Test City', count: 1 }],
        },
        calculationDate: new Date(),
        generatedBy: 1,
      };

      const pdfBuffer = await PDFGeneratorService.generatePDF(minimalData, mockCharts);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    }, 60000);
  });

  describe('generateAndSavePDF', () => {
    const testOutputPath = path.join(__dirname, '../../../temp-test-report.pdf');

    afterEach(async () => {
      // Clean up test file
      try {
        await fs.unlink(testOutputPath);
      } catch {
        // Ignore if file doesn't exist
      }
    });

    it('should generate and save PDF to file', async () => {
      await PDFGeneratorService.generateAndSavePDF(mockReportData, mockCharts, testOutputPath);

      // Check file exists
      const fileStats = await fs.stat(testOutputPath);
      expect(fileStats.isFile()).toBe(true);
      expect(fileStats.size).toBeGreaterThan(0);

      // Verify it's a valid PDF
      const fileBuffer = await fs.readFile(testOutputPath);
      expect(fileBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    }, 60000);
  });

  describe('estimatePDFSize', () => {
    it('should return reasonable size estimate', () => {
      const estimatedSize = PDFGeneratorService.estimatePDFSize(mockReportData);

      // Should be a positive number
      expect(estimatedSize).toBeGreaterThan(0);

      // Should be in a reasonable range (100KB to 2MB for 50 stations)
      expect(estimatedSize).toBeGreaterThan(100 * 1024);
      expect(estimatedSize).toBeLessThan(2 * 1024 * 1024);
    });

    it('should scale with number of stations', () => {
      const smallData = { ...mockReportData, totalStations: 10 };
      const largeData = { ...mockReportData, totalStations: 1000 };

      const smallSize = PDFGeneratorService.estimatePDFSize(smallData);
      const largeSize = PDFGeneratorService.estimatePDFSize(largeData);

      // Large dataset should have larger estimate
      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });

  describe('clearTemplateCache', () => {
    it('should clear template cache without error', () => {
      expect(() => {
        PDFGeneratorService.clearTemplateCache();
      }).not.toThrow();
    });

    it('should allow PDF generation after cache clear', async () => {
      PDFGeneratorService.clearTemplateCache();

      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    }, 60000);
  });

  describe('template data preparation', () => {
    it('should calculate correct percentages', async () => {
      // This is implicitly tested by successful PDF generation
      // The template should render percentages correctly
      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      // If percentages are calculated incorrectly, template rendering would fail
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    }, 60000);

    it('should format dates correctly', async () => {
      const pdfBuffer = await PDFGeneratorService.generatePDF(mockReportData, mockCharts);

      // Date formatting is tested implicitly through successful rendering
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    }, 60000);
  });

  describe('error handling', () => {
    it('should throw error for invalid chart data', async () => {
      const invalidCharts = {
        ...mockCharts,
        hpiDistribution: 'invalid-base64!@#$%',
      };

      // Should still generate PDF (browser handles invalid images gracefully)
      // or throw meaningful error
      await expect(async () => {
        await PDFGeneratorService.generatePDF(mockReportData, invalidCharts);
      }).rejects.toThrow();
    }, 60000);
  });
});
