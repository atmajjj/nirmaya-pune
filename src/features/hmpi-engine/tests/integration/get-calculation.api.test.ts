/**
 * Integration tests for GET /api/nirmaya-engine/calculations/:id
 * 
 * Tests fetching a single calculation by ID
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import NirmayaEngineRoute from '../../index';
import AuthRoute from '../../../auth';
import UploadRoute from '../../../upload';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { waterQualityCalculations } from '../../shared/schema';
import { uploads } from '../../../upload/shared/schema';
import { API_PATHS } from './fixtures';

describe('GET /api/nirmaya-engine/calculations/:id', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let researcherToken: string;
  let testCalculationId: number;

  beforeAll(async () => {
    const nirmayaRoute = new NirmayaEngineRoute();
    const authRoute = new AuthRoute();
    const uploadRoute = new UploadRoute();
    const appInstance = new App([authRoute, nirmayaRoute, uploadRoute]);
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
      email: 'get-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'get-researcher@test.com',
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

    // Create test calculation
    const [calculation] = await db.insert(waterQualityCalculations).values({
      upload_id: upload.id,
      station_id: 'Test Station',
      latitude: '28.6139',
      longitude: '77.2090',
      state: 'Delhi',
      city: 'New Delhi',
      hpi: '55.5',
      hpi_classification: 'Poor - Medium pollution',
      mi: '3.2',
      mi_classification: 'Moderately Affected',
      mi_class: 'Class IV',
      wqi: '42.0',
      wqi_classification: 'Good',
      metals_analyzed: 'As,Cu,Zn,Pb,Hg,Cd,Ni',
      wqi_params_analyzed: 'pH,TDS,TH,EC,Ca,Mg',
      created_by: adminUser.id,
    }).returning();
    testCalculationId = calculation.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.calculation(testCalculationId));

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        researcherToken
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to get calculation', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Get Calculation', () => {
    it('should return calculation by ID', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testCalculationId);
      expect(response.body.data.station_id).toBe('Test Station');
    });

    it('should return all calculation fields', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      const calc = response.body.data;
      expect(calc).toHaveProperty('id');
      expect(calc).toHaveProperty('upload_id');
      expect(calc).toHaveProperty('station_id');
      expect(calc).toHaveProperty('latitude');
      expect(calc).toHaveProperty('longitude');
      expect(calc).toHaveProperty('state');
      expect(calc).toHaveProperty('city');
      expect(calc).toHaveProperty('hpi');
      expect(calc).toHaveProperty('hpi_classification');
      expect(calc).toHaveProperty('mi');
      expect(calc).toHaveProperty('mi_classification');
      expect(calc).toHaveProperty('mi_class');
      expect(calc).toHaveProperty('wqi');
      expect(calc).toHaveProperty('wqi_classification');
      expect(calc).toHaveProperty('metals_analyzed');
      expect(calc).toHaveProperty('wqi_params_analyzed');
    });

    it('should return correct values', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      const calc = response.body.data;
      expect(calc.state).toBe('Delhi');
      expect(calc.city).toBe('New Delhi');
      expect(parseFloat(calc.hpi)).toBeCloseTo(55.5, 1);
      expect(calc.hpi_classification).toBe('Poor - Medium pollution');
      expect(parseFloat(calc.mi)).toBeCloseTo(3.2, 1);
      expect(calc.mi_classification).toBe('Moderately Affected');
      expect(parseFloat(calc.wqi)).toBeCloseTo(42.0, 1);
      expect(calc.wqi_classification).toBe('Good');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(99999),
        adminToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await apiHelper.get(
        '/api/nirmaya-engine/calculations/invalid',
        adminToken
      );

      // Zod validation should catch this
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Include Analysis Option', () => {
    it('should include analysis when requested', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.calculation(testCalculationId)}?include_analysis=true`,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('analysis');
    });

    it('should not include analysis by default', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.analysis).toBeUndefined();
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const response = await apiHelper.get(
        API_PATHS.calculation(testCalculationId),
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('retrieved');
    });
  });
});
