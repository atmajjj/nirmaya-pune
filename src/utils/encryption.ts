/**
 * Encryption Utility for Sensitive Data
 * Uses AES-256-GCM for encrypting temporary passwords in invitations
 * 
 * Note: This is for reversible encryption (not hashing) of temp passwords
 * so they can be shown to invited users during first login
 */

import crypto from 'crypto';
import { config } from './validateEnv';
import { logger } from './logger';

/** AES-256-GCM encryption algorithm */
const ALGORITHM = 'aes-256-gcm';
/** IV length for AES-GCM */
const IV_LENGTH = 16;
/** Auth tag length for GCM */
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key derived from JWT_SECRET
 * Uses PBKDF2 to derive a proper 256-bit key
 */
function getEncryptionKey(): Buffer {
  // Derive a 256-bit key from JWT_SECRET using PBKDF2
  return crypto.pbkdf2Sync(
    config.JWT_SECRET,
    'nirmaya-invitation-salt', // Static salt for key derivation
    100000, // Iterations
    32, // Key length (256 bits)
    'sha256'
  );
}

/**
 * Encrypt a string value
 * Returns base64 encoded string containing IV + encrypted data + auth tag
 * @param plainText - The text to encrypt
 * @returns Encrypted string (base64 encoded)
 */
export function encrypt(plainText: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    logger.error('Encryption failed:', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - Base64 encoded encrypted string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extract IV, auth tag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random password
 * @param length - Password length (default: 16)
 * @returns Random password string
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*!';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  
  return passwordArray.join('');
}
