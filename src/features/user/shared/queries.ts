import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { users, type User, type NewUser } from './schema';

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

/**
 * Create a new user
 * Shared query used across services
 */
export const createUser = async (userData: NewUser): Promise<User> => {
  const [newUser] = await db
    .insert(users)
    .values(userData)
    .returning();

  return newUser;
};

/**
 * Update user by ID
 * Shared query used across services
 */
export const updateUserById = async (
  id: number, 
  data: Partial<Omit<User, 'id'>>
): Promise<User | undefined> => {
  const [updatedUser] = await db
    .update(users)
    .set({ ...data, updated_at: new Date() })
    .where(eq(users.id, id))
    .returning();

  return updatedUser;
};
