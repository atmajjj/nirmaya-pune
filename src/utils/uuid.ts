/**
 * UUID Generator
 * Uses native crypto.randomUUID() for UUID v4 generation
 */
import crypto from 'crypto';

/**
 * Generate a UUID v4
 */
export const v4 = (): string => crypto.randomUUID();
