import { db } from '../src/database/drizzle';
import { uploads } from '../src/features/upload/shared/schema';
import { eq, desc } from 'drizzle-orm';

async function checkFailedUploads() {
  try {
    const failedUploads = await db
      .select({
        id: uploads.id,
        filename: uploads.filename,
        status: uploads.status,
        error_message: uploads.error_message,
        created_at: uploads.created_at,
      })
      .from(uploads)
      .where(eq(uploads.status, 'failed'))
      .orderBy(desc(uploads.created_at))
      .limit(5);

    console.log('\n📋 Recent Failed Uploads:');
    console.log('==========================\n');

    if (failedUploads.length === 0) {
      console.log('No failed uploads found.');
    } else {
      failedUploads.forEach((upload, index) => {
        console.log(`${index + 1}. Upload ID: ${upload.id}`);
        console.log(`   Filename: ${upload.filename}`);
        console.log(`   Status: ${upload.status}`);
        console.log(`   Error: ${upload.error_message || 'No error message'}`);
        console.log(`   Date: ${upload.created_at}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking uploads:', error);
    process.exit(1);
  }
}

checkFailedUploads();
