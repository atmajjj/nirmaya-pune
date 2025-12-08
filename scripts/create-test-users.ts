/**
 * Test Users Creation Script
 *
 * This script creates test users for the remaining roles:
 * - Scientist: scientist@nirmaya.test / scientist123
 * - Researcher: researcher@nirmaya.test / researcher123
 * - Policymaker: policymaker@nirmaya.test / policymaker123
 *
 * Usage:
 * - npx tsx scripts/create-test-users.ts
 *
 * The script will:
 * 1. Check if test users already exist
 * 2. Create missing test users with hashed passwords
 * 3. Display created user details
 *
 * Environment Requirements:
 * - DATABASE_URL environment variable must be set
 * - Database must be running and accessible
 * - Admin user should exist (created_by reference)
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import bcrypt from 'bcrypt';

// Load environment-specific .env file FIRST
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
} else if (nodeEnv === 'test') {
  dotenv.config({ path: '.env.test' });
}
dotenv.config();

/**
 * Get database URL with Docker hostname converted to localhost
 * Port mapping: dev=5434, test=5433
 */
function getDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.includes('@postgres:5432')) {
    const hostPort = nodeEnv === 'development' ? 5434 : nodeEnv === 'test' ? 5433 : 5432;
    dbUrl = dbUrl.replace('@postgres:5432', `@localhost:${hostPort}`);
  }

  return dbUrl;
}

// Import schema after env is configured
import { users } from '../src/features/user/shared/schema';

const TEST_USERS = [
  {
    name: 'Test Scientist',
    email: 'scientist@nirmaya.test',
    password: 'scientist123',
    role: 'scientist' as const,
  },
  {
    name: 'Test Researcher',
    email: 'researcher@nirmaya.test',
    password: 'researcher123',
    role: 'researcher' as const,
  },
  {
    name: 'Test Policymaker',
    email: 'policymaker@nirmaya.test',
    password: 'policymaker123',
    role: 'policymaker' as const,
  },
  {
    name: 'Test Field Technician',
    email: 'fieldtech@nirmaya.test',
    password: 'fieldtech123',
    role: 'field_technician' as const,
  },
];

async function createTestUsers() {
  const dbUrl = getDatabaseUrl();

  console.log('🚀 Starting test users creation script...');
  console.log(`📍 Environment: ${nodeEnv}`);
  console.log(`📍 Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Create database connection
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const db = drizzle(pool);

  try {
    // Test connection
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connected');

    // Get admin user ID for created_by reference
    const [adminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.is_deleted, false)))
      .limit(1);

    if (!adminUser) {
      throw new Error('Admin user not found. Please run create-admin.ts first.');
    }

    console.log(`👤 Using admin user ID ${adminUser.id} as creator reference`);

    // Process each test user
    for (const userData of TEST_USERS) {
      console.log(`\n📝 Processing ${userData.role} user...`);

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, userData.email), eq(users.is_deleted, false)))
        .limit(1);

      if (existingUser) {
        console.log(`ℹ️  ${userData.role} user with email ${userData.email} already exists`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Name: ${existingUser.name}`);
        continue;
      }

      // Hash the password
      console.log(`🔐 Hashing password for ${userData.role}...`);
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create test user
      console.log(`📝 Creating ${userData.role} user...`);

      const result = await pool.query(`
        INSERT INTO users (name, email, password, role, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, role, created_at
      `, [userData.name, userData.email, hashedPassword, userData.role, adminUser.id]);

      const newUser = result.rows[0];

      console.log(`✅ ${userData.role} user created successfully!`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Created at: ${newUser.created_at}`);
      console.log(`   Login credentials: ${userData.email} / ${userData.password}`);
    }

    console.log('\n🎉 All test users processed successfully!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createTestUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });