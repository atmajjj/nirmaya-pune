# AI Report Generation - Deployment Fix Guide

## Issue
AI report generation works on localhost but fails on deployed link with HTTP 500 error.

## Root Causes Identified

### 1. Missing GEMINI_API_KEY Environment Variable
The Gemini API key is not configured in the production environment (Render.com), causing the Gemini service to fail initialization.

### 2. Puppeteer/Chromium Not Installed
Puppeteer requires Chromium browser to be installed on the server. The default build command doesn't install it.

## Solutions Applied

### ✅ 1. Updated render.yaml Configuration

**Changes Made:**
- Added `GEMINI_API_KEY` to environment variables
- Modified build command to install Chrome/Chromium for Puppeteer

```yaml
# Added to envVars section:
- key: GEMINI_API_KEY
  sync: false

# Updated buildCommand:
buildCommand: npm ci && npx puppeteer browsers install chrome && npm run build
```

### ✅ 2. Enhanced PDF Generator Service

**File:** `src/features/ai-reports/services/pdf-generator.service.ts`

**Improvements:**
- Added production-ready Puppeteer launch arguments
- Support for custom Chromium executable path via `PUPPETEER_EXECUTABLE_PATH`
- Better error logging with environment context
- Additional flags for better stability on limited resources

### ✅ 3. Improved Gemini Service Error Handling

**File:** `src/features/ai-reports/services/gemini.service.ts`

**Improvements:**
- Better error messages when API key is missing
- Added initialization logging
- Clear indication of configuration issues

### ✅ 4. Updated .env.example

Added `GEMINI_API_KEY` to the example environment file for documentation.

## Deployment Steps

### Step 1: Configure Environment Variables on Render.com

1. Go to your Render.com dashboard
2. Select your `nirmaya-backend` service
3. Go to **Environment** section
4. Add the following environment variable:

```
GEMINI_API_KEY = your-actual-gemini-api-key-here
```

**How to get a Gemini API Key:**
- Visit: https://makersuite.google.com/app/apikey
- Sign in with your Google account
- Create a new API key
- Copy and paste it into Render

### Step 2: Deploy Changes

After updating the code:

```bash
# Commit changes
git add .
git commit -m "Fix AI report generation for production deployment"
git push origin main
```

Render will automatically:
1. Detect the changes
2. Run the new build command (including Chrome installation)
3. Restart the service with new environment variables

### Step 3: Verify Deployment

1. Wait for deployment to complete (check Render dashboard)
2. Check deployment logs for:
   - ✅ Chrome installation success
   - ✅ "Gemini service initialized successfully"
   - ❌ Any errors related to Puppeteer or Gemini

3. Test the AI report generation from your frontend

## Testing

### Test Locally First
```bash
# Make sure you have GEMINI_API_KEY in your .env.dev
npm run dev

# Test the endpoint
curl -X POST http://localhost:8000/api/nirmaya-engine/ai-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uploadId": 1}'
```

### Test on Production
After deployment, test from your frontend or use the deployed URL.

## Common Issues & Troubleshooting

### Issue: "GEMINI_API_KEY is not configured"
**Solution:** Make sure you added the environment variable in Render dashboard and redeployed.

### Issue: Puppeteer fails to launch browser
**Solutions:**
1. Verify Chrome was installed during build (check build logs)
2. If using a different hosting provider, you may need to set `PUPPETEER_EXECUTABLE_PATH`
3. Consider memory limits - Render free tier has 512MB RAM, PDF generation can be memory-intensive

### Issue: PDF generation timeout
**Solutions:**
1. Increase timeout in pdf-generator.service.ts
2. Upgrade Render plan for more resources
3. Reduce the complexity of the HTML template

### Issue: Rate limit errors from Gemini API
**Solution:** The service has fallback to static reports. Check if you exceeded Gemini's free tier quota:
- gemini-2.0-flash: 50 requests per day (free tier)

## Alternative Solutions (If Issues Persist)

### Option 1: Use External PDF Service
Instead of Puppeteer, use a cloud-based PDF generation service:
- PDFShift
- HTML2PDF API
- DocRaptor

### Option 2: Use Different Hosting
If Puppeteer continues to fail on Render:
- Try Railway.app (better support for Puppeteer)
- Use AWS Lambda with Puppeteer layer
- Use Google Cloud Run with custom Docker image

### Option 3: Pre-install Chromium in Docker
Create a custom Dockerfile with Chromium pre-installed:

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ... rest of Dockerfile
```

## Monitoring

After deployment, monitor:
1. Error logs in Render dashboard
2. Response times for report generation
3. Memory usage (might need to upgrade plan)
4. Gemini API quota usage

## Cost Considerations

- **Gemini API:** Free tier with rate limits
- **Render:** Free tier works but may be slow for PDF generation
- **Puppeteer:** Memory-intensive, consider upgrading if needed

## Support

If issues persist after following this guide:
1. Check Render logs for specific error messages
2. Verify all environment variables are set
3. Test Gemini API key directly: https://ai.google.dev/tutorials/rest_quickstart
4. Check Puppeteer installation: `npx puppeteer browsers list`

---
**Last Updated:** January 31, 2026
**Status:** ✅ Ready for deployment
