import puppeteer from 'puppeteer';
import { logger } from '../../../utils/logger';

class PDFGeneratorService {
  /**
   * Generate PDF from HTML content using Puppeteer
   */
  async generatePDF(htmlContent: string): Promise<Buffer> {
    let browser;
    
    try {
      logger.info('Launching Puppeteer for PDF generation');

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set content and wait for images to load
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'load'],
        timeout: 60000,
      });

      // Generate PDF
      logger.info('Generating PDF from HTML');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        preferCSSPageSize: false,
      });

      logger.info(`PDF generated successfully, size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      logger.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      // Close browser
      if (browser) {
        await browser.close();
        logger.info('Puppeteer browser closed');
      }
    }
  }

  /**
   * Generate PDF with custom options
   */
  async generatePDFWithOptions(
    htmlContent: string,
    options: {
      format?: 'A4' | 'Letter' | 'Legal';
      landscape?: boolean;
      displayHeaderFooter?: boolean;
      headerTemplate?: string;
      footerTemplate?: string;
    } = {}
  ): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'load'],
        timeout: 60000,
      });

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        printBackground: true,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '<div></div>',
        footerTemplate: options.footerTemplate || '<div></div>',
        margin: {
          top: options.displayHeaderFooter ? '30mm' : '20mm',
          right: '15mm',
          bottom: options.displayHeaderFooter ? '30mm' : '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      logger.error('Error generating PDF with options:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export default new PDFGeneratorService();
