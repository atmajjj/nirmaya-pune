/**
 * POST /api/nirmaya-engine/ai-report
 * Generate AI-powered report for water quality calculations
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Body: { uploadId: number }
 * 
 * Returns: PDF file or download URL
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import { findCalculationsByUploadId } from '../../hmpi-engine/shared/queries';
import geminiService from '../services/gemini.service';
import chartGeneratorService from '../services/chart-generator.service';
import reportTemplateService from '../services/report-template.service';
import pdfGeneratorService from '../services/pdf-generator.service';
import { uploadToS3 } from '../../../utils/s3Upload';
import { logger } from '../../../utils/logger';
import { db } from '../../../database/drizzle';
import { uploads } from '../../upload/shared/schema';
import { eq } from 'drizzle-orm';
import { DataSummary, WaterQualityData } from '../interfaces/ai-report.interface';

// Request body schema
const requestSchema = z.object({
  uploadId: z.number().int().positive(),
});

const handler = asyncHandler(async (req: Request, res: Response) => {
  const { uploadId } = requestSchema.parse(req.body);
  const userId = getUserId(req);

  logger.info(`Starting AI report generation for upload ${uploadId}`);

  try {
    // 1. Fetch calculation data
    const calculations = await findCalculationsByUploadId(uploadId);
    
    if (calculations.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No calculations found for this upload',
      });
      return;
    }

    // 2. Get upload info
    const [uploadInfo] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    if (!uploadInfo) {
      res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
      return;
    }

    // 3. Transform data to interface format - convert strings to numbers
    const data: WaterQualityData[] = calculations.map((c: any) => ({
      stationId: c.station_id,
      state: c.state,
      district: c.district,
      city: c.city,
      location: c.location,
      year: c.year,
      hpi: c.hpi !== null && c.hpi !== undefined ? Number(c.hpi) : null,
      hpiClassification: c.hpi_classification,
      mi: c.mi !== null && c.mi !== undefined ? Number(c.mi) : null,
      miClassification: c.mi_classification,
      miClass: c.mi_class,
      wqi: c.wqi !== null && c.wqi !== undefined ? Number(c.wqi) : null,
      wqiClassification: c.wqi_classification,
      metalsAnalyzed: c.metals_analyzed,
      paramsAnalyzed: c.params_analyzed,
    }));

    // 4. Generate data summary
    const summary = generateDataSummary(data);
    logger.info(`Data summary: ${summary.totalStations} stations, ${summary.criticalStations} critical`);

    // 5. Generate AI insights
    logger.info('Generating AI insights with Gemini Pro...');
    let insights;
    try {
      insights = await geminiService.generateInsights(data, summary);
      logger.info('AI insights generated successfully');
    } catch (error: any) {
      // Fallback to static insights if Gemini API fails
      logger.warn('Gemini API unavailable, using fallback statistical report');
      
      // Calculate min/max values for MI with null safety
      const miValues = data.map(d => d.mi).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      const minMI = miValues.length > 0 ? Math.min(...miValues) : 0;
      const maxMI = miValues.length > 0 ? Math.max(...miValues) : 0;
      
      // Safe average getters with defaults
      const avgHPI = summary.avgHPI !== null ? summary.avgHPI : 0;
      const avgMI = summary.avgMI !== null ? summary.avgMI : 0;
      const avgWQI = summary.avgWQI !== null ? summary.avgWQI : 0;
      
      // Identify critical stations for fallback report
      const criticalStationsList = data
        .filter(station => {
          const hpi = station.hpi;
          const mi = station.mi;
          const wqi = station.wqi;
          const hpiClass = station.hpiClassification?.toLowerCase() || '';
          const miClass = station.miClassification?.toLowerCase() || '';
          const wqiClass = station.wqiClassification?.toLowerCase() || '';
          
          const isCritical = 
            (hpi !== null && hpi !== undefined && hpi > 100) ||
            (mi !== null && mi !== undefined && mi > 1) ||
            (wqi !== null && wqi !== undefined && wqi > 100) ||
            hpiClass.includes('critical') || hpiClass.includes('unsafe') ||
            miClass.includes('critical') || miClass.includes('unsafe') ||
            wqiClass.includes('unsuitable') || wqiClass.includes('poor');
          
          return isCritical;
        })
        .map(station => station.stationId)
        .slice(0, 20); // Top 20 critical stations
      
      insights = {
        executiveSummary: `This comprehensive water quality analysis covers ${summary.totalStations} monitoring stations. The assessment reveals ${summary.criticalStations} stations (${((summary.criticalStations / summary.totalStations) * 100).toFixed(1)}%) with critical pollution levels requiring immediate intervention. Average HPI: ${avgHPI.toFixed(2)}, MI: ${avgMI.toFixed(2)}, WQI: ${avgWQI.toFixed(2)}.`,
        keyFindings: [
          `${summary.criticalStations} of ${summary.totalStations} stations show critical pollution levels`,
          `Heavy metal contamination detected across ${summary.totalStations} monitoring locations`,
          `Average Heavy Metal Pollution Index (HPI): ${avgHPI.toFixed(2)} - ${avgHPI > 100 ? 'Critical' : avgHPI > 50 ? 'Moderate' : 'Low'} pollution`,
          `Metal Index (MI) ranges from ${minMI.toFixed(2)} to ${maxMI.toFixed(2)}`,
          `Water Quality Index (WQI) average: ${avgWQI.toFixed(2)} - ${summary.criticalStations} stations unsuitable for consumption`
        ],
        geographicalAnalysis: `The analysis covers ${summary.states.length} state(s) and ${summary.districts.length} district(s) with varying pollution levels. Critical areas show HPI values above 100, indicating severe heavy metal contamination. Monitoring data spans ${summary.years.length > 0 ? `from ${Math.min(...summary.years)} to ${Math.max(...summary.years)}` : 'multiple time periods'}. Immediate remediation efforts are recommended for high-risk zones to protect public health.`,
        criticalStations: criticalStationsList,
        recommendations: [
          'Implement immediate water treatment protocols for critical stations with HPI > 100',
          'Conduct detailed source analysis to identify heavy metal contamination origins',
          'Establish continuous real-time monitoring systems at high-risk locations',
          `Prioritize remediation for ${summary.criticalStations} stations exceeding safety limits`,
          'Strengthen regulatory compliance and regular testing frequency'
        ]
      };
    }

    // 6. Generate charts
    logger.info('Generating charts with QuickChart.io...');
    const charts = await chartGeneratorService.generateCharts(data, summary);
    logger.info('Charts generated successfully');

    // 7. Generate HTML report
    logger.info('Generating HTML report template...');
    const htmlContent = reportTemplateService.generateHTML(
      insights,
      charts,
      summary,
      data,
      uploadInfo.filename
    );
    logger.info('HTML report generated');

    // 8. Convert to PDF
    logger.info('Converting HTML to PDF with Puppeteer...');
    const pdfBuffer = await pdfGeneratorService.generatePDF(htmlContent);
    logger.info(`PDF generated, size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // 9. Upload to S3 or save locally
    const fileName = `ai-report-${uploadId}-${Date.now()}.pdf`;
    const filePath = `uploads/${userId}/${Date.now()}_${fileName}`;

    try {
      await uploadToS3(
        pdfBuffer,
        fileName,
        'application/pdf',
        userId
      );
      logger.info(`PDF uploaded to S3: ${filePath}`);

      // Return PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (s3Error: any) {
      logger.error('S3 upload failed, serving PDF directly:', s3Error);
      
      // Serve PDF directly without storing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    }

  } catch (error: any) {
    logger.error('Error generating AI report:', {
      message: error.message,
      stack: error.stack,
      uploadId,
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI report',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * Generate data summary from calculations
 */
function generateDataSummary(data: WaterQualityData[]): DataSummary {
  const hasHPI = data.some(d => d.hpi !== null && d.hpi !== undefined);
  const hasMI = data.some(d => d.mi !== null && d.mi !== undefined);
  const hasWQI = data.some(d => d.wqi !== null && d.wqi !== undefined);

  // Calculate averages - data already converted to numbers
  const hpiValues = data.filter(d => d.hpi !== null && d.hpi !== undefined).map(d => d.hpi!);
  const miValues = data.filter(d => d.mi !== null && d.mi !== undefined).map(d => d.mi!);
  const wqiValues = data.filter(d => d.wqi !== null && d.wqi !== undefined).map(d => d.wqi!);

  const avgHPI = hpiValues.length > 0
    ? hpiValues.reduce((sum, v) => sum + v, 0) / hpiValues.length
    : null;
  const avgMI = miValues.length > 0
    ? miValues.reduce((sum, v) => sum + v, 0) / miValues.length
    : null;
  const avgWQI = wqiValues.length > 0
    ? wqiValues.reduce((sum, v) => sum + v, 0) / wqiValues.length
    : null;

  // Count critical and excellent stations
  let criticalStations = 0;
  let excellentStations = 0;

  data.forEach(station => {
    let isCritical = false;
    let isExcellent = false;

    // Check numeric values
    if (hasHPI && station.hpi !== null && station.hpi !== undefined) {
      if (station.hpi > 100) isCritical = true;
      if (station.hpi < 25) isExcellent = true;
    }
    if (hasWQI && station.wqi !== null && station.wqi !== undefined) {
      if (station.wqi > 100) isCritical = true;
      if (station.wqi < 25) isExcellent = true;
    }

    // Check classification strings
    const classification = (station.wqiClassification || station.hpiClassification || station.miClassification || '').toLowerCase();
    if (classification.includes('unsuitable') || classification.includes('critical') || classification.includes('high') || classification.includes('poor')) {
      isCritical = true;
    }
    if (classification.includes('excellent') || classification.includes('very pure')) {
      isExcellent = true;
    }

    if (isCritical) criticalStations++;
    if (isExcellent) excellentStations++;
  });

  // Extract unique states, districts, years
  const states = [...new Set(data.map(d => d.state).filter(Boolean))];
  const districts = [...new Set(data.map(d => d.district).filter(Boolean))];
  const years = [...new Set(data.map(d => d.year).filter((y): y is number => y !== null))].sort();

  return {
    totalStations: data.length,
    avgHPI,
    avgMI,
    avgWQI,
    hasHPI,
    hasMI,
    hasWQI,
    criticalStations,
    excellentStations,
    states: states as string[],
    districts: districts as string[],
    years,
  };
}

const router = Router();

// POST /api/nirmaya-engine/ai-report
router.post(
  '/ai-report',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  handler
);

export default router;
