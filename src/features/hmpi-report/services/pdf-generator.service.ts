import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ReportData, ChartImages } from '../shared/interface';

/**
 * PDF Generator Service
 * Generates PDF reports from HTML templates using Puppeteer
 */
export class PDFGeneratorService {
  private static templateCache: HandlebarsTemplateDelegate | null = null;
  private static readonly TEMPLATE_PATH = path.join(__dirname, '../templates/report-template.hbs');

  /**
   * Load and compile the Handlebars template
   * @private
   */
  private static async loadTemplate(): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache) {
      return this.templateCache;
    }

    const templateContent = await fs.readFile(this.TEMPLATE_PATH, 'utf-8');
    this.templateCache = Handlebars.compile(templateContent);
    return this.templateCache;
  }

  /**
   * Prepare template data from report data and charts
   * @private
   */
  private static prepareTemplateData(
    reportData: ReportData,
    charts: ChartImages
  ): Record<string, any> {
    const { hpiStats, miStats, wqiStats, geoData, totalStations } = reportData;

    // Calculate percentages for classifications
    const hpiClassifications = Object.entries(hpiStats.classificationCounts).map(
      ([classification, count]) => ({
        classification,
        count,
        percentage: ((count / totalStations) * 100).toFixed(1),
      })
    );

    const miClassifications = Object.entries(miStats.classificationCounts).map(
      ([classification, count]) => ({
        classification,
        count,
        percentage: ((count / totalStations) * 100).toFixed(1),
      })
    );

    const wqiClassifications = Object.entries(wqiStats?.classificationCounts || {}).map(
      ([classification, count]) => ({
        classification,
        count,
        percentage: ((count / totalStations) * 100).toFixed(1),
      })
    );

    // Prepare top polluted stations with ranks
    const topPollutedStations = hpiStats.topPollutedStations.map((station, index) => ({
      rank: index + 1,
      stationId: station.stationId,
      hpi: station.hpi.toFixed(2),
      location: station.location,
    }));

    // Prepare top WQI stations with ranks
    const topWQIStations = (wqiStats?.topStations || []).map((station, index) => ({
      rank: index + 1,
      stationId: station.stationId,
      wqi: station.wqi.toFixed(2),
      classification: station.classification,
      location: station.location,
    }));

    // Check if there's high pollution (HPI > 100 or critical classification)
    const hasHighPollution = hpiStats.topPollutedStations.some(s => s.hpi >= 100);
    
    // Check if there's poor water quality (WQI > 75)
    const hasPoorWaterQuality = (wqiStats?.topStations || []).some(s => s.wqi >= 75);

    return {
      // Meta information
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      uploadFilename: reportData.uploadFilename,
      totalStations: reportData.totalStations,
      year: new Date().getFullYear(),

      // Summary statistics
      avgHPI: reportData.avgHPI?.toFixed(2) || 'N/A',
      avgMI: reportData.avgMI?.toFixed(2) || 'N/A',
      avgWQI: reportData.avgWQI?.toFixed(2) || 'N/A',

      // HPI data
      hpiClassifications,
      topPollutedStations,
      hpiDistributionChart: charts.hpiDistribution,
      hpiClassificationChart: charts.hpiClassification,
      topPollutedChart: charts.topPollutedStations,

      // MI data
      miClassifications,
      miDistributionChart: charts.miDistribution,
      miClassificationChart: charts.miClassification,

      // WQI data
      wqiClassifications,
      topWQIStations,
      wqiDistributionChart: charts.wqiDistribution,
      wqiClassificationChart: charts.wqiClassification,

      // Geographic data
      geoStates: geoData.states.map(s => ({
        state: s.state,
        count: s.count,
      })),
      geographicChart: charts.geographicDistribution,

      // Recommendations flags
      hasHighPollution,
      hasPoorWaterQuality,
    };
  }

  /**
   * Generate PDF from report data and charts
   * Returns PDF as Buffer
   *
   * @param reportData - Aggregated report data
   * @param charts - Generated chart images (base64)
   * @returns PDF buffer
   */
  static async generatePDF(
    reportData: ReportData,
    charts: ChartImages
  ): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

    try {
      // Load and compile template
      const template = await this.loadTemplate();

      // Prepare template data
      const templateData = this.prepareTemplateData(reportData, charts);

      // Render HTML
      const html = template(templateData);

      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set content and wait for images to load
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF with A4 format
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate PDF and save to file
   * Useful for testing or local development
   *
   * @param reportData - Aggregated report data
   * @param charts - Generated chart images
   * @param outputPath - Path where PDF should be saved
   */
  static async generateAndSavePDF(
    reportData: ReportData,
    charts: ChartImages,
    outputPath: string
  ): Promise<void> {
    const pdfBuffer = await this.generatePDF(reportData, charts);
    await fs.writeFile(outputPath, pdfBuffer);
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  static clearTemplateCache(): void {
    this.templateCache = null;
  }

  /**
   * Get estimated PDF size based on content
   * Returns size in bytes (rough estimate)
   *
   * @param reportData - Report data to estimate size for
   * @returns Estimated size in bytes
   */
  static estimatePDFSize(reportData: ReportData): number {
    // Base PDF size: ~50KB for template
    let estimatedSize = 50 * 1024;

    // Charts: ~80KB each (8 charts)
    estimatedSize += 8 * 80 * 1024;

    // Tables and content: ~100 bytes per station
    estimatedSize += reportData.totalStations * 100;

    return estimatedSize;
  }
}
