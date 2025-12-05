import { Application } from 'express';
import App from '../../../../app';
import UserRoute from '../..';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { TestDataFactory } from '../../../../../tests/utils/factories';

describe('User API Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let apiHelper: ApiTestHelper;

  beforeAll(async () => {
    const userRoute = new UserRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, userRoute]);
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
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('GET /api/users', () => {
    it('should require admin role to access users list', async () => {
      const response = await apiHelper.get('/api/users', authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID for authenticated user', async () => {
      // First get the user ID from the token
      const userInfo = AuthTestHelper.verifyToken(authToken);
      const userId = userInfo.id;

      const response = await apiHelper.get(`/api/users/${userId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await apiHelper.get('/api/users/99999', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('User not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });
});
