import { Application } from 'express';
import App from '../../../../app';
import UserRoute from '../../../user';
import AuthRoute from '../../index';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { TestDataFactory } from '../../../../../tests/utils/factories';

describe('User Authentication Integration Tests', () => {
  let app: Application;
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
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = TestDataFactory.createUser({
        email: 'newuser@example.com',
        password: 'TestPassword123!',
        name: 'New User',
      });

      const response = await apiHelper.post(
        '/api/auth/register',
        userData as unknown as Record<string, unknown>
      );

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
    });

    it('should fail registration with invalid email', async () => {
      const userData = TestDataFactory.createUser({
        email: 'invalid-email',
        password: 'TestPassword123!',
      });

      const response = await apiHelper.post(
        '/api/auth/register',
        userData as unknown as Record<string, unknown>
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });

    it('should fail registration with weak password', async () => {
      const userData = TestDataFactory.createUser({
        email: 'test@example.com',
        password: 'weak',
      });

      const response = await apiHelper.post(
        '/api/auth/register',
        userData as unknown as Record<string, unknown>
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('password');
    });

    it('should fail registration with duplicate email', async () => {
      const userData = TestDataFactory.createUser({
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
      });

      await apiHelper.post('/api/auth/register', userData as unknown as Record<string, unknown>);

      const response = await apiHelper.post(
        '/api/auth/register',
        userData as unknown as Record<string, unknown>
      );

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const userData = TestDataFactory.createUser({
        email: 'logintest@example.com',
        password: 'TestPassword123!',
      });

      await apiHelper.post('/api/auth/register', userData as unknown as Record<string, unknown>);

      const response = await apiHelper.post('/api/auth/login', {
        email: userData.email,
        password: userData.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
    });

    it('should fail login with incorrect password', async () => {
      const { user } = await AuthTestHelper.createTestUserWithToken();

      const response = await apiHelper.post('/api/auth/login', {
        email: user.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      // Generic error message prevents user enumeration attacks
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail login with non-existent email', async () => {
      const response = await apiHelper.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      // Returns 401 with generic message to prevent user enumeration attacks
      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail login with missing fields', async () => {
      const response = await apiHelper.post('/api/auth/login', { email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/users', () => {
    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should require admin role to access users list', async () => {
      const { token } = await AuthTestHelper.createTestUserWithToken();

      const response = await apiHelper.get('/api/users', token);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID for authenticated user', async () => {
      const { user, token } = await AuthTestHelper.createTestUserWithToken();

      const response = await apiHelper.get(`/api/users/${user.id}`, token);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await AuthTestHelper.createTestUserWithToken();

      const response = await apiHelper.get('/api/users/99999', token);

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
