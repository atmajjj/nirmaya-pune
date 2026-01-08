/**
 * Test S3/Supabase Storage Connection
 * 
 * This script tests the S3 configuration and provides diagnostic information.
 * Run with: npm run test:s3 or ts-node scripts/test-s3-connection.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from '../src/utils/validateEnv';
import { logger } from '../src/utils/logger';

async function testS3Connection() {
  console.log('\n🔍 Testing Supabase S3 Connection...\n');
  console.log('Configuration:');
  console.log(`  Endpoint: ${config.AWS_ENDPOINT}`);
  console.log(`  Region: ${config.AWS_REGION}`);
  console.log(`  Bucket: ${config.AWS_BUCKET_NAME}`);
  console.log(`  Access Key: ${config.AWS_ACCESS_KEY.substring(0, 8)}...`);
  console.log('');

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY,
      secretAccessKey: config.AWS_SECRET_KEY,
    },
    region: config.AWS_REGION,
    endpoint: config.AWS_ENDPOINT,
    forcePathStyle: true,
  });

  // Test 1: Check if we can connect to S3
  console.log('✓ Test 1: Checking S3 connectivity...');
  try {
    const listCommand = new ListBucketsCommand({});
    const result = await s3Client.send(listCommand);
    console.log('  ✅ Connected to S3 successfully');
    console.log(`  Found ${result.Buckets?.length || 0} buckets`);
    if (result.Buckets && result.Buckets.length > 0) {
      console.log('  Available buckets:');
      result.Buckets.forEach(bucket => {
        console.log(`    - ${bucket.Name}`);
      });
    }
  } catch (error) {
    console.log('  ❌ Failed to connect to S3');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error) {
      if (error.message.includes('Deserialization') || error.message.includes('char')) {
        console.log('\n⚠️  DIAGNOSIS: XML Deserialization Error');
        console.log('  This usually means:');
        console.log('  1. The endpoint URL is incorrect (should be: https://PROJECT_ID.supabase.co/storage/v1/s3)');
        console.log('  2. The S3 service is returning HTML instead of XML (authentication issue)');
        console.log('  3. The credentials are invalid or expired\n');
      }
      if (error.message.includes('InvalidAccessKeyId')) {
        console.log('\n⚠️  DIAGNOSIS: Invalid Access Key');
        console.log('  Your AWS_ACCESS_KEY is incorrect. Get it from Supabase dashboard:\n');
        console.log('  Supabase Dashboard → Settings → Storage → S3 Access Keys\n');
      }
      if (error.message.includes('SignatureDoesNotMatch')) {
        console.log('\n⚠️  DIAGNOSIS: Invalid Secret Key');
        console.log('  Your AWS_SECRET_KEY is incorrect. Get it from Supabase dashboard:\n');
        console.log('  Supabase Dashboard → Settings → Storage → S3 Access Keys\n');
      }
    }
    return false;
  }

  // Test 2: Check if target bucket exists
  console.log('\n✓ Test 2: Checking target bucket...');
  try {
    const headCommand = new HeadBucketCommand({
      Bucket: config.AWS_BUCKET_NAME,
    });
    await s3Client.send(headCommand);
    console.log(`  ✅ Bucket "${config.AWS_BUCKET_NAME}" exists and is accessible`);
  } catch (error) {
    console.log(`  ❌ Bucket "${config.AWS_BUCKET_NAME}" is not accessible`);
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error && error.message.includes('NoSuchBucket')) {
      console.log('\n⚠️  DIAGNOSIS: Bucket Does Not Exist');
      console.log('  Please create the bucket in Supabase:');
      console.log('  1. Go to Supabase Dashboard → Storage');
      console.log(`  2. Click "New Bucket"`);
      console.log(`  3. Name: ${config.AWS_BUCKET_NAME}`);
      console.log('  4. Set appropriate access policies (public or private)\n');
    }
    return false;
  }

  // Test 3: Try uploading a test file
  console.log('\n✓ Test 3: Testing file upload...');
  try {
    const testContent = Buffer.from('This is a test file from Nirmaya backend');
    const testKey = `test/connection-test-${Date.now()}.txt`;
    
    const putCommand = new PutObjectCommand({
      Bucket: config.AWS_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    
    await s3Client.send(putCommand);
    console.log(`  ✅ Successfully uploaded test file: ${testKey}`);
    console.log('\n✅ ALL TESTS PASSED! S3 storage is properly configured.\n');
    return true;
  } catch (error) {
    console.log('  ❌ Failed to upload test file');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Run the test
testS3Connection()
  .then((success) => {
    if (success) {
      console.log('🎉 S3 connection is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ S3 connection test failed. Please fix the issues above.');
      console.log('\n📚 Helpful Resources:');
      console.log('  - Supabase Storage Docs: https://supabase.com/docs/guides/storage');
      console.log('  - S3 Access Keys: https://supabase.com/docs/guides/storage/s3/authentication');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error during test:', error);
    process.exit(1);
  });
