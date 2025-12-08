/**
 * Integration tests for POST /api/hmpi-engine/calculate-from-source
 * 
 * Tests calculation from pre-uploaded data sources
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import HMPIEngineRoute from '../../index';
import AuthRoute from '../../../auth';
import DataSourcesRoute from '../../../data-sources';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { waterQualityCalculations } from '../../shared/schema';
import { dataSources } from '../../../data-sources/shared/schema';

describe('POST /api/hmpi-engine/calculate-from-source', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
  let fieldTechToken: string;
  let researcherToken: string;

  beforeAll(async () => {
    const hmpiRoute = new HMPIEngineRoute();
    const authRoute = new AuthRoute();
    const dataSourcesRoute = new DataSourcesRoute();
    const appInstance = new App([authRoute, hmpiRoute, dataSourcesRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Clean up
    await db.execute(sql`TRUNCATE TABLE water_quality_calculations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE data_sources CASCADE`);
    await db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();
    await db.execute(sql`ALTER SEQUENCE water_quality_calculations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE data_sources_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);

    // Create test users
    const { token: aToken } = await AuthTestHelper.createTestUser({
      email: 'source-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'source-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    const { token: fToken } = await AuthTestHelper.createTestUser({
      email: 'source-fieldtech@test.com',
      password: 'FieldPass123!',
      name: 'Field Tech User',
      role: 'field_technician',
    });
    fieldTechToken = fToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'source-researcher@test.com',
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
      const response = await apiHelper.post('/api/hmpi-engine/calculate-from-source', {
        data_source_id: 1,
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for field_technician role', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 1 },
        fieldTechToken
      );

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 1 },
        researcherToken
      );

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should allow admin to access endpoint', async () => {
      // Will fail with 404 (data source not found) but should pass auth
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 999 },
        adminToken
      );

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow scientist to access endpoint', async () => {
      // Will fail with 404 (data source not found) but should pass auth
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 999 },
        scientistToken
      );

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing data_source_id', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        {},
        scientistToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid data_source_id type', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 'invalid' },
        scientistToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative data_source_id', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: -1 },
        scientistToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero data_source_id', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 0 },
        scientistToken
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Data Source Validation', () => {
    it('should return 404 for non-existent data source', async () => {
      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: 999999 },
        scientistToken
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Data source not found');
    });

    it('should return 400 for data source with pending status', async () => {
      // Create a pending data source
      const [dataSource] = await db.insert(dataSources).values({
        filename: 'test.csv',
        original_filename: 'test.csv',
        file_type: 'csv',
        mime_type: 'text/csv',
        file_size: 1024,
        file_path: 'test/path.csv',
        file_url: 'https://example.com/test.csv',
        uploaded_by: 1,
        status: 'pending',
        created_by: 1,
      }).returning();

      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: dataSource.id },
        scientistToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('not available');
      expect(response.body.error.message).toContain('pending');
    });

    it('should return 400 for data source with processing status', async () => {
      // Create a processing data source
      const [dataSource] = await db.insert(dataSources).values({
        filename: 'test.csv',
        original_filename: 'test.csv',
        file_type: 'csv',
        mime_type: 'text/csv',
        file_size: 1024,
        file_path: 'test/path.csv',
        file_url: 'https://example.com/test.csv',
        uploaded_by: 1,
        status: 'processing',
        created_by: 1,
      }).returning();

      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: dataSource.id },
        scientistToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('not available');
      expect(response.body.error.message).toContain('processing');
    });

    it('should return 400 for data source with failed status', async () => {
      // Create a failed data source
      const [dataSource] = await db.insert(dataSources).values({
        filename: 'test.csv',
        original_filename: 'test.csv',
        file_type: 'csv',
        mime_type: 'text/csv',
        file_size: 1024,
        file_path: 'test/path.csv',
        file_url: 'https://example.com/test.csv',
        uploaded_by: 1,
        status: 'failed',
        error_message: 'Processing failed',
        created_by: 1,
      }).returning();

      const response = await apiHelper.post(
        '/api/hmpi-engine/calculate-from-source',
        { data_source_id: dataSource.id },
        scientistToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('not available');
      expect(response.body.error.message).toContain('failed');
    });
  });

  describe('Workflow Documentation', () => {
    it('demonstrates the intended complete workflow', () => {
      // This test documents the complete workflow:
      //
      // 1. Field Technician uploads CSV/Excel file
      //    POST /api/data-sources/upload
      //    - File is uploaded to S3
      //    - Database record created with status='pending'
      //    - Background processing starts automatically
      //
      // 2. Background processor parses file
      //    - Downloads file from S3
      //    - Extracts metadata (rows, columns, stations, dates)
      //    - Updates status to 'available' (or 'failed' on error)
      //
      // 3. Scientist lists available data sources
      //    GET /api/data-sources?status=available
      //    - Sees all files uploaded by field technicians
      //    - Can filter by file type, uploader, date range
      //
      // 4. Scientist selects data source for calculation
      //    POST /api/hmpi-engine/calculate-from-source
      //    - Provides data_source_id
      //    - System fetches file from S3
      //    - Calculates HPI, MI, WQI indices
      //    - Stores results in water_quality_calculations table
      //    - Creates upload record for tracking
      //
      // 5. Scientist views/downloads results
      //    GET /api/hmpi-engine/calculations/:id
      //    GET /api/hmpi-engine/uploads/:upload_id/download
      //
      // Note: Full end-to-end test would require:
      // - Mock S3 service or real S3 bucket
      // - Real CSV files with valid water quality data
      // - Background job processing setup
      
      expect(true).toBe(true);
    });
  });
});
