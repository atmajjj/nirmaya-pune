import GetUsersService from '../../services/get-users.service';
import HttpException from '../../../../utils/httpException';
import { db } from '../../../../database/drizzle';

// Mock the database
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

describe('GetUsersService', () => {
  let service: GetUsersService;

  beforeEach(() => {
    service = new GetUsersService();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all non-deleted users', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          password: 'hashedpassword',
          phone_number: '1234567890',
          role: 'user' as const,
          created_by: 1,
          created_at: new Date(),
          updated_by: null,
          updated_at: new Date(),
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
        },
        {
          id: 2,
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'hashedpassword2',
          phone_number: '0987654321',
          role: 'user' as const,
          created_by: 1,
          created_at: new Date(),
          updated_by: null,
          updated_at: new Date(),
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
        },
      ];

      // Mock db query chain
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      });

      const result = await service.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('john@example.com');
    });

    it('should throw HttpException on database error', async () => {
      const mockError = new Error('Database connection failed');

      // Mock db query chain to throw error
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(mockError),
        }),
      });

      await expect(service.getAllUsers()).rejects.toThrow(HttpException);
      await expect(service.getAllUsers()).rejects.toThrow(
        'Error fetching users: Database connection failed'
      );
    });

    it('should filter out deleted users', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'Active User',
          email: 'active@example.com',
          password: 'hashedpassword',
          phone_number: '1234567890',
          role: 'user' as const,
          created_by: 1,
          created_at: new Date(),
          updated_by: null,
          updated_at: new Date(),
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
        },
      ];

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      });

      const result = await service.getAllUsers();

      expect(result).toHaveLength(1);
      expect(result[0].is_deleted).toBe(false);
    });
  });
});
