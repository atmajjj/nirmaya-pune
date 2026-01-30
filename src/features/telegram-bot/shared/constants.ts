export const BOT_COMMANDS = {
  START: '/start',
  HELP: '/help',
  UPLOAD: '/upload',
  STATUS: '/status',
  LATEST: '/latest',
} as const;

export const BOT_MESSAGES = {
  WELCOME: `🌊 *Welcome to Nirmaya Water Quality Bot!*

I can help you analyze water quality data instantly.

*How it works:*
1. Send me a CSV file with water quality measurements
2. I'll automatically calculate WQI, HPI, and MI indices
3. You'll receive:
   • 📊 Results CSV file
   • 📄 Comprehensive PDF report

*Commands:*
/upload - Upload a CSV file for analysis
/status - Check processing status
/latest - Get your most recent analysis
/help - Show this help message

*Ready to start?* Just send me a CSV file! 🚀`,

  HELP: `📚 *Help & Usage Guide*

*File Requirements:*
• Format: CSV, XLSX, or XLS
• Size: Max 20 MB
• Columns: Station, Latitude, Longitude + water parameters

*Supported Parameters:*
• WQI: pH, TDS, TH, Ca, Mg, Cl, NO₃, F, SO₄, etc.
• HPI/MI: As, Cu, Zn, Hg, Cd, Ni, Pb, Cr, Fe, Mn, etc.

*How to Upload:*
Simply attach your file and send it to me!

*Commands:*
/upload - Prompt for file upload
/status <id> - Check specific upload status
/latest - Get your last analysis results
/help - Show this message

Need more help? Contact admin.`,

  UPLOAD_PROMPT: `📁 *Upload Your Water Quality Data*

Please send me your CSV/XLSX file with water quality measurements.

*Make sure your file includes:*
✅ Station/Location identifier
✅ Latitude and Longitude (optional but recommended)
✅ At least 3 WQI parameters OR 2 metal parameters

I'll process it and send you the results!`,

  FILE_RECEIVED: `✅ *File Received!*

📁 Filename: {fileName}
📦 Size: {fileSize}

⏳ Processing your data... This may take 30-60 seconds.

I'll notify you when the analysis is complete!`,

  PROCESSING_COMPLETE: `✨ *Analysis Complete!*

Your water quality analysis is ready!

📊 *Indices Calculated:*
{indices}

📥 *Downloading your results...*`,

  NO_RESULTS_YET: `⏳ No analysis results yet. Upload a CSV file to get started!`,

  ERROR_GENERIC: `❌ Oops! Something went wrong.

Please try again or contact support if the issue persists.`,

  ERROR_FILE_TOO_LARGE: `❌ File too large!

Maximum file size: 20 MB
Your file: {fileSize}

Please reduce the file size and try again.`,

  ERROR_INVALID_FORMAT: `❌ Invalid file format!

Supported formats: CSV, XLSX, XLS

Please send a valid file.`,

  ERROR_PROCESSING: `❌ Processing failed!

Error: {error}

Please check your file format and try again.`,
} as const;

export const BOT_CONFIG = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20 MB (Telegram limit)
  POLLING_INTERVAL: 5000, // 5 seconds
  MAX_POLLING_ATTEMPTS: 60, // Max 5 minutes
  SESSION_TIMEOUT: 3600000, // 1 hour
} as const;
