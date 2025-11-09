/**
 * Admin User Creation Script
 *
 * This script creates an admin user with the following credentials:
 * - Email: harshal@gmail.com
 * - Password: 12345678
 * - Name: Harshal Admin
 * - Role: admin
 *
 * Usage:
 * - npm run create-admin
 * - or: npx tsx scripts/create-admin.ts
 *
 * The script will:
 * 1. Check if an admin user with this email already exists
 * 2. If not, create the admin user with hashed password
 * 3. If exists, display the existing user details
 *
 * Environment Requirements:
 * - DATABASE_URL environment variable must be set
 * - Database must be running and accessible
 */

import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { db, closeDatabase } from '../src/database/drizzle';
import { users } from '../src/features/user/user.schema';
import { findUserByEmail } from '../src/features/user/user.queries';
import { logger } from '../src/utils/logger';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'harshal@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Harshal Admin';

async function createAdminUser() {
  try {
    logger.info('Starting admin user creation script...');

    // Check if admin user already exists
    const existingUser = await findUserByEmail(ADMIN_EMAIL);

    if (existingUser) {
      logger.info(`Admin user with email ${ADMIN_EMAIL} already exists`);
      logger.info(`User details: ID=${existingUser.id}, Name=${existingUser.name}, Role=${existingUser.role}`);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const adminData = {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin' as const,
      created_by: 1, // System user
    };

    const [newUser] = await db.insert(users).values(adminData).returning();

    logger.info('Admin user created successfully!');
    logger.info(`User ID: ${newUser.id}`);
    logger.info(`Name: ${newUser.name}`);
    logger.info(`Email: ${newUser.email}`);
    logger.info(`Role: ${newUser.role}`);
    logger.info(`Created at: ${newUser.created_at}`);

  } catch (error) {
    logger.error(`Error creating admin user: ${error}`);
    throw error;
  } finally {
    // Close database connection
    await closeDatabase();
    logger.info('Database connection closed');
  }
}

// Run the script
createAdminUser()
  .then(() => {
    logger.info('Admin creation script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Admin creation script failed: ${error}`);
    process.exit(1);
  });