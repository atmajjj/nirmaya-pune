import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { ReportDataService } from '../../services/report-data.service';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { waterQualityCalculations } from '../../../hmpi-engine/shared/schema';
import { uploads } from '../../../upload/shared/schema';

describe('ReportDataService', () => {
  let testUser: any;
  let testUpload: any;
  let testCalculations: any[];

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create test user
    const { user } = await AuthTestHelper.createTestUser({
      email: 'reporter@test.com',
      password: 'Reporter123!',
      name: 'Report Generator',
      role: 'admin',
    });
    testUser = user;

    // Create test upload
    const [upload] = await db.insert(uploads).values({
      filename: 'test_water_quality.csv',
      original_filename: 'test_water_quality.csv',
      mime_type: 'text/csv',
      file_size: 2048,
      file_path: 'uploads/test_water_quality.csv',
      file_url: 'https://example.com/test_water_quality.csv',
      user_id: testUser.id,
      status: 'completed',
      created_by: testUser.id,
    }).returning();
    testUpload = upload;

    // Create test calculations with varied data
    testCalculations = await db
      .insert(waterQualityCalculations)
      .values([
        {
          upload_id: testUpload.id,
          station_id: 'Station-001',
          state: 'Maharashtra',
          city: 'Mumbai',
          latitude: '19.0760',
          longitude: '72.8777',
          hpi: '145.50',
          hpi_classification: 'Unsuitable - Critical pollution',
          mi: '12.5',
          mi_classification: 'Seriously Affected',
          mi_class: 'Class VI',
          wqi: '85.2',
          wqi_classification: 'Poor',
          metals_analyzed: 'As,Cu,Zn,Hg,Cd,Ni,Pb',
          wqi_params_analyzed: 'pH,EC,TDS,TH,Ca,Mg,Fe',
          created_by: testUser.id,
        },
        {
          upload_id: testUpload.id,
          station_id: 'Station-002',
          state: 'Maharashtra',
          city: 'Pune',
          latitude: '18.5204',
          longitude: '73.8567',
          hpi: '55.30',
          hpi_classification: 'Poor - Medium pollution',
          mi: '3.8',
          mi_classification: 'Moderately Affected',
          mi_class: 'Class IV',
          wqi: '42.5',
          wqi_classification: 'Good',
          metals_analyzed: 'As,Cu,Zn,Cd,Pb',
          wqi_params_analyzed: 'pH,EC,TDS,TH,Ca',
          created_by: testUser.id,
        },
        {
          upload_id: testUpload.id,
          station_id: 'Station-003',
          state: 'Gujarat',
          city: 'Ahmedabad',
          latitude: '23.0225',
          longitude: '72.5714',
          hpi: '25.75',
          hpi_classification: 'Good - Low to medium pollution',
          mi: '1.2',
          mi_classification: 'Pure',
          mi_class: 'Class II',
          wqi: '20.8',
          wqi_classification: 'Excellent',
          metals_analyzed: 'As,Cu,Zn',
          wqi_params_analyzed: 'pH,EC,TDS',
          created_by: testUser.id,
        },
        {
          upload_id: testUpload.id,
          station_id: 'Station-004',
          state: 'Maharashtra',
          city: 'Mumbai',
          hpi: '98.40',
          hpi_classification: 'Very Poor - High pollution',
          mi: '8.9',
          mi_classification: 'Strongly Affected',
          mi_class: 'Class V',
          wqi: '65.3',
          wqi_classification: 'Poor',
          metals_analyzed: 'As,Cu,Zn,Cd,Ni,Pb',
          wqi_params_analyzed: 'pH,EC,TDS,TH,Ca,Mg',
          created_by: testUser.id,
        },
      ])
      .returning();
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  describe('aggregateReportData', () => {
    it('should aggregate all calculation data correctly', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      expect(reportData).toBeDefined();
      expect(reportData.uploadId).toBe(testUpload.id);
      expect(reportData.uploadFilename).toBe('test_water_quality.csv');
      expect(reportData.totalStations).toBe(4);
      expect(reportData.generatedBy).toBe(testUser.id);
    });

    it('should calculate average HPI correctly', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      // Average of 145.50, 55.30, 25.75, 98.40 = 81.2375
      expect(reportData.avgHPI).toBeCloseTo(81.2375, 2);
    });

    it('should calculate average MI correctly', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      // Average of 12.5, 3.8, 1.2, 8.9 = 6.6
      expect(reportData.avgMI).toBeCloseTo(6.6, 2);
    });

    it('should calculate average WQI correctly', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      // Average of 85.2, 42.5, 20.8, 65.3 = 53.45
      expect(reportData.avgWQI).toBeCloseTo(53.45, 2);
    });

    it('should aggregate HPI classification counts', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { classificationCounts } = reportData.hpiStats;
      expect(classificationCounts['Unsuitable - Critical pollution']).toBe(1);
      expect(classificationCounts['Poor - Medium pollution']).toBe(1);
      expect(classificationCounts['Good - Low to medium pollution']).toBe(1);
      expect(classificationCounts['Very Poor - High pollution']).toBe(1);
    });

    it('should return top polluted stations sorted by HPI', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { topPollutedStations } = reportData.hpiStats;
      expect(topPollutedStations).toHaveLength(4);
      expect(topPollutedStations[0].stationId).toBe('Station-001');
      expect(topPollutedStations[0].hpi).toBeCloseTo(145.5, 1);
      expect(topPollutedStations[0].classification).toBe('Unsuitable - Critical pollution');
      expect(topPollutedStations[0].location).toBe('Mumbai, Maharashtra');

      // Second highest
      expect(topPollutedStations[1].stationId).toBe('Station-004');
      expect(topPollutedStations[1].hpi).toBeCloseTo(98.4, 1);
    });

    it('should aggregate MI classification counts', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { classificationCounts } = reportData.miStats;
      expect(classificationCounts['Seriously Affected']).toBe(1);
      expect(classificationCounts['Moderately Affected']).toBe(1);
      expect(classificationCounts['Pure']).toBe(1);
      expect(classificationCounts['Strongly Affected']).toBe(1);
    });

    it('should aggregate MI class counts', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { classCounts } = reportData.miStats;
      expect(classCounts['Class VI']).toBe(1);
      expect(classCounts['Class IV']).toBe(1);
      expect(classCounts['Class II']).toBe(1);
      expect(classCounts['Class V']).toBe(1);
    });

    it('should aggregate WQI classification counts', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { classificationCounts } = reportData.wqiStats;
      expect(classificationCounts['Poor']).toBe(2);
      expect(classificationCounts['Good']).toBe(1);
      expect(classificationCounts['Excellent']).toBe(1);
    });

    it('should aggregate geographic data by state', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { states } = reportData.geoData;
      expect(states).toHaveLength(2);
      
      // Maharashtra should have 3 stations
      const maharashtra = states.find(s => s.state === 'Maharashtra');
      expect(maharashtra?.count).toBe(3);

      // Gujarat should have 1 station
      const gujarat = states.find(s => s.state === 'Gujarat');
      expect(gujarat?.count).toBe(1);
    });

    it('should aggregate geographic data by city', async () => {
      const reportData = await ReportDataService.aggregateReportData(
        testUpload.id,
        testUser.id
      );

      const { cities } = reportData.geoData;
      expect(cities).toHaveLength(3);

      // Mumbai should have 2 stations
      const mumbai = cities.find(c => c.city === 'Mumbai');
      expect(mumbai?.count).toBe(2);

      // Pune should have 1 station
      const pune = cities.find(c => c.city === 'Pune');
      expect(pune?.count).toBe(1);
    });

    it('should throw error if upload not found', async () => {
      await expect(
        ReportDataService.aggregateReportData(99999, testUser.id)
      ).rejects.toThrow('Upload not found');
    });

    it('should throw error if no calculations exist', async () => {
      // Create upload without calculations
      const [emptyUpload] = await db.insert(uploads).values({
        filename: 'empty.csv',
        original_filename: 'empty.csv',
        mime_type: 'text/csv',
        file_size: 100,
        file_path: 'uploads/empty.csv',
        file_url: 'https://example.com/empty.csv',
        user_id: testUser.id,
        status: 'completed',
        created_by: testUser.id,
      }).returning();

      await expect(
        ReportDataService.aggregateReportData(emptyUpload.id, testUser.id)
      ).rejects.toThrow('No calculations found for this upload');
    });
  });

  describe('getStationDataForCharts', () => {
    it('should return all stations with their values', async () => {
      const stationData = await ReportDataService.getStationDataForCharts(testUpload.id);

      expect(stationData).toHaveLength(4);
      expect(stationData[0].stationId).toBe('Station-001');
      expect(stationData[0].hpi).toBeCloseTo(145.5, 1);
      expect(stationData[0].mi).toBeCloseTo(12.5, 1);
      expect(stationData[0].wqi).toBeCloseTo(85.2, 1);
    });

    it('should include geographic coordinates', async () => {
      const stationData = await ReportDataService.getStationDataForCharts(testUpload.id);

      const station1 = stationData.find(s => s.stationId === 'Station-001');
      expect(station1?.latitude).toBeCloseTo(19.076, 2);
      expect(station1?.longitude).toBeCloseTo(72.8777, 2);
    });

    it('should return empty array for non-existent upload', async () => {
      const stationData = await ReportDataService.getStationDataForCharts(99999);
      expect(stationData).toHaveLength(0);
    });
  });

  describe('hasCalculations', () => {
    it('should return true if calculations exist', async () => {
      const result = await ReportDataService.hasCalculations(testUpload.id);
      expect(result).toBe(true);
    });

    it('should return false if no calculations exist', async () => {
      const [emptyUpload] = await db.insert(uploads).values({
        filename: 'empty.csv',
        original_filename: 'empty.csv',
        mime_type: 'text/csv',
        file_size: 100,
        file_path: 'uploads/empty.csv',
        file_url: 'https://example.com/empty.csv',
        user_id: testUser.id,
        status: 'completed',
        created_by: testUser.id,
      }).returning();

      const result = await ReportDataService.hasCalculations(emptyUpload.id);
      expect(result).toBe(false);
    });
  });

  describe('getCalculationStatistics', () => {
    it('should return average statistics', async () => {
      const stats = await ReportDataService.getCalculationStatistics(testUpload.id);

      expect(stats.avg_hpi).toBeCloseTo(81.2375, 2);
      expect(stats.avg_mi).toBeCloseTo(6.6, 2);
      expect(stats.avg_wqi).toBeCloseTo(53.45, 2);
    });

    it('should handle uploads with no calculations', async () => {
      const [emptyUpload] = await db.insert(uploads).values({
        filename: 'empty.csv',
        original_filename: 'empty.csv',
        mime_type: 'text/csv',
        file_size: 100,
        file_path: 'uploads/empty.csv',
        file_url: 'https://example.com/empty.csv',
        user_id: testUser.id,
        status: 'completed',
        created_by: testUser.id,
      }).returning();

      const stats = await ReportDataService.getCalculationStatistics(emptyUpload.id);

      expect(stats.avg_hpi).toBeNull();
      expect(stats.avg_mi).toBeNull();
      expect(stats.avg_wqi).toBeNull();
    });

    it('should handle partial data (only HPI available)', async () => {
      // Create calculation with only HPI
      const [partialUpload] = await db.insert(uploads).values({
        filename: 'partial.csv',
        original_filename: 'partial.csv',
        mime_type: 'text/csv',
        file_size: 500,
        file_path: 'uploads/partial.csv',
        file_url: 'https://example.com/partial.csv',
        user_id: testUser.id,
        status: 'completed',
        created_by: testUser.id,
      }).returning();

      await db.insert(waterQualityCalculations).values({
        upload_id: partialUpload.id,
        station_id: 'Partial-001',
        hpi: '50.0',
        hpi_classification: 'Poor - Medium pollution',
        created_by: testUser.id,
      });

      const stats = await ReportDataService.getCalculationStatistics(partialUpload.id);

      expect(stats.avg_hpi).toBeCloseTo(50.0, 1);
      expect(stats.avg_mi).toBeNull();
      expect(stats.avg_wqi).toBeNull();
    });
  });
});
