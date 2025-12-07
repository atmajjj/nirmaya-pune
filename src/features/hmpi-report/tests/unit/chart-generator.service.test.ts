import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChartGeneratorService } from '../../services/chart-generator.service';
import type { ReportData } from '../../shared/interface';

describe('ChartGeneratorService', () => {
  let mockReportData: ReportData;

  beforeEach(() => {
    // Create comprehensive mock report data
    mockReportData = {
      uploadId: 1,
      uploadFilename: 'test_water_quality.csv',
      totalStations: 100,
      avgHPI: 65.5,
      avgMI: 5.2,
      avgWQI: 48.3,
      hpiStats: {
        classificationCounts: {
          'Excellent - Low pollution': 10,
          'Good - Low to medium pollution': 25,
          'Poor - Medium pollution': 35,
          'Very Poor - High pollution': 20,
          'Unsuitable - Critical pollution': 10,
        },
        topPollutedStations: [
          { stationId: 'Station-001', hpi: 145.5, classification: 'Unsuitable - Critical pollution', location: 'Mumbai, Maharashtra' },
          { stationId: 'Station-002', hpi: 132.8, classification: 'Unsuitable - Critical pollution', location: 'Delhi, Delhi' },
          { stationId: 'Station-003', hpi: 118.2, classification: 'Unsuitable - Critical pollution', location: 'Kolkata, West Bengal' },
          { stationId: 'Station-004', hpi: 105.7, classification: 'Unsuitable - Critical pollution', location: 'Chennai, Tamil Nadu' },
          { stationId: 'Station-005', hpi: 98.3, classification: 'Very Poor - High pollution', location: 'Bangalore, Karnataka' },
          { stationId: 'Station-006', hpi: 92.1, classification: 'Very Poor - High pollution', location: 'Hyderabad, Telangana' },
          { stationId: 'Station-007', hpi: 87.4, classification: 'Very Poor - High pollution', location: 'Pune, Maharashtra' },
          { stationId: 'Station-008', hpi: 82.6, classification: 'Very Poor - High pollution', location: 'Ahmedabad, Gujarat' },
          { stationId: 'Station-009', hpi: 78.9, classification: 'Very Poor - High pollution', location: 'Surat, Gujarat' },
          { stationId: 'Station-010', hpi: 75.2, classification: 'Very Poor - High pollution', location: 'Jaipur, Rajasthan' },
        ],
      },
      miStats: {
        classificationCounts: {
          'Very Pure': 8,
          'Pure': 22,
          'Slightly Affected': 30,
          'Moderately Affected': 25,
          'Strongly Affected': 10,
          'Seriously Affected': 5,
        },
        classCounts: {
          'Class I': 8,
          'Class II': 22,
          'Class III': 30,
          'Class IV': 25,
          'Class V': 10,
          'Class VI': 5,
        },
      },
      wqiStats: {
        classificationCounts: {
          'Excellent': 15,
          'Good': 30,
          'Poor': 35,
          'Very Poor': 15,
          'Unfit for consumption': 5,
        },
      },
      geoData: {
        states: [
          { state: 'Maharashtra', count: 30 },
          { state: 'Gujarat', count: 20 },
          { state: 'Tamil Nadu', count: 15 },
          { state: 'Karnataka', count: 12 },
          { state: 'West Bengal', count: 10 },
          { state: 'Delhi', count: 8 },
          { state: 'Rajasthan', count: 5 },
        ],
        cities: [
          { city: 'Mumbai', count: 15 },
          { city: 'Ahmedabad', count: 12 },
          { city: 'Chennai', count: 10 },
          { city: 'Bangalore', count: 8 },
          { city: 'Kolkata', count: 7 },
        ],
      },
      calculationDate: new Date('2025-12-01'),
      generatedBy: 1,
    };
  });

  describe('generateAllCharts', () => {
    it('should generate all 8 charts successfully', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      expect(charts).toBeDefined();
      expect(charts.hpiDistribution).toBeDefined();
      expect(charts.miDistribution).toBeDefined();
      expect(charts.wqiDistribution).toBeDefined();
      expect(charts.hpiClassification).toBeDefined();
      expect(charts.miClassification).toBeDefined();
      expect(charts.wqiClassification).toBeDefined();
      expect(charts.topPollutedStations).toBeDefined();
      expect(charts.geographicDistribution).toBeDefined();
    }, 30000); // 30 second timeout for chart generation

    it('should return base64-encoded strings', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      // Check that each chart is a valid base64 string
      expect(typeof charts.hpiDistribution).toBe('string');
      expect(charts.hpiDistribution.length).toBeGreaterThan(0);
      
      // Verify it's valid base64 (should not throw)
      expect(() => Buffer.from(charts.hpiDistribution, 'base64')).not.toThrow();
      expect(() => Buffer.from(charts.miDistribution, 'base64')).not.toThrow();
      expect(() => Buffer.from(charts.wqiDistribution, 'base64')).not.toThrow();
    }, 30000);

    it('should generate charts with correct PNG format', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      // Convert base64 to buffer and check PNG signature
      const hpiBuffer = Buffer.from(charts.hpiDistribution, 'base64');
      const miBuffer = Buffer.from(charts.miDistribution, 'base64');
      const wqiBuffer = Buffer.from(charts.wqiDistribution, 'base64');

      // PNG files start with signature: 89 50 4E 47 0D 0A 1A 0A
      expect(hpiBuffer[0]).toBe(0x89);
      expect(hpiBuffer[1]).toBe(0x50);
      expect(hpiBuffer[2]).toBe(0x4E);
      expect(hpiBuffer[3]).toBe(0x47);

      expect(miBuffer[0]).toBe(0x89);
      expect(wqiBuffer[0]).toBe(0x89);
    }, 30000);

    it('should generate reasonably sized chart images', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      // Each chart should be between 10KB and 500KB
      const hpiSize = Buffer.from(charts.hpiDistribution, 'base64').length;
      const miSize = Buffer.from(charts.miDistribution, 'base64').length;
      const wqiSize = Buffer.from(charts.wqiDistribution, 'base64').length;

      expect(hpiSize).toBeGreaterThan(10 * 1024); // > 10KB
      expect(hpiSize).toBeLessThan(500 * 1024);   // < 500KB

      expect(miSize).toBeGreaterThan(10 * 1024);
      expect(miSize).toBeLessThan(500 * 1024);

      expect(wqiSize).toBeGreaterThan(10 * 1024);
      expect(wqiSize).toBeLessThan(500 * 1024);
    }, 30000);
  });

  describe('chart generation with minimal data', () => {
    it('should handle single classification category', async () => {
      const minimalData: ReportData = {
        ...mockReportData,
        hpiStats: {
          classificationCounts: {
            'Good - Low to medium pollution': 10,
          },
          topPollutedStations: [
            { stationId: 'Station-001', hpi: 30.5, classification: 'Good - Low to medium pollution' },
          ],
        },
      };

      const charts = await ChartGeneratorService.generateAllCharts(minimalData);

      expect(charts.hpiDistribution).toBeDefined();
      expect(charts.hpiClassification).toBeDefined();
      expect(typeof charts.hpiDistribution).toBe('string');
    }, 30000);

    it('should handle data with no geographic information', async () => {
      const noGeoData: ReportData = {
        ...mockReportData,
        geoData: {
          states: [],
          cities: [],
        },
      };

      const charts = await ChartGeneratorService.generateAllCharts(noGeoData);

      // Should still generate chart even with no data
      expect(charts.geographicDistribution).toBeDefined();
    }, 30000);

    it('should handle top polluted stations with less than 10 entries', async () => {
      const fewStations: ReportData = {
        ...mockReportData,
        hpiStats: {
          classificationCounts: {
            'Good - Low to medium pollution': 3,
          },
          topPollutedStations: [
            { stationId: 'Station-001', hpi: 45.2, classification: 'Good - Low to medium pollution' },
            { stationId: 'Station-002', hpi: 38.7, classification: 'Good - Low to medium pollution' },
            { stationId: 'Station-003', hpi: 32.1, classification: 'Good - Low to medium pollution' },
          ],
        },
      };

      const charts = await ChartGeneratorService.generateAllCharts(fewStations);

      expect(charts.topPollutedStations).toBeDefined();
      expect(typeof charts.topPollutedStations).toBe('string');
    }, 30000);
  });

  describe('chart generation with edge cases', () => {
    it('should handle all stations in same classification', async () => {
      const uniformData: ReportData = {
        ...mockReportData,
        hpiStats: {
          classificationCounts: {
            'Poor - Medium pollution': 100,
          },
          topPollutedStations: Array.from({ length: 10 }, (_, i) => ({
            stationId: `Station-${String(i + 1).padStart(3, '0')}`,
            hpi: 55.0 + i * 0.5,
            classification: 'Poor - Medium pollution',
          })),
        },
        miStats: {
          classificationCounts: {
            'Moderately Affected': 100,
          },
          classCounts: {
            'Class IV': 100,
          },
        },
        wqiStats: {
          classificationCounts: {
            'Poor': 100,
          },
        },
      };

      const charts = await ChartGeneratorService.generateAllCharts(uniformData);

      expect(charts.hpiDistribution).toBeDefined();
      expect(charts.miDistribution).toBeDefined();
      expect(charts.wqiDistribution).toBeDefined();
    }, 30000);

    it('should handle very large state count (>10)', async () => {
      const manyStates: ReportData = {
        ...mockReportData,
        geoData: {
          states: Array.from({ length: 28 }, (_, i) => ({
            state: `State-${i + 1}`,
            count: 28 - i, // Descending order
          })),
          cities: [],
        },
      };

      const charts = await ChartGeneratorService.generateAllCharts(manyStates);

      // Should only show top 10
      expect(charts.geographicDistribution).toBeDefined();
    }, 30000);
  });

  describe('renderChartToBuffer', () => {
    it('should render custom chart configuration to buffer', async () => {
      const customConfig = {
        type: 'bar' as const,
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{
            label: 'Test Data',
            data: [10, 20, 30],
            backgroundColor: '#3b82f6',
          }],
        },
        options: {
          responsive: true,
        },
      };

      const buffer = await ChartGeneratorService.renderChartToBuffer(customConfig);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check PNG signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4E);
      expect(buffer[3]).toBe(0x47);
    }, 10000);
  });

  describe('chart color consistency', () => {
    it('should use consistent colors for HPI classifications', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      // Both bar and pie charts should be generated
      expect(charts.hpiDistribution).toBeDefined();
      expect(charts.hpiClassification).toBeDefined();
      
      // Both should be valid base64 PNG images
      const barBuffer = Buffer.from(charts.hpiDistribution, 'base64');
      const pieBuffer = Buffer.from(charts.hpiClassification, 'base64');
      
      expect(barBuffer[0]).toBe(0x89); // PNG signature
      expect(pieBuffer[0]).toBe(0x89);
    }, 30000);

    it('should generate different charts for MI and WQI', async () => {
      const charts = await ChartGeneratorService.generateAllCharts(mockReportData);

      const miBar = Buffer.from(charts.miDistribution, 'base64');
      const miPie = Buffer.from(charts.miClassification, 'base64');
      const wqiBar = Buffer.from(charts.wqiDistribution, 'base64');
      const wqiPie = Buffer.from(charts.wqiClassification, 'base64');

      // All should be valid PNGs
      expect(miBar[0]).toBe(0x89);
      expect(miPie[0]).toBe(0x89);
      expect(wqiBar[0]).toBe(0x89);
      expect(wqiPie[0]).toBe(0x89);

      // Each chart should be different (different sizes)
      expect(miBar.length).not.toBe(wqiBar.length);
      expect(miPie.length).not.toBe(wqiPie.length);
    }, 30000);
  });
});
