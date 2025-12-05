/**
 * Integration tests for POST /api/hmpi-engine/preview
 * 
 * Tests CSV preview functionality that detects available calculations
 */

import { Application } from 'express';
import App from '../../../../app';
import HMPIEngineRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import {
  HPI_TEST_DATA,
  MI_TEST_DATA,
  WQI_TEST_DATA,
  COMBINED_TEST_DATA,
  INVALID_TEST_DATA,
  createCSVBuffer,
  API_PATHS,
} from './fixtures';

describe('POST /api/hmpi-engine/preview', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
  let researcherToken: string;

  beforeAll(async () => {
    const hmpiRoute = new HMPIEngineRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, hmpiRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create admin user and get token
    const { token: aToken } = await AuthTestHelper.createTestUser({
      email: 'preview-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    // Create scientist user and get token
    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'preview-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    // Create researcher user and get token
    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'preview-researcher@test.com',
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
        API_PATHS.preview,
        'file',
        csvBuffer,
        'test.csv'
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'test.csv',
        researcherToken
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to preview', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
    });

    it('should allow scientist to preview', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'test.csv',
        scientistToken
      );

      expect(response.status).toBe(200);
    });
  });

  describe('HPI Detection', () => {
    it('should detect HPI is available when metals are present', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'hpi_test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.hpi.available).toBe(true);
      expect(response.body.data.available_calculations.hpi.detected_count).toBeGreaterThanOrEqual(3);
      expect(response.body.data.can_proceed).toBe(true);
    });

    it('should detect correct metals from HPI dataset', async () => {
      const csvBuffer = createCSVBuffer(HPI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'hpi_test.csv',
        adminToken
      );

      const hpiParams = response.body.data.available_calculations.hpi.parameters_detected;
      const detectedSymbols = hpiParams.map((p: any) => p.symbol);
      
      expect(detectedSymbols).toContain('As');
      expect(detectedSymbols).toContain('Cu');
      expect(detectedSymbols).toContain('Zn');
      expect(detectedSymbols).toContain('Hg');
      expect(detectedSymbols).toContain('Cd');
      expect(detectedSymbols).toContain('Ni');
      expect(detectedSymbols).toContain('Pb');
    });
  });

  describe('MI Detection', () => {
    it('should detect MI is available when metals are present', async () => {
      const csvBuffer = createCSVBuffer(MI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'mi_test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.mi.available).toBe(true);
      expect(response.body.data.can_proceed).toBe(true);
    });
  });

  describe('WQI Detection', () => {
    it('should detect WQI is available when WQI parameters are present', async () => {
      const csvBuffer = createCSVBuffer(WQI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'wqi_test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.wqi.available).toBe(true);
      expect(response.body.data.available_calculations.wqi.detected_count).toBeGreaterThanOrEqual(3);
      expect(response.body.data.can_proceed).toBe(true);
    });

    it('should detect correct WQI parameters', async () => {
      const csvBuffer = createCSVBuffer(WQI_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'wqi_test.csv',
        adminToken
      );

      const wqiParams = response.body.data.available_calculations.wqi.parameters_detected;
      const detectedSymbols = wqiParams.map((p: any) => p.symbol);
      
      expect(detectedSymbols).toContain('pH');
      expect(detectedSymbols).toContain('EC');
      expect(detectedSymbols).toContain('TDS');
      expect(detectedSymbols).toContain('TH');
    });
  });

  describe('Combined Dataset Detection', () => {
    it('should detect all indices when CSV has metals and WQI params', async () => {
      const csvBuffer = createCSVBuffer(COMBINED_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'combined_test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.hpi.available).toBe(true);
      expect(response.body.data.available_calculations.mi.available).toBe(true);
      expect(response.body.data.available_calculations.wqi.available).toBe(true);
      expect(response.body.data.can_proceed).toBe(true);
    });

    it('should detect location fields', async () => {
      const csvBuffer = createCSVBuffer(COMBINED_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'combined_test.csv',
        adminToken
      );

      expect(response.body.data.location_fields.station_id).toBe('station_id');
      expect(response.body.data.location_fields.latitude).toBe('latitude');
      expect(response.body.data.location_fields.longitude).toBe('longitude');
      expect(response.body.data.location_fields.state).toBe('state');
      expect(response.body.data.location_fields.city).toBe('city');
    });
  });

  describe('Invalid/Edge Cases', () => {
    it('should return can_proceed=false for unrecognized columns', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.noRecognizedColumns);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'invalid.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.can_proceed).toBe(false);
      expect(response.body.data.available_calculations.hpi.available).toBe(false);
      expect(response.body.data.available_calculations.mi.available).toBe(false);
      expect(response.body.data.available_calculations.wqi.available).toBe(false);
    });

    it('should return 400 for empty CSV (headers only)', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.emptyData);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'empty.csv',
        adminToken
      );

      // Empty CSV (headers only, no data rows) is rejected by middleware
      // as it doesn't contain valid CSV structure with multiple rows
      expect(response.status).toBe(400);
    });

    it('should return 400 when no file uploaded', async () => {
      const response = await apiHelper.post(API_PATHS.preview, {}, adminToken);

      expect(response.status).toBe(400);
    });

    it('should warn when too few metals detected', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.fewMetals);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'few_metals.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.hpi.available).toBe(false);
      expect(response.body.data.validation_warnings.length).toBeGreaterThan(0);
    });

    it('should warn when too few WQI params detected', async () => {
      const csvBuffer = createCSVBuffer(INVALID_TEST_DATA.fewWqiParams);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'few_wqi.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.available_calculations.wqi.available).toBe(false);
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const csvBuffer = createCSVBuffer(COMBINED_TEST_DATA.csv);
      
      const response = await apiHelper.uploadFileBuffer(
        API_PATHS.preview,
        'file',
        csvBuffer,
        'structure_test.csv',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');

      const data = response.body.data;
      expect(data).toHaveProperty('filename');
      expect(data).toHaveProperty('total_rows');
      expect(data).toHaveProperty('valid_rows');
      expect(data).toHaveProperty('detected_columns');
      expect(data).toHaveProperty('location_fields');
      expect(data).toHaveProperty('available_calculations');
      expect(data).toHaveProperty('validation_warnings');
      expect(data).toHaveProperty('can_proceed');

      expect(data.available_calculations).toHaveProperty('hpi');
      expect(data.available_calculations).toHaveProperty('mi');
      expect(data.available_calculations).toHaveProperty('wqi');

      expect(data.available_calculations.hpi).toHaveProperty('available');
      expect(data.available_calculations.hpi).toHaveProperty('parameters_detected');
      expect(data.available_calculations.hpi).toHaveProperty('parameters_missing');
      expect(data.available_calculations.hpi).toHaveProperty('min_required');
      expect(data.available_calculations.hpi).toHaveProperty('detected_count');
    });
  });
});
