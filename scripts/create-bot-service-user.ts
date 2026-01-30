import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { users } from '../src/features/user/shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

dotenv.config();

async function createBotServiceUser() {
  console.log('🤖 Setting up Telegram Bot Service User...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    // Check if user with ID 0 exists
    console.log('Checking for existing service user...');
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, 0))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Service user already exists:');
      console.log('   ID:', existingUser[0].id);
      console.log('   Name:', existingUser[0].name);
      console.log('   Email:', existingUser[0].email);
      console.log('   Role:', existingUser[0].role);
      console.log('\n✅ Bot is ready to use!');
      await client.end();
      return;
    }

    // Create password hash (won't be used, but required by schema)
    const dummyPassword = await bcrypt.hash('telegram-bot-service-account', 10);

    // Create service user
    console.log('Creating new service user...');
    const [newUser] = await db
      .insert(users)
      .values({
        id: 0,
        name: 'Telegram Bot Service',
        email: 'telegram-bot@nirmaya.service',
        password: dummyPassword,
        role: 'scientist' as any,
        is_active: true,
        email_verified: true,
      })
      .returning();

    console.log('\n✅ Service user created successfully!');
    console.log('   ID:', newUser.id);
    console.log('   Name:', newUser.name);
    console.log('   Email:', newUser.email);
    console.log('   Role:', newUser.role);
    console.log('\n🎉 Telegram bot can now upload files!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createBotServiceUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
