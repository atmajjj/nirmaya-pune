/**
 * Integration tests for researcher application APIs
 */

import { Application } from 'express';
import App from '../../../../app';
import ResearcherRoute from '../..';
import AuthRoute from '../../../auth';
import UserRoute from '../../../user';
import AdminInviteRoute from '../../../admin-invite';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { TestDataFactory } from '../../../../../tests/utils/factories';
import { db } from '../../../../database/drizzle';
import { users } from '../../../user/shared/schema';
import { hashPassword } from '../../../../utils/password';

describe('Researcher Application API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let adminUserId: number;

  beforeAll(async () => {
    const researcherRoute = new ResearcherRoute();
    const authRoute = new AuthRoute();
    const userRoute = new UserRoute();
    const adminInviteRoute = new AdminInviteRoute();
    const appInstance = new App([authRoute, userRoute, adminInviteRoute, researcherRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create admin user manually
    const hashedPassword = await hashPassword('Admin123!@#');
    const [admin] = await db.insert(users).values({
      name: 'Admin User',
      email: 'admin@nirmaya.com',
      password: hashedPassword,
      phone_number: '1234567890',
      role: 'admin',
      created_by: 1,
    }).returning();

    adminUserId = admin.id;

    // Get admin token
    const loginResponse = await apiHelper.post('/api/auth/login', {
      email: 'admin@nirmaya.com',
      password: 'Admin123!@#',
    });

    adminToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/researcher/apply', () => {
    const validApplication = {
      full_name: 'Jane Smith',
      email: 'jane.smith@research.org',
      phone_number: '+1234567890',
      organization: 'MIT Research Lab',
      purpose: 'I want to conduct water quality research for environmental studies and policy making',
    };

    it('should submit application successfully', async () => {
      const response = await apiHelper.post('/api/researcher/apply', validApplication);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.message).toContain('Application submitted successfully');
    });

    it('should fail with invalid email', async () => {
      const response = await apiHelper.post('/api/researcher/apply', {
        ...validApplication,
        email: 'invalid-email',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with short purpose', async () => {
      const response = await apiHelper.post('/api/researcher/apply', {
        ...validApplication,
        purpose: 'Too short',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail if email already registered', async () => {
      // Create a user first
      await db.insert(users).values({
        name: 'Existing User',
        email: validApplication.email,
        password: await hashPassword('Password123!'),
        phone_number: '9876543210',
        role: 'researcher',
        created_by: 1,
      });

      const response = await apiHelper.post('/api/researcher/apply', validApplication);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already registered');
    });

    it('should fail if pending application exists', async () => {
      // Submit first application
      await apiHelper.post('/api/researcher/apply', validApplication);

      // Try to submit again
      const response = await apiHelper.post('/api/researcher/apply', validApplication);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('pending application');
    });

    it('should allow reapplication after rejection', async () => {
      // Submit application
      const submitResponse = await apiHelper.post('/api/researcher/apply', validApplication);
      const applicationId = submitResponse.body.data.id;

      // Admin rejects it
      await apiHelper.post(
        '/api/researcher/applications/reject',
        { application_id: applicationId, rejection_reason: 'Test rejection' },
        adminToken
      );

      // Try to apply again - should succeed
      const reapplyResponse = await apiHelper.post('/api/researcher/apply', validApplication);

      expect(reapplyResponse.status).toBe(201);
      expect(reapplyResponse.body.data.status).toBe('pending');
    });

    it('should fail with missing required fields', async () => {
      const response = await apiHelper.post('/api/researcher/apply', {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        // Missing phone_number, organization, purpose
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/researcher/applications', () => {
    beforeEach(async () => {
      // Create multiple applications
      await apiHelper.post('/api/researcher/apply', {
        full_name: 'Applicant 1',
        email: 'applicant1@test.com',
        phone_number: '+1111111111',
        organization: 'Org 1',
        purpose: 'Purpose for applicant 1 research work',
      });

      await apiHelper.post('/api/researcher/apply', {
        full_name: 'Applicant 2',
        email: 'applicant2@test.com',
        phone_number: '+2222222222',
        organization: 'Org 2',
        purpose: 'Purpose for applicant 2 research work',
      });
    });

    it('should return all applications for admin', async () => {
      const response = await apiHelper.get('/api/researcher/applications', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('full_name');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('should filter by pending status', async () => {
      const response = await apiHelper.get('/api/researcher/applications?status=pending', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every((app: any) => app.status === 'pending')).toBe(true);
    });

    it('should require admin authentication', async () => {
      const response = await apiHelper.get('/api/researcher/applications');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication');
    });

    it('should deny access to non-admin users', async () => {
      // Create a regular researcher user
      const hashedPassword = await hashPassword('User123!@#');
      await db.insert(users).values({
        name: 'Regular User',
        email: 'user@nirmaya.com',
        password: hashedPassword,
        phone_number: '9999999999',
        role: 'researcher',
        created_by: 1,
      });

      const loginResponse = await apiHelper.post('/api/auth/login', {
        email: 'user@nirmaya.com',
        password: 'User123!@#',
      });

      const userToken = loginResponse.body.data.token;

      const response = await apiHelper.get('/api/researcher/applications', userToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('POST /api/researcher/applications/accept', () => {
    let applicationId: string;

    beforeEach(async () => {
      const response = await apiHelper.post('/api/researcher/apply', {
        full_name: 'Test Applicant',
        email: 'test.applicant@research.org',
        phone_number: '+1234567890',
        organization: 'Test University',
        purpose: 'Research purpose for testing the application flow end to end',
      });

      applicationId = response.body.data.id;
    });

    it('should accept application and send invitation email', async () => {
      const response = await apiHelper.post(
        '/api/researcher/applications/accept',
        { application_id: applicationId },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
      expect(response.body.data.reviewed_at).toBeDefined();
      expect(response.body.message).toContain('Invitation email sent');
    });

    it('should fail with invalid application ID', async () => {
      const response = await apiHelper.post(
        '/api/researcher/applications/accept',
        { application_id: '00000000-0000-0000-0000-000000000000' },
        adminToken
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should fail if application already accepted', async () => {
      // Accept first time
      await apiHelper.post(
        '/api/researcher/applications/accept',
        { application_id: applicationId },
        adminToken
      );

      // Try to accept again
      const response = await apiHelper.post(
        '/api/researcher/applications/accept',
        { application_id: applicationId },
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been');
    });

    it('should require admin authentication', async () => {
      const response = await apiHelper.post('/api/researcher/applications/accept', {
        application_id: applicationId,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/researcher/applications/reject', () => {
    let applicationId: string;

    beforeEach(async () => {
      const response = await apiHelper.post('/api/researcher/apply', {
        full_name: 'Test Rejectee',
        email: 'reject.test@research.org',
        phone_number: '+9876543210',
        organization: 'Test Institute',
        purpose: 'Testing rejection flow for the researcher application system',
      });

      applicationId = response.body.data.id;
    });

    it('should reject application with reason', async () => {
      const response = await apiHelper.post(
        '/api/researcher/applications/reject',
        {
          application_id: applicationId,
          rejection_reason: 'Application does not meet our current research criteria',
        },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejection_reason).toBe('Application does not meet our current research criteria');
      expect(response.body.data.reviewed_at).toBeDefined();
    });

    it('should reject application without reason', async () => {
      const response = await apiHelper.post(
        '/api/researcher/applications/reject',
        { application_id: applicationId },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('rejected');
    });

    it('should fail with invalid application ID', async () => {
      const response = await apiHelper.post(
        '/api/researcher/applications/reject',
        { application_id: '00000000-0000-0000-0000-000000000000' },
        adminToken
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should fail if application already rejected', async () => {
      // Reject first time
      await apiHelper.post(
        '/api/researcher/applications/reject',
        { application_id: applicationId },
        adminToken
      );

      // Try to reject again
      const response = await apiHelper.post(
        '/api/researcher/applications/reject',
        { application_id: applicationId },
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been');
    });

    it('should require admin authentication', async () => {
      const response = await apiHelper.post('/api/researcher/applications/reject', {
        application_id: applicationId,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full application lifecycle', async () => {
      // 1. User submits application
      const submitResponse = await apiHelper.post('/api/researcher/apply', {
        full_name: 'Complete Flow Test',
        email: 'e2e.test@research.org',
        phone_number: '+1122334455',
        organization: 'E2E Test University',
        purpose: 'End to end testing of the complete researcher application flow',
      });

      expect(submitResponse.status).toBe(201);
      const applicationId = submitResponse.body.data.id;

      // 2. Admin views applications
      const viewResponse = await apiHelper.get('/api/researcher/applications', adminToken);
      expect(viewResponse.status).toBe(200);
      const foundApplication = viewResponse.body.data.find((app: any) => app.id === applicationId);
      expect(foundApplication).toBeDefined();
      expect(foundApplication.status).toBe('pending');

      // 3. Admin accepts application
      const acceptResponse = await apiHelper.post(
        '/api/researcher/applications/accept',
        { application_id: applicationId },
        adminToken
      );

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.data.status).toBe('accepted');

      // 4. Verify application status changed
      const verifyResponse = await apiHelper.get('/api/researcher/applications?status=accepted', adminToken);
      expect(verifyResponse.status).toBe(200);
      const acceptedApp = verifyResponse.body.data.find((app: any) => app.id === applicationId);
      expect(acceptedApp).toBeDefined();
      expect(acceptedApp.status).toBe('accepted');
      expect(acceptedApp.reviewed_by).toBe(adminUserId);
    });
  });
});
