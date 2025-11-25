/**
 * Password Utilities
 * Centralized password hashing with consistent cost factor
 */

import bcrypt from 'bcrypt';

/** Bcrypt cost factor - higher = more secure but slower */
const BCRYPT_COST_FACTOR = 12;

/**
 * Hash a password using bcrypt with standardized cost factor
 * @param password - Plain text password to hash
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare a plain text password with a hash
 * @param password - Plain text password
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
