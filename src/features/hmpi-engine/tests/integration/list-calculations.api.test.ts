/**
 * Integration tests for GET /api/hmpi-engine/calculations
 * 
 * Tests listing calculations with pagination and filtering
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
import { uploads } from '../../../upload/shared/schema';
import {
  COMBINED_TEST_DATA,
  createCSVBuffer,
  API_PATHS,
} from './fixtures';

describe('GET /api/hmpi-engine/calculations', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
  let researcherToken: string;
  let testUploadId: number;

  beforeAll(async () => {
    const hmpiRoute = new HMPIEngineRoute();
    const authRoute = new AuthRoute();
    const uploadRoute = new UploadRoute();
    const appInstance = new App([authRoute, hmpiRoute, uploadRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Clean up tables
    await db.execute(sql`TRUNCATE TABLE water_quality_calculations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();
    await db.execute(sql`ALTER SEQUENCE water_quality_calculations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);

    // Create test users
    const { token: aToken, user: adminUser } = await AuthTestHelper.createTestUser({
      email: 'list-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'list-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'list-researcher@test.com',
      password: 'ResearcherPass123!',
      name: 'Researcher User',
      role: 'researcher',
    });
    researcherToken = rToken;

    // Create test upload
    const [upload] = await db.insert(uploads).values({
      filename: 'test_upload.csv',
      original_filename: 'test_upload.csv',
      mime_type: 'text/csv',
      file_size: 1024,
      file_path: 'uploads/test.csv',
      file_url: 'https://example.com/test.csv',
      user_id: adminUser.id,
      status: 'completed',
      created_by: adminUser.id,
      updated_by: adminUser.id,
    }).returning();
    testUploadId = upload.id;

    // Create test calculations
    await db.insert(waterQualityCalculations).values({
      upload_id: testUploadId,
      station_id: 'Station A',
      latitude: '28.6139',
      longitude: '77.2090',
      state: 'Delhi',
      city: 'New Delhi',
      hpi: '50.5',
      hpi_classification: 'Poor - Medium pollution',
      mi: '2.5',
      mi_classification: 'Moderately Affected',
      mi_class: 'Class IV',
      wqi: '35.0',
      wqi_classification: 'Good',
      metals_analyzed: 'As,Cu,Zn,Pb',
      wqi_params_analyzed: 'pH,TDS,TH',
      created_by: adminUser.id,
    });

    await db.insert(waterQualityCalculations).values({
      upload_id: testUploadId,
      station_id: 'Station B',
      latitude: '19.0760',
      longitude: '72.8777',
      state: 'Maharashtra',
      city: 'Mumbai',
      hpi: '25.0',
      hpi_classification: 'Good - Low to medium pollution',
      mi: '0.8',
      mi_classification: 'Pure',
      mi_class: 'Class II',
      wqi: '20.0',
      wqi_classification: 'Excellent',
      metals_analyzed: 'As,Cu,Zn,Pb',
      wqi_params_analyzed: 'pH,TDS,TH',
      created_by: adminUser.id,
    });

    await db.insert(waterQualityCalculations).values({
      upload_id: testUploadId,
      station_id: 'Station C',
      latitude: '12.9716',
      longitude: '77.5946',
      state: 'Karnataka',
      city: 'Bangalore',
      hpi: '110.0',
      hpi_classification: 'Unsuitable - Critical pollution',
      mi: '8.0',
      mi_classification: 'Seriously Affected',
      mi_class: 'Class VI',
      wqi: '85.0',
      wqi_classification: 'Very Poor',
      metals_analyzed: 'As,Cu,Zn,Pb',
      wqi_params_analyzed: 'pH,TDS,TH',
      created_by: adminUser.id,
    });
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.calculations);

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.get(API_PATHS.calculations, researcherToken);

      expect(response.status).toBe(403);
    });

    it('should allow admin to list calculations', async () => {
      const response = await apiHelper.get(API_PATHS.calculations, adminToken);

      expect(response.status).toBe(200);
    });

    it('should allow scientist to list calculations', async () => {
      const response = await apiHelper.get(API_PATHS.calculations, scientistToken);

      expect(response.status).toBe(200);
    });
  });

  describe('Basic Listing', () => {
    it('should list all calculations', async () => {
      const response = await apiHelper.get(API_PATHS.calculations, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.pagination.total).toBe(3);
    });

    it('should return correct calculation structure', async () => {
      const response = await apiHelper.get(API_PATHS.calculations, adminToken);

      const calc = response.body.data[0];
      expect(calc).toHaveProperty('id');
      expect(calc).toHaveProperty('station_id');
      expect(calc).toHaveProperty('hpi');
      expect(calc).toHaveProperty('hpi_classification');
      expect(calc).toHaveProperty('mi');
      expect(calc).toHaveProperty('mi_classification');
      expect(calc).toHaveProperty('wqi');
      expect(calc).toHaveProperty('wqi_classification');
      expect(calc).toHaveProperty('metals_analyzed');
      expect(calc).toHaveProperty('wqi_params_analyzed');
    });
  });

  describe('Pagination', () => {
    it('should respect page and limit parameters', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?page=1&limit=2`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(2);
      expect(response.body.meta.pagination.total).toBe(3);
    });

    it('should return empty array for page beyond data', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?page=10&limit=10`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    it('should filter by upload_id', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?upload_id=${testUploadId}`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach((calc: any) => {
        expect(calc.upload_id).toBe(testUploadId);
      });
    });

    it('should filter by state', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?state=Delhi`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].state).toBe('Delhi');
    });

    it('should filter by city', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?city=Mumbai`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].city).toBe('Mumbai');
    });

    it('should filter by HPI range', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?hpi_min=40&hpi_max=60`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].hpi).toBeGreaterThanOrEqual(40);
      expect(response.body.data[0].hpi).toBeLessThanOrEqual(60);
    });

    it('should filter by MI range', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?mi_min=0&mi_max=1`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].mi).toBeLessThanOrEqual(1);
    });

    it('should filter by WQI range', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?wqi_min=80&wqi_max=100`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].wqi).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Sorting', () => {
    it('should sort by HPI descending', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?sort_by=hpi&sort_order=desc`,
        adminToken
      );

      expect(response.status).toBe(200);
      const hpiValues = response.body.data.map((c: any) => c.hpi);
      expect(hpiValues[0]).toBeGreaterThanOrEqual(hpiValues[1]);
      expect(hpiValues[1]).toBeGreaterThanOrEqual(hpiValues[2]);
    });

    it('should sort by HPI ascending', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?sort_by=hpi&sort_order=asc`,
        adminToken
      );

      expect(response.status).toBe(200);
      const hpiValues = response.body.data.map((c: any) => c.hpi);
      expect(hpiValues[0]).toBeLessThanOrEqual(hpiValues[1]);
      expect(hpiValues[1]).toBeLessThanOrEqual(hpiValues[2]);
    });

    it('should sort by WQI', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?sort_by=wqi&sort_order=desc`,
        adminToken
      );

      expect(response.status).toBe(200);
      const wqiValues = response.body.data.map((c: any) => c.wqi);
      expect(wqiValues[0]).toBeGreaterThanOrEqual(wqiValues[1]);
    });

    it('should sort by station_id', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?sort_by=station_id&sort_order=asc`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data[0].station_id).toBe('Station A');
    });
  });

  describe('Combined Filters', () => {
    it('should combine state and HPI filters', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?state=Delhi&hpi_min=40`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].state).toBe('Delhi');
      expect(response.body.data[0].hpi).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Response Structure', () => {
    it('should return correct pagination metadata', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculations}?page=1&limit=2`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');
      expect(response.body.meta.pagination).toHaveProperty('page');
      expect(response.body.meta.pagination).toHaveProperty('limit');
      expect(response.body.meta.pagination).toHaveProperty('total');
      // Note: totalPages is calculated from total/limit, API returns raw pagination values
    });
  });
});
