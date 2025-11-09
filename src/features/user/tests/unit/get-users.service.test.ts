import GetUsersService from '../../services/get-users.service';
import { db } from '../../../../database/drizzle';
import HttpException from '../../../../utils/httpException';

jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn(),
  },
}));

describe('GetUsersService', () => {
  let getUsersService: GetUsersService;

  beforeEach(() => {
    getUsersService = new GetUsersService();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
        password: 'hashed',
        phone_number: '1234567890',
        role: 'user',
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
        name: 'User 2',
        email: 'user2@example.com',
        password: 'hashed',
        phone_number: '0987654321',
        role: 'admin',
        created_by: 1,
        created_at: new Date(),
        updated_by: null,
        updated_at: new Date(),
        is_deleted: false,
        deleted_by: null,
        deleted_at: null,
      },
    ];

    it('should return all non-deleted users', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      });
      (db.select as jest.Mock) = mockSelect;

      const result = await getUsersService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      (db.select as jest.Mock) = mockSelect;

      const result = await getUsersService.getAllUsers();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(error),
        }),
      });
      (db.select as jest.Mock) = mockSelect;

      await expect(getUsersService.getAllUsers()).rejects.toThrow(
        new HttpException(500, `Error fetching users: ${error.message}`)
      );
    });
  });
});
