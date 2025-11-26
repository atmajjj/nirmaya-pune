/**
 * Environment Loading Utility
 * 
 * Loads the correct .env file based on NODE_ENV.
 * Must be called at the TOP of standalone scripts, BEFORE any other imports.
 * 
 * Usage:
 *   import { loadEnv } from '../src/utils/loadEnv';
 *   loadEnv();
 *   // Now safe to import other modules
 */

import dotenv from 'dotenv';

/**
 * Load environment-specific .env file
 * 
 * - development → .env.dev
 * - production → .env.prod  
 * - test → .env.test
 * - fallback → .env
 */
export function loadEnv(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const envFiles: Record<string, string> = {
    development: '.env.dev',
    production: '.env.prod',
    test: '.env.test',
  };
  
  const envFile = envFiles[nodeEnv];
  if (envFile) {
    dotenv.config({ path: envFile });
  }
  
  // Fallback to .env for any missing values
  dotenv.config();
  
  return nodeEnv;
}
