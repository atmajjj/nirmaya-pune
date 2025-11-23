import { Application } from 'express';
import App from '../../../../app';
import AdminInviteRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { db } from '../../../../database/drizzle';
import { invitations } from '../../shared/schema';
import { users } from '../../../user/shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Admin Invite API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let adminUserId: number;
  let scientistToken: string;

  beforeAll(async () => {
    const adminInviteRoute = new AdminInviteRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, adminInviteRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create admin user
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const [admin] = await db
      .insert(users)
      .values({
        email: 'admin@nirmaya.com',
        name: 'Admin User',
        password: adminPassword,
        role: 'admin',
        created_by: 1,
      })
      .returning();
    adminUserId = admin.id;
    adminToken = AuthTestHelper.generateJwtToken(admin.id, admin.email, 'admin');

    // Create scientist user for authorization tests
    const { token } = await AuthTestHelper.createTestUserWithToken();
    scientistToken = token;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/v1/admin/invitations', () => {
    it('should create invitation successfully with admin role', async () => {
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: 'harshalpatilself@gmail.com',
        assigned_role: 'scientist',
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe('Harshal');
      expect(response.body.data.last_name).toBe('Patil');
      expect(response.body.data.email).toBe('harshalpatilself@gmail.com');
      expect(response.body.data.assigned_role).toBe('scientist');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.invite_token).toBeDefined();
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
      expect(response.body.message).toContain('Invitation sent successfully');
    });

    it('should fail with invalid email format', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        assigned_role: 'scientist',
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });

    it('should fail with invalid role', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role: 'invalid_role',
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const invitationData = {
        first_name: 'John',
        email: 'john.doe@example.com',
        // Missing last_name and assigned_role
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData as any,
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with duplicate active invitation', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role: 'scientist',
      };

      // Create first invitation
      await apiHelper.post('/api/v1/admin/invitations', invitationData, adminToken);

      // Try to create duplicate
      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('active invitation already exists');
    });

    it('should require admin role', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role: 'scientist',
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        scientistToken
      );

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should require authentication', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role: 'scientist',
      };

      const response = await apiHelper.post('/api/v1/admin/invitations', invitationData);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should create invitation for all valid roles', async () => {
      const roles = ['admin', 'scientist', 'researcher', 'policymaker'];

      for (const role of roles) {
        const invitationData = {
          first_name: 'Test',
          last_name: 'User',
          email: `test.${role}@example.com`,
          assigned_role: role,
        };

        const response = await apiHelper.post(
          '/api/v1/admin/invitations',
          invitationData,
          adminToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.assigned_role).toBe(role);
      }
    });
  });

  describe('GET /api/v1/admin/invitations', () => {
    beforeEach(async () => {
      // Create test invitations
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);
      await db.insert(invitations).values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.pending@example.com',
          invite_token: 'token1',
          status: 'pending',
          assigned_role: 'scientist',
          password: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.accepted@example.com',
          invite_token: 'token2',
          status: 'accepted',
          assigned_role: 'researcher',
          password: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          accepted_at: new Date(),
        },
        {
          first_name: 'Bob',
          last_name: 'Wilson',
          email: 'bob.expired@example.com',
          invite_token: 'token3',
          status: 'expired',
          assigned_role: 'policymaker',
          password: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ]);
    });

    it('should get all invitations for admin', async () => {
      const response = await apiHelper.get('/api/v1/admin/invitations', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should filter invitations by status', async () => {
      const response = await apiHelper.get(
        '/api/v1/admin/invitations?status=pending',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.invitations[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await apiHelper.get(
        '/api/v1/admin/invitations?page=1&limit=2',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
    });

    it('should require admin role', async () => {
      const response = await apiHelper.get('/api/v1/admin/invitations', scientistToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/v1/admin/invitations');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('POST /api/v1/admin/invitations/accept', () => {
    it('should accept invitation and create user account', async () => {
      const inviteToken = `test-invite-token-${Date.now()}`;
      const invitationEmail = `newuser-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);

      await db.insert(invitations).values({
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role: 'scientist',
        password: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const acceptData = {
        token: inviteToken,
        password: 'NewSecurePass123!',
      };

      const response = await apiHelper.post('/api/v1/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('accepted');
      expect(response.body.message).toContain('accepted successfully');

      // Verify user was created
      const [createdUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, invitationEmail));

      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');
      expect(createdUser.role).toBe('scientist');
    });

    it('should fail with invalid token', async () => {
      const acceptData = {
        token: 'invalid-token',
        password: 'NewSecurePass123!',
      };

      const response = await apiHelper.post('/api/v1/admin/invitations/accept', acceptData);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Invalid or expired invitation token');
    });

    it('should fail with weak password', async () => {
      const inviteToken = `test-invite-token-${Date.now()}`;
      const invitationEmail = `newuser-weak-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);

      await db.insert(invitations).values({
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role: 'scientist',
        password: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const acceptData = {
        token: inviteToken,
        password: 'weak',
      };

      const response = await apiHelper.post('/api/v1/admin/invitations/accept', acceptData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('password');
    });

    it('should fail if invitation already accepted', async () => {
      const inviteToken = `test-invite-token-${Date.now()}`;
      const invitationEmail = `newuser-accepted-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);

      await db.insert(invitations).values({
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role: 'scientist',
        password: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Accept invitation first time
      await apiHelper.post('/api/v1/admin/invitations/accept', {
        token: inviteToken,
        password: 'NewSecurePass123!',
      });

      // Try to accept again
      const response = await apiHelper.post('/api/v1/admin/invitations/accept', {
        token: inviteToken,
        password: 'AnotherPass123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been accepted');
    });

    it('should fail if invitation expired', async () => {
      // Create expired invitation
      const expiredToken = `expired-token-${Date.now()}`;
      const expiredEmail = `expired-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);

      await db.insert(invitations).values({
        first_name: 'Expired',
        last_name: 'User',
        email: expiredEmail,
        invite_token: expiredToken,
        status: 'pending',
        assigned_role: 'scientist',
        password: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() - 1000), // Already expired
      });

      const response = await apiHelper.post('/api/v1/admin/invitations/accept', {
        token: expiredToken,
        password: 'NewSecurePass123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('expired');
    });

    it('should not require authentication (public endpoint)', async () => {
      const inviteToken = `test-invite-token-${Date.now()}`;
      const invitationEmail = `public-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);

      await db.insert(invitations).values({
        first_name: 'Public',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role: 'scientist',
        password: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const acceptData = {
        token: inviteToken,
        password: 'NewSecurePass123!',
      };

      const response = await apiHelper.post('/api/v1/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
    });
  });

  describe('Email Sending - Real Test', () => {
    it('should send invitation email to harshalpatilself@gmail.com', async () => {
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: 'harshalpatilself@gmail.com',
        assigned_role: 'admin',
      };

      const response = await apiHelper.post(
        '/api/v1/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('harshalpatilself@gmail.com');
      
      // Log the invitation details for manual verification
      console.log('\n=== INVITATION EMAIL TEST ===');
      console.log('Email should be sent to: harshalpatilself@gmail.com');
      console.log('Invitation created with ID:', response.body.data.invitation_id);
      console.log('Status:', response.body.data.status);
      console.log('Check your email inbox for the invitation!');
      console.log('============================\n');
    }, 30000); // 30 second timeout for email sending
  });
});
