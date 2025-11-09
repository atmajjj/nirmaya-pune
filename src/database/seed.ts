import dotenv from 'dotenv';
dotenv.config();

import { db, closeDatabase } from './drizzle';
import { users } from '../features/user/user.schema';
import { uploads } from '../features/upload/upload.schema';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

/**
 * Seed database with initial data
 * This is useful for development and testing
 */
async function seed() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      logger.info('Database already seeded. Skipping...');
      return;
    }

    // Create test users
    logger.info('Creating test users...');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const [testUser] = await db
      .insert(users)
      .values([
        {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          phone_number: '+1234567890',
          created_by: 1,
        },
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          phone_number: '+1234567891',
          created_by: 1,
        },
      ])
      .returning();

    logger.info(`✅ Created ${2} test users`);

    // Create test uploads
    logger.info('Creating test uploads...');
    await db.insert(uploads).values([
      {
        user_id: testUser.id,
        filename: 'test-image-1.jpg',
        original_filename: 'original-test-image.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        file_path: '/uploads/test-image-1.jpg',
        file_url: 'https://example.com/uploads/test-image-1.jpg',
        status: 'completed',
        created_by: testUser.id,
      },
      {
        user_id: testUser.id,
        filename: 'document.pdf',
        original_filename: 'important-document.pdf',
        mime_type: 'application/pdf',
        file_size: 2048000,
        file_path: '/uploads/document.pdf',
        file_url: 'https://example.com/uploads/document.pdf',
        status: 'completed',
        created_by: testUser.id,
      },
    ]);

    logger.info(`✅ Created ${2} test uploads`);
    logger.info('🎉 Database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Run seed function
seed();
