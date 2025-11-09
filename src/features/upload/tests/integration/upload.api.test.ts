import { Application } from 'express';
import App from '../../../../app';
import UploadRoute from '../../upload.route';
import AuthRoute from '../../../auth/auth.route';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { TestDataFactory } from '../../../../../tests/utils/factories';

describe('Upload API Integration Tests', () => {
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
      '/api/v1/auth/register',
      userData as unknown as Record<string, unknown>
    );

    authToken = registerResponse.body.data.token;
    const userInfo = AuthTestHelper.verifyToken(authToken);
    testUserId = userInfo.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/v1/uploads', () => {
    it('should upload file to S3 successfully', async () => {
      // Create a test file buffer
      const fileContent = 'This is a test file for upload testing';
      const fileBuffer = Buffer.from(fileContent);
      const filename = 'test-document.txt';

      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        filename,
        authToken
      );

      expect(response.status).toBe(201);
      expect(response.body.data.filename).toBe(filename);
      expect(response.body.data.original_filename).toBe(filename);
      expect(response.body.data.mime_type).toBe('text/plain');
      expect(response.body.data.file_size).toBe(fileBuffer.length);
      expect(response.body.data.user_id).toBe(testUserId);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('file_path');
      expect(response.body.data).toHaveProperty('file_url');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data.file_path).toContain(`uploads/${testUserId}/`);
      expect(response.body.data.file_url).toContain(response.body.data.file_path);
    });

    it('should fail when no file is provided', async () => {
      const response = await apiHelper.post('/api/v1/uploads', {}, authToken);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should require authentication', async () => {
      const fileBuffer = Buffer.from('test content');
      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        'test.txt'
      );

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('GET /api/v1/uploads', () => {
    beforeEach(async () => {
      // Create some test uploads
      const file1Buffer = Buffer.from('Test file 1 content');
      await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        file1Buffer,
        'test1.txt',
        authToken
      );

      const file2Buffer = Buffer.from('Test file 2 content');
      await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        file2Buffer,
        'test2.txt',
        authToken
      );
    });

    it('should return user uploads with pagination', async () => {
      const response = await apiHelper.get('/api/v1/uploads', authToken);

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
      const response = await apiHelper.get('/api/v1/uploads?mime_type=text/plain', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].mime_type).toBe('text/plain');
    });

    it('should support pagination', async () => {
      const response = await apiHelper.get('/api/v1/uploads?page=1&limit=1', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/v1/uploads');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication');
    });
  });

  describe('GET /api/v1/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const fileBuffer = Buffer.from('Test file content');
      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        'test.txt',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should get upload by ID', async () => {
      const response = await apiHelper.get(`/api/v1/uploads/${uploadId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(uploadId);
      expect(response.body.data.filename).toBe('test.txt');
      expect(response.body.data.user_id).toBe(testUserId);
    });

    it('should return 404 for non-existent upload', async () => {
      const response = await apiHelper.get('/api/v1/uploads/99999', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/v1/uploads/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication');
    });
  });

  describe('PUT /api/v1/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const fileBuffer = Buffer.from('Test file content');
      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        'test.txt',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should update upload successfully', async () => {
      const updateData = {
        status: 'completed',
      };

      const response = await apiHelper.put(`/api/v1/uploads/${uploadId}`, updateData, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.id).toBe(uploadId);
    });

    it('should fail with invalid data', async () => {
      const invalidUpdateData = {
        status: 'invalid_status',
      };

      const response = await apiHelper.put(
        `/api/v1/uploads/${uploadId}`,
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
        `/api/v1/uploads/${nonExistentId}`,
        updateData,
        authToken
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('DELETE /api/v1/uploads/:id', () => {
    let uploadId: number;

    beforeEach(async () => {
      // Create a test upload
      const fileBuffer = Buffer.from('Test file content');
      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        'test.txt',
        authToken
      );

      uploadId = response.body.data.id;
    });

    it('should delete upload successfully', async () => {
      const response = await apiHelper.delete(`/api/v1/uploads/${uploadId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Upload deleted successfully');

      // Verify upload is deleted (soft delete)
      const getResponse = await apiHelper.get(`/api/v1/uploads/${uploadId}`, authToken);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent upload', async () => {
      const response = await apiHelper.delete('/api/v1/uploads/99999', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/v1/uploads/stats', () => {
    beforeEach(async () => {
      // Create test uploads with different statuses
      const fileBuffer = Buffer.from('Test file content');
      const response = await apiHelper.uploadFileBuffer(
        '/api/v1/uploads',
        'file',
        fileBuffer,
        'completed.txt',
        authToken
      );

      // Update one to completed status
      const uploadId = response.body.data.id;
      await apiHelper.put(`/api/v1/uploads/${uploadId}`, { status: 'completed' }, authToken);
    });

    it('should return upload statistics', async () => {
      const response = await apiHelper.get('/api/v1/uploads/stats', authToken);

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
