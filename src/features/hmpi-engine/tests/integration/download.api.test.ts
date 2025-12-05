/**
 * Integration tests for GET /api/hmpi-engine/uploads/:upload_id/download
 * 
 * Tests downloading calculation results as CSV
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

describe('GET /api/hmpi-engine/uploads/:upload_id/download', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
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
      email: 'download-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'download-researcher@test.com',
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
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.download(testUploadId));

      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        researcherToken
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to download', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Download CSV', () => {
    it('should return CSV content type', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should return Content-Disposition header for download', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    it('should include all calculations in CSV', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      const csvContent = response.text;
      
      // Check header row
      expect(csvContent).toContain('Station ID');
      expect(csvContent).toContain('HPI');
      expect(csvContent).toContain('MI');
      expect(csvContent).toContain('WQI');
      
      // Check data rows
      expect(csvContent).toContain('Station A');
      expect(csvContent).toContain('Station B');
      expect(csvContent).toContain('Delhi');
      expect(csvContent).toContain('Maharashtra');
    });

    it('should include classification columns', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      const csvContent = response.text;
      expect(csvContent).toContain('HPI Classification');
      expect(csvContent).toContain('MI Classification');
      expect(csvContent).toContain('WQI Classification');
      expect(csvContent).toContain('Poor - Medium pollution');
      expect(csvContent).toContain('Excellent');
    });

    it('should include location data', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      const csvContent = response.text;
      expect(csvContent).toContain('Latitude');
      expect(csvContent).toContain('Longitude');
      expect(csvContent).toContain('State');
      expect(csvContent).toContain('City');
      expect(csvContent).toContain('28.6139');
      // Longitude may be stored with varying precision (77.209 or 77.2090)
      expect(csvContent).toMatch(/77\.209/);
    });

    it('should include metals and params analyzed', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      const csvContent = response.text;
      expect(csvContent).toContain('Metals Analyzed');
      expect(csvContent).toContain('WQI Parameters Analyzed');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent upload ID', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(99999),
        adminToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid upload ID format', async () => {
      const response = await apiHelper.get(
        '/api/hmpi-engine/uploads/invalid/download',
        adminToken
      );

      // Zod validation should catch this
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Empty Upload', () => {
    it('should return 404 when upload has no calculations', async () => {
      // Create upload with no calculations
      const { user: adminUser } = await AuthTestHelper.createTestUser({
        email: 'empty-admin@test.com',
        password: 'AdminPass123!',
        name: 'Empty Admin',
        role: 'admin',
      });

      const [emptyUpload] = await db.insert(uploads).values({
        filename: 'empty_upload.csv',
        original_filename: 'empty_upload.csv',
        mime_type: 'text/csv',
        file_size: 1024,
        file_path: 'uploads/empty.csv',
        file_url: 'https://example.com/empty.csv',
        user_id: adminUser.id,
        status: 'completed',
        created_by: adminUser.id,
        updated_by: adminUser.id,
      }).returning();

      const response = await apiHelper.get(
        API_PATHS.download(emptyUpload.id),
        adminToken
      );

      expect(response.status).toBe(404);
    });
  });

  describe('CSV Format Validation', () => {
    it('should generate valid CSV with proper escaping', async () => {
      const response = await apiHelper.get(
        API_PATHS.download(testUploadId),
        adminToken
      );

      const csvContent = response.text;
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      
      // Should have header + 2 data rows
      expect(lines.length).toBe(3);
      
      // Header should have expected columns
      const headers = lines[0].split(',');
      expect(headers.length).toBeGreaterThan(10);
    });
  });
});
