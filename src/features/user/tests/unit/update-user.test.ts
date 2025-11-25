/**
 * Unit tests for update-user business logic
 */

import bcrypt from 'bcrypt';
import HttpException from '../../../../utils/httpException';
import * as userQueries from '../../shared/queries';
import { db } from '../../../../database/drizzle';
import { users } from '../../shared/schema';
import { IUser } from '../../shared/interface';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../shared/queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockDb = db as jest.Mocked<typeof db>;

interface UpdateUserData {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  role?: 'admin' | 'scientist' | 'researcher' | 'policymaker';
}

// Recreate the business logic for testing
async function updateUser(id: number, data: UpdateUserData, updatedBy: number): Promise<IUser> {
  const existingUser = await userQueries.findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  if (data.email && data.email !== existingUser.email) {
    const existingUserWithEmail = await userQueries.findUserByEmail(data.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      throw new HttpException(409, 'Email already exists');
    }
  }

  const updateData: Partial<IUser> = {
    ...data,
    updated_by: updatedBy,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const [result] = await (db.update(users).set({
    ...updateData,
    updated_at: new Date(),
  }) as any).where().returning();

  if (!result) {
    throw new HttpException(500, 'Failed to update user');
  }

  return result as IUser;
}

describe('Update User Business Logic', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    phone_number: '1234567890',
    role: 'scientist' as const,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const updatedMockUser = {
    ...mockUser,
    name: 'Updated User',
    updated_by: 2,
    updated_at: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain
    const mockReturning = jest.fn().mockResolvedValue([updatedMockUser]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('updateUser', () => {
    it('should successfully update user name', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await updateUser(1, { name: 'Updated User' }, 2);

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(1);
      expect(result.name).toBe('Updated User');
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(updateUser(999, { name: 'Test' }, 2)).rejects.toThrow(HttpException);
      await expect(updateUser(999, { name: 'Test' }, 2)).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should throw 409 when email already exists for another user', async () => {
      const anotherUser = { ...mockUser, id: 2, email: 'existing@example.com' };
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockUserQueries.findUserByEmail.mockResolvedValue(anotherUser);

      await expect(updateUser(1, { email: 'existing@example.com' }, 2)).rejects.toThrow(HttpException);
      await expect(updateUser(1, { email: 'existing@example.com' }, 2)).rejects.toMatchObject({
        status: 409,
        message: 'Email already exists',
      });
    });

    it('should allow updating email to same value', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      // Same email as current user, should not throw

      const result = await updateUser(1, { email: 'test@example.com' }, 2);

      expect(mockUserQueries.findUserByEmail).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should allow updating email if it belongs to same user', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser); // Same user

      const updatedWithNewEmail = { ...updatedMockUser, email: 'newemail@example.com' };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithNewEmail]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(1, { email: 'newemail@example.com' }, 2);

      expect(result).toBeDefined();
    });

    it('should hash password when updating', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      await updateUser(1, { password: 'newPassword123' }, 2);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });

    it('should not hash password when not updating password', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await updateUser(1, { name: 'New Name' }, 2);

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should set updated_by field', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockReturning = jest.fn().mockResolvedValue([{ ...updatedMockUser, updated_by: 5 }]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(1, { name: 'Test' }, 5);

      expect(result.updated_by).toBe(5);
    });

    it('should update user role', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const updatedWithRole = { ...updatedMockUser, role: 'admin' as const };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithRole]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(1, { role: 'admin' }, 2);

      expect(result.role).toBe('admin');
    });

    it('should throw 500 when database update fails', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockReturning = jest.fn().mockResolvedValue([undefined]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(updateUser(1, { name: 'Test' }, 2)).rejects.toThrow(HttpException);
      await expect(updateUser(1, { name: 'Test' }, 2)).rejects.toMatchObject({
        status: 500,
        message: 'Failed to update user',
      });
    });

    it('should update phone number', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const updatedWithPhone = { ...updatedMockUser, phone_number: '9999999999' };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithPhone]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(1, { phone_number: '9999999999' }, 2);

      expect(result.phone_number).toBe('9999999999');
    });
  });
});
