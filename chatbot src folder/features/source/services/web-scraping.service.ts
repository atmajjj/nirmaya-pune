import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import knex from "../../../../database/index.schema";
import { logger } from "../../../utils/logger";

/**
 * Simple Web Scraping Service
 * Synchronous website content extraction for immediate processing
 */

export interface ScrapingConfig {
  maxDepth?: number;
  delayMs?: number;
  maxPages?: number;
  timeout?: number;
  userAgent?: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  description?: string;
  links: string[];
  contentLength: number;
  wordCount: number;
}

export interface ScrapingResult {
  success: boolean;
  content?: ScrapedContent;
  error?: string;
  statusCode?: number;
}

class WebScrapingService {
  private defaultConfig: Required<ScrapingConfig> = {
    maxDepth: 1,
    delayMs: 500, // Reduced from 1000ms
    maxPages: 10,
    timeout: 15000, // Reduced from 30000ms to 15 seconds per request
    userAgent: "ChatVerse-Bot/1.0",
  };

  private visitedUrls = new Set<string>();

  /**
   * Main entry point for scraping a website
   */
  public async scrapeWebsite(
    sourceId: number,
    url: string,
    config: Partial<ScrapingConfig> = {}
  ): Promise<ScrapingResult> {
    const fullConfig = { ...this.defaultConfig, ...config };

    try {
      await this.updateScrapingStatus(sourceId, "processing");
      logger.info(
        `🕸️ Starting website scraping for source ${sourceId}: ${url}`
      );

      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error("Invalid URL format");
      }

      // Reset visited URLs for this scraping session
      this.visitedUrls.clear();

      // Create a timeout promise to limit total scraping time
      const scrapingPromise = this.performScraping(sourceId, url, fullConfig);
      const timeoutPromise = new Promise<ScrapingResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Scraping timeout after ${fullConfig.timeout}ms`));
        }, fullConfig.timeout);
      });

      // Race between scraping and timeout
      const mainResult = await Promise.race([scrapingPromise, timeoutPromise]);

      if (!mainResult.success) {
        await this.updateScrapingStatus(sourceId, "failed", mainResult.error);
        return mainResult;
      }

      await this.updateScrapingStatus(sourceId, "completed");
      logger.info(`✅ Website scraping completed for source ${sourceId}`);

      return mainResult;
    } catch (error) {
      logger.error(`❌ Website scraping failed for source ${sourceId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.updateScrapingStatus(sourceId, "failed", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform the actual scraping work
   */
  private async performScraping(
    sourceId: number,
    url: string,
    config: Required<ScrapingConfig>
  ): Promise<ScrapingResult> {
    // Scrape the main page
    const mainResult = await this.scrapePage(url, config);

    if (!mainResult.success) {
      return mainResult;
    }

    // Store the scraped content
    await this.saveScrapedContent(sourceId, mainResult.content!);

    // Handle depth > 1 if needed
    if (config.maxDepth > 1 && mainResult.content!.links.length > 0) {
      await this.scrapeAdditionalPages(
        sourceId,
        mainResult.content!.links,
        config,
        1
      );
    }

    return mainResult;
  }

  /**
   * Scrape a single page and extract content
   */
  private async scrapePage(
    url: string,
    config: Required<ScrapingConfig>
  ): Promise<ScrapingResult> {
    try {
      logger.info(`🔍 Starting to scrape page: ${url}`);

      // Rate limiting
      await this.enforceRateLimit(config.delayMs);

      // Make HTTP request
      logger.info(`📡 Making HTTP request to: ${url}`);
      const response: AxiosResponse = await axios.get(url, {
        timeout: config.timeout,
        headers: {
          "User-Agent": config.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        maxRedirects: 5,
      });

      logger.info(
        `📊 HTTP Response: ${response.status} - ${response.statusText}`
      );

      if (response.status !== 200) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      // Parse HTML content
      logger.info(`🔧 Parsing HTML content for ${url}`);
      const $ = cheerio.load(response.data);

      // Extract page content
      const scrapedContent = this.extractPageContent($, url);
      logger.info(
        `✅ Scraped ${scrapedContent.contentLength} characters from ${url}`
      );

      return {
        success: true,
        content: scrapedContent,
      };
    } catch (error) {
      logger.error(`❌ Failed to scrape page ${url}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          return {
            success: false,
            error: `Request timeout after ${config.timeout}ms`,
            statusCode: 408,
          };
        }
        return {
          success: false,
          error: `Network error: ${error.message}`,
          statusCode: error.response?.status,
        };
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown scraping error",
      };
    }
  }

  /**
   * Extract and clean content from parsed HTML
   */
  private extractPageContent($: cheerio.Root, url: string): ScrapedContent {
    // Extract title
    const title =
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      "Untitled Page";

    // Extract meta description
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, noscript, iframe").remove();
    $(".advertisement, .ads, .social-share, .comments").remove();

    // Try to find main content area
    const mainSelectors = [
      "main",
      "article",
      ".content",
      ".main-content",
      ".post-content",
      "#content",
      "#main",
    ];

    let content = "";
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) {
          // Meaningful content threshold
          break;
        }
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $("body").text().trim();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Extract links
    const links: string[] = [];
    $("a[href]").each((_, element) => {
      let href = $(element).attr("href");
      if (href) {
        href = this.resolveUrl(href, url);
        if (href && this.isValidUrl(href) && !this.visitedUrls.has(href)) {
          links.push(href);
        }
      }
    });

    // Calculate metrics
    const contentLength = content.length;
    const wordCount = content
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      url,
      title,
      content,
      description,
      links: Array.from(new Set(links)), // Remove duplicates
      contentLength,
      wordCount,
    };
  }

  /**
   * Scrape additional pages for depth > 1
   */
  private async scrapeAdditionalPages(
    sourceId: number,
    links: string[],
    config: Required<ScrapingConfig>,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth >= config.maxDepth) {
      return;
    }

    const maxLinksToProcess = Math.min(links.length, config.maxPages - 1);
    logger.info(
      `🔗 Processing ${maxLinksToProcess} additional links at depth ${
        currentDepth + 1
      }`
    );

    let processedCount = 0;

    for (let i = 0; i < maxLinksToProcess; i++) {
      const link = links[i];

      if (this.visitedUrls.has(link)) {
        continue;
      }

      this.visitedUrls.add(link);

      try {
        const result = await this.scrapePage(link, config);

        if (result.success && result.content) {
          // Append additional content
          await this.appendScrapedContent(sourceId, result.content);
          processedCount++;

          // Limit recursive depth to prevent infinite loops
          if (
            currentDepth + 1 < config.maxDepth &&
            result.content.links.length > 0 &&
            processedCount < 3 // Limit recursive pages to prevent long execution
          ) {
            await this.scrapeAdditionalPages(
              sourceId,
              result.content.links.slice(0, 2), // Limit to 2 links per level
              config,
              currentDepth + 1
            );
          }
        }
      } catch (error) {
        logger.warn(`⚠️ Failed to scrape additional page ${link}:`, error);
        // Continue with other pages
      }

      // Break if we've processed enough pages
      if (processedCount >= 3) {
        break;
      }
    }
  }

  /**
   * Save scraped content to database
   */
  private async saveScrapedContent(
    sourceId: number,
    content: ScrapedContent
  ): Promise<void> {
    try {
      await knex("website_sources")
        .where("source_id", sourceId)
        .update({
          scraped_content: content.content,
          content_length: content.contentLength,
          word_count: content.wordCount,
          scraped_at: new Date(),
          pages_scraped: 1,
          extracted_links: JSON.stringify(content.links),
        });

      // Update the main sources table with title and description
      await knex("sources")
        .where("id", sourceId)
        .update({
          name: content.title || "Scraped Website",
          description:
            content.description || "Website content scraped automatically",
          updated_at: new Date(),
        });

      logger.info(
        `💾 Saved scraped content for source ${sourceId} (${content.contentLength} chars)`
      );
    } catch (error) {
      logger.error(
        `❌ Failed to save scraped content for source ${sourceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Append additional scraped content (for depth > 1)
   */
  private async appendScrapedContent(
    sourceId: number,
    additionalContent: ScrapedContent
  ): Promise<void> {
    try {
      const existing = await knex("website_sources")
        .where("source_id", sourceId)
        .select("scraped_content", "pages_scraped", "extracted_links")
        .first();

      if (existing) {
        const updatedContent =
          existing.scraped_content + "\n\n" + additionalContent.content;

        // Safe JSON parsing for extracted_links
        let existingLinks: string[] = [];
        try {
          const linksData = existing.extracted_links;
          if (linksData) {
            // Handle case where linksData might be a string or JSON
            if (typeof linksData === "string") {
              // Try to parse as JSON first
              try {
                existingLinks = JSON.parse(linksData);
              } catch {
                // If parsing fails, check if it's a single URL
                if (linksData.startsWith("http")) {
                  existingLinks = [linksData];
                } else {
                  existingLinks = [];
                }
              }
            } else if (Array.isArray(linksData)) {
              existingLinks = linksData;
            }
          }
        } catch (error) {
          logger.warn(
            `⚠️ Failed to parse existing extracted_links for source ${sourceId}, using empty array:`,
            error
          );
          existingLinks = [];
        }

        // Ensure existingLinks is always an array
        if (!Array.isArray(existingLinks)) {
          existingLinks = [];
        }

        const combinedLinks = Array.from(
          new Set([...existingLinks, ...additionalContent.links])
        );

        await knex("website_sources")
          .where("source_id", sourceId)
          .update({
            scraped_content: updatedContent,
            pages_scraped: existing.pages_scraped + 1,
            extracted_links: JSON.stringify(combinedLinks),
          });
      }
    } catch (error) {
      logger.error(
        `❌ Failed to append scraped content for source ${sourceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update scraping status in database
   */
  private async updateScrapingStatus(
    sourceId: number,
    status: "pending" | "processing" | "completed" | "failed",
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        scraping_status: status,
      };

      if (error) {
        updateData.scraping_error = error;
      }

      if (status === "completed") {
        updateData.scraped_at = new Date();
      }

      await knex("website_sources")
        .where("source_id", sourceId)
        .update(updateData);

      // Also update main sources table status
      await knex("sources")
        .where("id", sourceId)
        .update({
          status:
            status === "completed"
              ? "completed"
              : status === "failed"
              ? "failed"
              : "processing",
          updated_at: new Date(),
        });
    } catch (error) {
      logger.error(
        `❌ Failed to update scraping status for source ${sourceId}:`,
        error
      );
    }
  }

  /**
   * Rate limiting enforcement
   */
  private async enforceRateLimit(delayMs: number): Promise<void> {
    // Only apply rate limiting if we've made previous requests
    if (this.visitedUrls.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }

  /**
   * Get scraping statistics for a source
   */
  public async getScrapingStats(sourceId: number): Promise<any> {
    try {
      const stats = await knex("website_sources")
        .where("source_id", sourceId)
        .select(
          "scraping_status",
          "pages_scraped",
          "content_length",
          "word_count",
          "scraped_at",
          "scraping_error"
        )
        .first();

      return stats;
    } catch (error) {
      logger.error(
        `❌ Failed to get scraping stats for source ${sourceId}:`,
        error
      );
      return null;
    }
  }
}

export default WebScrapingService;
