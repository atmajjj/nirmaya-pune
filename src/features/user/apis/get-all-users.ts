/**
 * GET /api/users
 * Get all users with pagination (Admin only)
 */

import { Router, Response } from 'express';
import { eq, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { sanitizeUsers } from '../../../utils/sanitizeUser';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';
import { IUser } from '../shared/interface';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query params validation
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

interface PaginatedUsers {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
}

async function getAllUsers(page: number, limit: number): Promise<PaginatedUsers> {
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.is_deleted, false));
  
  const total = countResult?.total ?? 0;

  // Get paginated users
  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.is_deleted, false))
    .limit(limit)
    .offset(offset)
    .orderBy(sql`${users.created_at} DESC`);

  return {
    users: allUsers as IUser[],
    total,
    page,
    limit,
  };
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  // Parse and validate pagination params
  const { page, limit } = paginationSchema.parse(req.query);
  
  const result = await getAllUsers(page, limit);
  const sanitizedUsers = sanitizeUsers(result.users);

  ResponseFormatter.paginated(
    res,
    sanitizedUsers,
    { page: result.page, limit: result.limit, total: result.total },
    'Users retrieved successfully'
  );
});

const router = Router();
router.get('/', requireAuth, requireRole('admin'), handler);

export default router;
