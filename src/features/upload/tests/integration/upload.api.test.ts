import { Application } from 'express';
import App from '../../../../app';
import UploadRoute from '../..';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { TestDataFactory } from '../../../../../tests/utils/factories';

// Run S3 tests if credentials are configured (regardless of NODE_ENV)
const isS3Available = !!(
  process.env.AWS_ACCESS_KEY && 
  process.env.AWS_SECRET_KEY && 
  process.env.AWS_BUCKET_NAME &&
  process.env.AWS_ENDPOINT
);

// PDF magic bytes (%PDF-1.4) + minimal PDF content
const createTestPdfBuffer = (content: string = 'Test PDF content') => {
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n292\n%%EOF`;
  return Buffer.from(pdfHeader + pdfContent);
};

const describeS3 = isS3Available ? describe : describe.skip;

describeS3('Upload API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    const uploadRoute = new UploadRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, uploadRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create a test user and get auth token
    const userData = TestDataFactory.createUser({
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
    });

    const registerResponse = await apiHelper.post(
      '/api/auth/register',
      userData as unknown as Record<string, unknown>
    );

    authToken = registerResponse.body.data.token;
    const userInfo = AuthTestHelper.verifyToken(authToken);
    testUserId = userInfo.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/uploads', () => {
    it('should upload file to S3 successfully', async () => {
      // Create a test PDF buffer with valid magic bytes
      const fileBuffer = createTestPdfBuffer('Test upload content');
      const filename = 'test-document.pdf';

      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        fileBuffer,
        filename,
        authToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.original_filename).toBe(filename);
      expect(response.body.data.mime_type).toBe('application/pdf');
      expect(response.body.data.user_id).toBe(testUserId);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('file_path');
      expect(response.body.data).toHaveProperty('file_url');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data.file_path).toContain(`uploads/${testUserId}/`);
    });

    it('should fail when no file is provided', async () => {
      const response = await apiHelper.post('/api/uploads', {}, authToken);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should require authentication', async () => {
      const fileBuffer = createTestPdfBuffer();
      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        fileBuffer,
        'test.pdf'
      );

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('GET /api/uploads', () => {
    beforeEach(async () => {
      // Create some test uploads
      await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('File 1'),
        'test1.pdf',
        authToken
      );

      await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('File 2'),
        'test2.pdf',
        authToken
      );
    });

    it('should return user uploads with pagination', async () => {
      const response = await apiHelper.get('/api/uploads', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta.pagination).toHaveProperty('total');
      expect(response.body.meta.pagination).toHaveProperty('page');
      expect(response.body.meta.pagination).toHaveProperty('limit');
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('filename');
      expect(response.body.data[0]).toHaveProperty('user_id');
      expect(response.body.data[0].user_id).toBe(testUserId);
    });

    it('should filter by mime type', async () => {
      const response = await apiHelper.get('/api/uploads?mime_type=application/pdf', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].mime_type).toBe('application/pdf');
    });

    it('should support pagination', async () => {
      const response = await apiHelper.get('/api/uploads?page=1&limit=1', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/uploads');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication');
    });
  });

  describe('GET /api/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('Test content'),
        'test.pdf',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should get upload by ID', async () => {
      const response = await apiHelper.get(`/api/uploads/${uploadId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(uploadId);
      expect(response.body.data.original_filename).toBe('test.pdf');
      expect(response.body.data.user_id).toBe(testUserId);
    });

    it('should return 404 for non-existent upload', async () => {
      const response = await apiHelper.get('/api/uploads/99999', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/uploads/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication');
    });
  });

  describe('PUT /api/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('Test content'),
        'test.pdf',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should update upload successfully', async () => {
      const updateData = {
        status: 'completed',
      };

      const response = await apiHelper.put(`/api/uploads/${uploadId}`, updateData, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.id).toBe(uploadId);
    });

    it('should fail with invalid data', async () => {
      const invalidUpdateData = {
        status: 'invalid_status',
      };

      const response = await apiHelper.put(
        `/api/uploads/${uploadId}`,
        invalidUpdateData,
        authToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 404 for non-existent upload', async () => {
      const updateData = { status: 'completed' };
      const nonExistentId = 99999;

      const response = await apiHelper.put(
        `/api/uploads/${nonExistentId}`,
        updateData,
        authToken
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('DELETE /api/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('Test content'),
        'test.pdf',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should delete upload successfully', async () => {
      const response = await apiHelper.delete(`/api/uploads/${uploadId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Upload deleted successfully');

      // Verify upload is deleted (soft delete)
      const getResponse = await apiHelper.get(`/api/uploads/${uploadId}`, authToken);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent upload', async () => {
      const response = await apiHelper.delete('/api/uploads/99999', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/uploads/stats', () => {
    beforeEach(async () => {
      // Create test uploads with different statuses
      const response = await apiHelper.uploadFileBuffer(
        '/api/uploads',
        'file',
        createTestPdfBuffer('Stats test content'),
        'completed.pdf',
        authToken
      );

      // Update one to completed status
      const uploadId = response.body.data.id;
      await apiHelper.put(`/api/uploads/${uploadId}`, { status: 'completed' }, authToken);
    });

    it('should return upload statistics', async () => {
      const response = await apiHelper.get('/api/uploads/stats', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_uploads');
      expect(response.body.data).toHaveProperty('total_size');
      expect(response.body.data).toHaveProperty('uploads_by_status');
      expect(response.body.data.uploads_by_status).toHaveProperty('completed');
      expect(response.body.data.uploads_by_status).toHaveProperty('pending');
      expect(response.body.data.uploads_by_status).toHaveProperty('failed');
      expect(response.body.data.uploads_by_status).toHaveProperty('processing');
    });
  });
});
