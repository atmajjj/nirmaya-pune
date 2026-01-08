# 🔧 Supabase S3 Configuration Guide

## Problem Diagnosis

The S3 upload is failing with error: `getaddrinfo ENOTFOUND kljduujfchypnlxtsnsn.supabase.co`

This means **the DNS lookup for your Supabase project URL is failing**.

## Root Causes

1. **Project ID is incorrect** - The URL has a typo or wrong project ID
2. **Project doesn't exist** - The Supabase project was deleted or never created
3. **Network issue** - DNS resolution is blocked (less likely)

## ✅ Steps to Fix

### Step 1: Verify Your Supabase Project URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one if needed)
3. In the top URL bar, note your **Project Reference ID**
   - Example: If URL is `https://supabase.com/dashboard/project/abcdefghijklmnop`
   - Your project ID is: `abcdefghijklmnop`

### Step 2: Get the Correct S3 Endpoint

Your S3 endpoint should be:
```
https://<YOUR-PROJECT-ID>.supabase.co/storage/v1/s3
```

**Example:**
```
https://abcdefghijklmnop.supabase.co/storage/v1/s3
```

### Step 3: Get S3 Access Keys

1. In Supabase Dashboard → **Settings** → **Storage**
2. Scroll to **S3 Access Keys** section
3. Click **Generate new credentials** (if not already generated)
4. Copy:
   - **Access Key ID** → This is your `AWS_ACCESS_KEY`
   - **Secret Access Key** → This is your `AWS_SECRET_KEY`

### Step 4: Create the Storage Bucket

1. In Supabase Dashboard → **Storage** → **Buckets**
2. Click **"New Bucket"**
3. Set:
   - **Name:** `nirmaya-uploads`
   - **Public bucket:** Leave unchecked (private)
   - **File size limit:** Leave default or set as needed
4. Click **Create Bucket**

### Step 5: Update `.env.dev`

Update your `.env.dev` file with the **correct** values:

```env
AWS_ACCESS_KEY=<your-actual-access-key-from-step-3>
AWS_SECRET_KEY=<your-actual-secret-key-from-step-3>
AWS_REGION=ap-southeast-2
AWS_ENDPOINT=https://<your-actual-project-id>.supabase.co/storage/v1/s3
AWS_BUCKET_NAME=nirmaya-uploads
```

### Step 6: Test the Configuration

After updating `.env.dev`, run:

```bash
npm run test:s3
```

This will:
- ✅ Test if the S3 endpoint is reachable
- ✅ Verify your credentials are valid
- ✅ Check if the bucket exists
- ✅ Try uploading a test file

## Expected Output (Success)

```
🔍 Testing Supabase S3 Connection...

Configuration:
  Endpoint: https://abcdefghijklmnop.supabase.co/storage/v1/s3
  Region: ap-southeast-2
  Bucket: nirmaya-uploads
  Access Key: 22c8c181...

✓ Test 1: Checking S3 connectivity...
  ✅ Connected to S3 successfully
  Found 1 buckets
  Available buckets:
    - nirmaya-uploads

✓ Test 2: Checking target bucket...
  ✅ Bucket "nirmaya-uploads" exists and is accessible

✓ Test 3: Testing file upload...
  ✅ Successfully uploaded test file: test/connection-test-1234567890.txt

✅ ALL TESTS PASSED! S3 storage is properly configured.

🎉 S3 connection is working correctly!
```

## Common Issues

### Issue: "NoSuchBucket"
**Solution:** Create the `nirmaya-uploads` bucket in Supabase Storage (Step 4)

### Issue: "InvalidAccessKeyId"
**Solution:** Your access key is wrong. Regenerate credentials in Supabase (Step 3)

### Issue: "SignatureDoesNotMatch"
**Solution:** Your secret key is wrong. Regenerate credentials in Supabase (Step 3)

### Issue: "getaddrinfo ENOTFOUND"
**Solution:** Your project URL is wrong. Verify the project ID (Step 1 & 2)

### Issue: "Deserialization error"
**Solution:** The endpoint URL format is incorrect. Should be `https://PROJECT_ID.supabase.co/storage/v1/s3`

## 📚 Documentation

- [Supabase Storage Overview](https://supabase.com/docs/guides/storage)
- [S3 Access Keys Setup](https://supabase.com/docs/guides/storage/s3/authentication)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

## ⚠️ Current Status

- ❌ S3 endpoint is NOT reachable (DNS error)
- ⚠️ Backend is using local file storage fallback
- 🔧 **ACTION NEEDED:** Update `.env.dev` with correct Supabase credentials

## Next Steps

1. Follow Steps 1-5 above to get correct credentials
2. Update `.env.dev` file
3. Run `npm run test:s3` to verify
4. Once test passes, restart backend with `npm run dev`
5. Test uploading a CSV file through the frontend
