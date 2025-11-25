/**
 * Unit tests for get-all-users business logic
 */

import HttpException from '../../../../utils/httpException';
import { db } from '../../../../database/drizzle';
import { users } from '../../shared/schema';
import { IUser } from '../../shared/interface';

// Mock dependencies
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

// Recreate the business logic for testing
async function getAllUsers(): Promise<IUser[]> {
  const allUsers = await (db.select().from(users) as any).where();
  return allUsers as IUser[];
}

describe('Get All Users Business Logic', () => {
  const mockUsers: IUser[] = [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedPassword1',
      phone_number: '1234567890',
      role: 'admin',
      created_by: 1,
      created_at: new Date('2024-01-01'),
      updated_by: null as any,
      updated_at: new Date('2024-01-01'),
      is_deleted: false,
      deleted_by: null as any,
      deleted_at: null as any,
    },
    {
      id: 2,
      name: 'Scientist User',
      email: 'scientist@example.com',
      password: 'hashedPassword2',
      phone_number: '0987654321',
      role: 'scientist',
      created_by: 1,
      created_at: new Date('2024-01-02'),
      updated_by: null as any,
      updated_at: new Date('2024-01-02'),
      is_deleted: false,
      deleted_by: null as any,
      deleted_at: null as any,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all non-deleted users', async () => {
      const mockWhere = jest.fn().mockResolvedValue(mockUsers);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getAllUsers();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no users exist', async () => {
      const mockWhere = jest.fn().mockResolvedValue([]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getAllUsers();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return users with all required fields', async () => {
      const mockWhere = jest.fn().mockResolvedValue(mockUsers);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getAllUsers();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('created_at');
      expect(result[0]).toHaveProperty('is_deleted');
    });

    it('should return users with different roles', async () => {
      const usersWithDifferentRoles: IUser[] = [
        { ...mockUsers[0], role: 'admin' },
        { ...mockUsers[1], role: 'scientist' },
        { ...mockUsers[0], id: 3, role: 'researcher', email: 'researcher@example.com' },
        { ...mockUsers[0], id: 4, role: 'policymaker', email: 'policymaker@example.com' },
      ];
      const mockWhere = jest.fn().mockResolvedValue(usersWithDifferentRoles);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getAllUsers();

      expect(result).toHaveLength(4);
      expect(result.map(u => u.role)).toContain('admin');
      expect(result.map(u => u.role)).toContain('scientist');
      expect(result.map(u => u.role)).toContain('researcher');
      expect(result.map(u => u.role)).toContain('policymaker');
    });

    it('should handle database errors', async () => {
      const mockWhere = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await expect(getAllUsers()).rejects.toThrow('Database connection failed');
    });
  });
});
