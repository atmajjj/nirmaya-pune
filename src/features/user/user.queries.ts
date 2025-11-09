import { eq, and } from 'drizzle-orm';
import { db } from '../../database/drizzle';
import { users, type User } from './user.schema';

/**
 * Find user by ID (excluding deleted users)
 * Shared query used across multiple services
 */
export const findUserById = async (id: number): Promise<User | undefined> => {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.is_deleted, false)))
    .limit(1);

  return user;
};

/**
 * Find user by email (excluding deleted users)
 * Shared query used across multiple services
 */
export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.is_deleted, false)))
    .limit(1);

  return user;
};
