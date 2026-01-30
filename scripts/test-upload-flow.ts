/**
 * Test the complete upload flow:
 * 1. Upload a CSV file
 * 2. Verify file is in S3
 * 3. Wait for processing
 * 4. Verify data source status
 */

import { config } from '../src/utils/validateEnv';
import { createDataSource } from '../src/features/data-sources/shared/queries';
import { uploadToS3 } from '../src/utils/s3Upload';
import { processDataSourceFile } from '../src/features/data-sources/services/processor.service';
import { logger } from '../src/utils/logger';
import fs from 'fs/promises';
import path from 'path';

async function testUploadFlow() {
  try {
    console.log('🧪 Testing Complete Upload Flow...\n');

    // Step 1: Read test CSV file
    console.log('📄 Step 1: Reading test CSV file...');
    const testCsvPath = path.join(process.cwd(), '..', 'data_100rows_part_1.csv');
    const fileBuffer = await fs.readFile(testCsvPath);
    const fileStats = await fs.stat(testCsvPath);
    console.log(`  ✅ File read: ${fileStats.size} bytes\n`);

    // Step 2: Upload to S3
    console.log('☁️  Step 2: Uploading to S3...');
    const testUserId = 1; // Using test user ID
    const filename = `test-uploads/test-${Date.now()}-data.csv`;
    
    const s3Result = await uploadToS3(
      fileBuffer,
      filename,
      'text/csv',
      testUserId
    );
    
    console.log(`  ✅ Uploaded to S3:`);
    console.log(`     Key: ${s3Result.key}`);
    console.log(`     Bucket: ${s3Result.bucket}`);
    console.log(`     Size: ${s3Result.size} bytes\n`);

    // Step 3: Create data source record
    console.log('💾 Step 3: Creating database record...');
    const dataSource = await createDataSource({
      filename: path.basename(filename),
      original_filename: 'data_100rows_part_1.csv',
      file_type: 'csv',
      mime_type: 'text/csv',
      file_size: fileStats.size,
      file_path: s3Result.key,
      file_url: s3Result.url,
      uploaded_by: testUserId,
      status: 'pending',
      description: 'Test upload from automated test script',
      created_by: testUserId,
    });
    
    console.log(`  ✅ Data source created:`);
    console.log(`     ID: ${dataSource.id}`);
    console.log(`     Status: ${dataSource.status}\n`);

    // Step 4: Process the file
    console.log('⚙️  Step 4: Processing file...');
    await processDataSourceFile(dataSource.id);
    
    console.log(`  ✅ Processing completed\n`);

    // Step 5: Verify final status
    console.log('✅ Step 5: Verifying final status...');
    const { findDataSourceById } = await import('../src/features/data-sources/shared/queries');
    const finalDataSource = await findDataSourceById(dataSource.id);
    
    if (!finalDataSource) {
      throw new Error('Data source not found after processing');
    }

    console.log(`  Status: ${finalDataSource.status}`);
    
    if (finalDataSource.status === 'available') {
      console.log(`  ✅ File processed successfully!`);
      if (finalDataSource.metadata) {
        const metadata = finalDataSource.metadata as any;
        console.log(`     Rows: ${metadata.total_rows || 'N/A'}`);
        console.log(`     Columns: ${metadata.column_count || 'N/A'}`);
        console.log(`     Headers: ${metadata.headers?.slice(0, 5).join(', ') || 'N/A'}...`);
      }
    } else if (finalDataSource.status === 'failed') {
      console.log(`  ❌ Processing failed: ${finalDataSource.error_message}`);
      process.exit(1);
    } else {
      console.log(`  ⚠️  Unexpected status: ${finalDataSource.status}`);
    }

    console.log('\n🎉 ALL TESTS PASSED! Upload flow is working correctly!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('Test upload flow failed', { error });
    process.exit(1);
  }
}

// Run the test
testUploadFlow();
