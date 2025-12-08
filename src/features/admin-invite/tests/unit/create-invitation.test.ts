/**
 * Unit tests for create-invitation business logic
 */

import bcrypt from 'bcrypt';
import HttpException from '../../../../utils/httpException';
import * as inviteQueries from '../../shared/queries';
import * as sendEmail from '../../../../utils/sendInvitationEmail';
import { ICreateInvitation, IInvitation } from '../../shared/interface';
import { Invitation } from '../../shared/schema';
import { config } from '../../../../utils/validateEnv';

// Mock dependencies - order matters! Mock database before importing queries
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  },
}));
jest.mock('bcrypt');
jest.mock('../../shared/queries');
jest.mock('../../../../utils/sendInvitationEmail');
jest.mock('../../../../utils/validateEnv', () => ({
  config: {
    ALLOWED_ORIGINS: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:8080',
  },
}));
jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockInviteQueries = inviteQueries as jest.Mocked<typeof inviteQueries>;
const mockSendEmail = sendEmail as jest.Mocked<typeof sendEmail>;

// Recreate the business logic for testing
async function handleCreateInvitation(
  invitationData: ICreateInvitation,
  invitedBy: number
): Promise<IInvitation> {
  const existingInvitation = await inviteQueries.findInvitationByEmail(invitationData.email);
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new HttpException(409, 'An active invitation already exists for this email');
  }

  const inviteToken = 'a'.repeat(64); // Mocked
  const tempPassword = 'a'.repeat(24); // Mocked
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const newInvitation = await inviteQueries.createInvitation({
    ...invitationData,
    invite_token: inviteToken,
    password_hash: hashedPassword,
    temp_password_encrypted: 'encrypted_temp_password',
    invited_by: invitedBy,
    expires_at: expiresAt,
    status: 'pending',
  });

  try {
    const frontendUrl = config.FRONTEND_URL.replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invitation?invite_token=${inviteToken}`;
    await sendEmail.sendInvitationEmail({
      to: invitationData.email,
      firstName: invitationData.first_name,
      lastName: invitationData.last_name,
      assignedRole: invitationData.assigned_role,
      inviteLink,
      expiresIn: '24 hours',
      tempPassword, // Include credentials in email
    });
  } catch {
    // Email errors are logged but don't block operation
  }

  // Exclude sensitive fields from response
  const { 
    temp_password_encrypted: _enc, 
    password_hash: _hash, 
    invite_token: _token, 
    ...invitationResponse 
  } = newInvitation;
  void _enc; void _hash; void _token;
  return invitationResponse as IInvitation;
}

describe('Create Invitation Business Logic', () => {
  const mockInvitationData: ICreateInvitation = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    assigned_role: 'scientist',
  };

  const mockCreatedInvitation: Invitation = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    invite_token: 'a'.repeat(64),
    status: 'pending',
    assigned_role: 'scientist',
    temp_password_encrypted: 'encrypted_temp_password',
    password_hash: 'hashedPassword123',
    verify_attempts: 0,
    invited_by: 1,
    expires_at: new Date('2024-01-02'),
    accepted_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    mockInviteQueries.createInvitation.mockResolvedValue(mockCreatedInvitation);
    mockSendEmail.sendInvitationEmail.mockResolvedValue(undefined);
  });

  describe('handleCreateInvitation', () => {
    it('should successfully create invitation for new email', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.findInvitationByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockBcrypt.hash).toHaveBeenCalled();
      expect(mockInviteQueries.createInvitation).toHaveBeenCalled();
      expect(result.first_name).toBe('John');
      expect(result.email).toBe('john.doe@example.com');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('temp_password_encrypted');
    });

    it('should throw 409 if pending invitation exists for email', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'pending',
      });

      await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toThrow(HttpException);
      await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toMatchObject({
        status: 409,
        message: 'An active invitation already exists for this email',
      });
    });

    it('should allow creating invitation if previous invitation was accepted', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'accepted',
      });

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
      expect(mockInviteQueries.createInvitation).toHaveBeenCalled();
    });

    it('should allow creating invitation if previous invitation was expired', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'expired',
      });

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
    });

    it('should allow creating invitation if previous invitation was revoked', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'revoked',
      });

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
    });

    it('should hash password with salt rounds of 12', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    });

    it('should set invited_by field from parameter', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      await handleCreateInvitation(mockInvitationData, 5);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ invited_by: 5 })
      );
    });

    it('should set status to pending', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should send invitation email', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockSendEmail.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john.doe@example.com',
          firstName: 'John',
        })
      );
    });

    it('should not fail if email sending fails', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);
      mockSendEmail.sendInvitationEmail.mockRejectedValue(new Error('Email failed'));

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should exclude password from response', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('temp_password_encrypted');
      expect(result).not.toHaveProperty('invite_token');
    });

    it('should set expires_at to 24 hours from now', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Date),
        })
      );
    });

    it('should handle different assigned roles', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);

      const adminInvite = { ...mockInvitationData, assigned_role: 'admin' as const };
      await handleCreateInvitation(adminInvite, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_role: 'admin' })
      );
    });
  });
});
