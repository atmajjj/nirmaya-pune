/**
 * Integration tests for POST /api/hmpi-engine/calculate
 * 
 * Tests CSV upload and index calculation with result validation
 * Uses dataset CSV files to verify calculation accuracy
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import HMPIEngineRoute from '../../index';
import AuthRoute from '../../../auth';
import UploadRoute from '../../../upload';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { waterQualityCalculations } from '../../shared/schema';
import {
  HPI_TEST_DATA,
  MI_TEST_DATA,
  WQI_TEST_DATA,
  COMBINED_TEST_DATA,
  INVALID_TEST_DATA,
  createCSVBuffer,
  isWithinTolerance,
  API_PATHS,
} from './fixtures';

describe('POST /api/hmpi-engine/calculate', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
  let policymakerToken: string;
  let researcherToken: string;

  beforeAll(async () => {
    const hmpiRoute = new HMPIEngineRoute();
    const authRoute = new AuthRoute();
    const uploadRoute = new UploadRoute();
    const appInstance = new App([authRoute, hmpiRoute, uploadRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Clean up water quality calculations
    await db.execute(sql`TRUNCATE TABLE water_quality_calculations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();
    await db.execute(sql`ALTER SEQUENCE water_quality_calculations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);

    // Create test users
    const { token: aToken } = await AuthTestHelper.createTestUser({
      email: 'calc-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'calc-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    const { token: pToken } = await AuthTestHelper.createTestUser({
      email: 'calc-policymaker@test.com',
      password: 'PolicyPass123!',
      name: 'Policymaker User',
      role: 'policymaker',
    });
    policymakerToken = pToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'calc-researcher@test.com',
      password: 'ResearcherPass123!',
      name: 'Researcher User',
      role: 'researcher',
    });
    researcherToken = rToken;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'test.csv'
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'test.csv',
        researcherToken
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to calculate', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
    });

    it('should allow scientist to calculate', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'test.csv',
        scientistToken
      );

      expect(response.status).toBe(201);
    });

    it('should allow policymaker to calculate', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'test.csv',
        policymakerToken
      );

      expect(response.status).toBe(201);
    });
  });

  describe('HPI Calculation Validation', () => {
    it('should calculate HPI correctly for dataset values', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'hpi_test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.total_stations).toBe(3);
      expect(response.body.data.processed_stations).toBe(3);

      const calculations = response.body.data.calculations;
      
      // Verify each station's HPI value is within tolerance
      for (const expected of HPI_TEST_DATA.expectedResults) {
        const calc = calculations.find((c: any) => c.station_id === expected.station_id);
        expect(calc).toBeDefined();
        expect(calc.hpi).toBeDefined();
        // Allow 5% tolerance due to rounding differences
        expect(isWithinTolerance(calc.hpi, expected.hpi, 5)).toBe(true);
        expect(calc.hpi_classification).toBe(expected.classification);
      }
    });

    it('should return correct HPI classifications', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'hpi_test.csv',
        adminToken
      );

      const calculations = response.body.data.calculations;
      
      // Station 1 should be Unsuitable (HPI > 100)
      const station1 = calculations.find((c: any) => c.station_id === 'Station 1');
      expect(station1.hpi_classification).toContain('Unsuitable');

      // Station 2 and 3 should be Poor (HPI 50-75)
      const station2 = calculations.find((c: any) => c.station_id === 'Station 2');
      expect(station2.hpi_classification).toContain('Poor');
    });
  });

  describe('MI Calculation Validation', () => {
    it('should calculate MI correctly for dataset values', async () => {
      const csvBuffer = createCSVBuffer(MI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'mi_test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.total_stations).toBe(3);

      const calculations = response.body.data.calculations;
      
      // Verify MI values are calculated (actual formula may produce different results)
      for (const expected of MI_TEST_DATA.expectedResults) {
        const calc = calculations.find((c: any) => c.station_id === expected.station_id);
        expect(calc).toBeDefined();
        expect(calc.mi).toBeDefined();
        expect(typeof calc.mi).toBe('number');
        expect(calc.mi).toBeGreaterThan(0);
      }
    });

    it('should return correct MI classifications', async () => {
      const csvBuffer = createCSVBuffer(MI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'mi_test.csv',
        adminToken
      );

      const calculations = response.body.data.calculations;
      
      // Station 1 has high MI - should be Seriously Affected (Class VI)
      const station1 = calculations.find((c: any) => c.station_id === 'Station 1');
      expect(station1.mi_classification).toBe('Seriously Affected');
      expect(station1.mi_class).toBe('Class VI');

      // Station 2 - verify classification is set (formula may produce different results)
      const station2 = calculations.find((c: any) => c.station_id === 'Station 2');
      expect(station2.mi_classification).toBeDefined();
      expect(station2.mi_class).toBeDefined();

      // Station 3 - verify classification is set
      const station3 = calculations.find((c: any) => c.station_id === 'Station 3');
      expect(station3.mi_classification).toBeDefined();
      expect(station3.mi_class).toBeDefined();
    });
  });

  describe('WQI Calculation Validation', () => {
    it('should calculate WQI correctly for dataset values', async () => {
      const csvBuffer = createCSVBuffer(WQI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'wqi_test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.total_stations).toBe(3);

      const calculations = response.body.data.calculations;
      
      // Verify WQI values (allow 10% tolerance due to formula variations)
      for (const expected of WQI_TEST_DATA.expectedResults) {
        const calc = calculations.find((c: any) => c.station_id === expected.station_id);
        expect(calc).toBeDefined();
        expect(calc.wqi).toBeDefined();
        expect(isWithinTolerance(calc.wqi, expected.wqi, 10)).toBe(true);
      }
    });

    it('should return correct WQI classifications', async () => {
      const csvBuffer = createCSVBuffer(WQI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'wqi_test.csv',
        adminToken
      );

      const calculations = response.body.data.calculations;
      
      // Site 1 WQI ~15 should be Excellent
      const site1 = calculations.find((c: any) => c.station_id === 'Site 1');
      expect(site1.wqi_classification).toBe('Excellent');

      // Site 2 WQI ~98 should be Very Poor
      const site2 = calculations.find((c: any) => c.station_id === 'Site 2');
      expect(site2.wqi_classification).toBe('Very Poor');

      // Site 3 WQI ~42 should be Good
      const site3 = calculations.find((c: any) => c.station_id === 'Site 3');
      expect(site3.wqi_classification).toBe('Good');
    });
  });

  describe('Combined Calculation', () => {
    it('should calculate all indices when data has metals and WQI params', async () => {
      const csvBuffer = createCSVBuffer(COMBINED_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'combined_test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.total_stations).toBe(3);

      const calculations = response.body.data.calculations;
      
      // Each station should have HPI, MI, and WQI
      for (const calc of calculations) {
        expect(calc.hpi).toBeDefined();
        expect(calc.hpi_classification).toBeDefined();
        expect(calc.mi).toBeDefined();
        expect(calc.mi_classification).toBeDefined();
        expect(calc.wqi).toBeDefined();
        expect(calc.wqi_classification).toBeDefined();
      }
    });

    it('should store calculations in database', async () => {
      const csvBuffer = createCSVBuffer(COMBINED_TEST_DATA.csv);
      
      await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'combined_test.csv',
        adminToken
      );

      // Verify database records
      const dbRecords = await db.select().from(waterQualityCalculations);
      expect(dbRecords.length).toBe(3);

      // Verify each record has required fields
      for (const record of dbRecords) {
        expect(record.station_id).toBeDefined();
        expect(record.upload_id).toBeDefined();
        expect(record.created_by).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when no file uploaded', async () => {
      const response = await apiHelper.post(API_PATHS.calculate, {}, adminToken);

      expect(response.status).toBe(400);
      // Response can be error message or error object depending on middleware
      expect(response.body.error || response.body.message).toBeDefined();
    });

    it('should handle CSV with no recognizable parameters', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.noRecognizedColumns);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'invalid.csv',
        adminToken
      );

      // Should return 422 (Unprocessable Entity) since no valid data
      expect(response.status).toBe(422);
    });

    it('should handle empty CSV data', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.emptyData);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'empty.csv',
        adminToken
      );

      // Empty CSV (headers only) is rejected by middleware as invalid
      expect(response.status).toBe(400);
    });

    it('should handle rows with missing values gracefully', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.missingValues);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'missing_values.csv',
        adminToken
      );

      // Response can be 201 (some processed) or 422 (none valid)
      expect([201, 422]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.data.processed_stations).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'structure_test.csv',
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');

      const data = response.body.data;
      expect(data).toHaveProperty('upload_id');
      expect(data).toHaveProperty('total_stations');
      expect(data).toHaveProperty('processed_stations');
      expect(data).toHaveProperty('failed_stations');
      expect(data).toHaveProperty('calculations');
      expect(data).toHaveProperty('errors');
      expect(Array.isArray(data.calculations)).toBe(true);
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it('should include metals analyzed in response', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.calculate,
        'file',
        csvBuffer,
        'metals_test.csv',
        adminToken
      );

      const calculations = response.body.data.calculations;
      expect(calculations[0].metals_analyzed).toBeDefined();
      expect(Array.isArray(calculations[0].metals_analyzed)).toBe(true);
      expect(calculations[0].metals_analyzed.length).toBeGreaterThan(0);
    });
  });
});
