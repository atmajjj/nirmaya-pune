/**
 * Integration tests for GET /api/hmpi-engine/stats
 * 
 * Tests water quality calculation statistics
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
import { API_PATHS } from './fixtures';

describe('GET /api/hmpi-engine/stats', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
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
    // Clean up tables
    await db.execute(sql`TRUNCATE TABLE water_quality_calculations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();
    await db.execute(sql`ALTER SEQUENCE water_quality_calculations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);

    // Create test users
    const { token: aToken, user: adminUser } = await AuthTestHelper.createTestUser({
      email: 'stats-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'stats-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'stats-researcher@test.com',
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

    // Create test calculations with varied data
    await db.insert(waterQualityCalculations).values({
      upload_id: upload.id,
      station_id: 'Station A',
      state: 'Delhi',
      city: 'New Delhi',
      hpi: '50.5',
      hpi_classification: 'Poor - Medium pollution',
      mi: '2.5',
      mi_classification: 'Moderately Affected',
      mi_class: 'Class IV',
      wqi: '35.0',
      wqi_classification: 'Good',
      created_by: adminUser.id,
    });

    await db.insert(waterQualityCalculations).values({
      upload_id: upload.id,
      station_id: 'Station B',
      state: 'Delhi',
      city: 'Gurgaon',
      hpi: '25.0',
      hpi_classification: 'Good - Low to medium pollution',
      mi: '0.8',
      mi_classification: 'Pure',
      mi_class: 'Class II',
      wqi: '20.0',
      wqi_classification: 'Excellent',
      created_by: adminUser.id,
    });

    await db.insert(waterQualityCalculations).values({
      upload_id: upload.id,
      station_id: 'Station C',
      state: 'Maharashtra',
      city: 'Mumbai',
      hpi: '110.0',
      hpi_classification: 'Unsuitable - Critical pollution',
      mi: '8.0',
      mi_classification: 'Seriously Affected',
      mi_class: 'Class VI',
      wqi: '85.0',
      wqi_classification: 'Very Poor',
      created_by: adminUser.id,
    });

    await db.insert(waterQualityCalculations).values({
      upload_id: upload.id,
      station_id: 'Station D',
      state: 'Karnataka',
      city: 'Bangalore',
      hpi: '15.0',
      hpi_classification: 'Excellent - Low pollution',
      mi: '0.2',
      mi_classification: 'Very Pure',
      mi_class: 'Class I',
      wqi: '15.0',
      wqi_classification: 'Excellent',
      created_by: adminUser.id,
    });
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.stats);

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.get(API_PATHS.stats, researcherToken);

      expect(response.status).toBe(403);
    });

    it('should allow admin to get stats', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      expect(response.status).toBe(200);
    });

    it('should allow scientist to get stats', async () => {
      const response = await apiHelper.get(API_PATHS.stats, scientistToken);

      expect(response.status).toBe(200);
    });
  });

  describe('Basic Statistics', () => {
    it('should return total calculation count', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.total_calculations).toBe(4);
    });

    it('should return HPI statistics', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      const stats = response.body.data;
      expect(stats).toHaveProperty('averages');
      expect(stats.averages).toHaveProperty('hpi');
      
      // Verify HPI average is a number
      expect(typeof stats.averages.hpi).toBe('number');
    });

    it('should return MI statistics', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      const stats = response.body.data;
      expect(stats).toHaveProperty('averages');
      expect(stats.averages).toHaveProperty('mi');
      
      // Verify MI average is a number
      expect(typeof stats.averages.mi).toBe('number');
    });

    it('should return WQI statistics', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      const stats = response.body.data;
      expect(stats).toHaveProperty('averages');
      expect(stats.averages).toHaveProperty('wqi');
      
      // Verify WQI average is a number
      expect(typeof stats.averages.wqi).toBe('number');
    });
  });

  describe('Classification Distribution', () => {
    it('should return HPI classification distribution', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      const stats = response.body.data;
      expect(stats).toHaveProperty('by_hpi_classification');
      expect(typeof stats.by_hpi_classification).toBe('object');
    });

    it('should return WQI classification distribution', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      const stats = response.body.data;
      expect(stats).toHaveProperty('by_wqi_classification');
      expect(typeof stats.by_wqi_classification).toBe('object');
    });
  });

  describe('Filtering', () => {
    it('should filter stats by state', async () => {
      const response = await apiHelper.get(
        `${API_PATHS.stats}?state=Delhi`,
        adminToken
      );

      expect(response.status).toBe(200);
      // Delhi has 2 stations
      expect(response.body.data.total_calculations).toBe(2);
    });
  });

  describe('Empty Data', () => {
    it('should handle empty calculations gracefully', async () => {
      // Clear all calculations
      await db.execute(sql`TRUNCATE TABLE water_quality_calculations CASCADE`);

      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.total_calculations).toBe(0);
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const response = await apiHelper.get(API_PATHS.stats, adminToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Statistics');
    });
  });
});
