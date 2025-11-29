import knex from "../../../../database/index.schema";
import { WebsiteSource, WebsiteSourceUpdateInput } from "../source.interface";
import HttpException from "../../../exceptions/HttpException";
import { isEmpty } from "class-validator";
import { validateAgentExists, getUserForAgent } from "../../agent/services/agentUtils";
import { extractInsertedId } from "../../../utils/fileupload";
import WebScrapingService from "./web-scraping.service";
import { logger } from "../../../utils/logger";

class WebsiteSourceService {
  private webScrapingService = new WebScrapingService();

  public async getAllWebsiteSources(agentId: number): Promise<WebsiteSource[]> {
    try {
      const websiteSources = await knex("sources")
        .join("website_sources", "sources.id", "website_sources.source_id")
        .where("sources.agent_id", agentId)
        .where("sources.is_deleted", false)
        .select([
          // Sources table fields
          "sources.id",
          "sources.agent_id",
          "sources.source_type",
          "sources.name",
          "sources.description",
          "sources.status",
          "sources.is_embedded",
          "sources.created_by",
          "sources.created_at",
          "sources.updated_by",
          "sources.updated_at",
          "sources.is_deleted",
          "sources.deleted_by",
          "sources.deleted_at",
          // Website sources table fields
          "website_sources.source_id",
          "website_sources.url",
          "website_sources.crawl_depth",
          "website_sources.scraped_content",
          "website_sources.scraping_status",
          "website_sources.scraping_error",
          "website_sources.scraped_at",
          "website_sources.content_length",
          "website_sources.word_count",
          "website_sources.pages_scraped",
          "website_sources.extracted_links",
        ]);
      return websiteSources;
    } catch (error) {
      throw new HttpException(
        500,
        `Error fetching website sources: ${error.message}`
      );
    }
  }

  public async getWebsiteSourceById(sourceId: number): Promise<WebsiteSource> {
    try {
      const websiteSource = await knex("sources")
        .join("website_sources", "sources.id", "website_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .select([
          // Sources table fields
          "sources.id",
          "sources.agent_id",
          "sources.source_type",
          "sources.name",
          "sources.description",
          "sources.status",
          "sources.is_embedded",
          "sources.created_by",
          "sources.created_at",
          "sources.updated_by",
          "sources.updated_at",
          "sources.is_deleted",
          "sources.deleted_by",
          "sources.deleted_at",
          // Website sources table fields
          "website_sources.source_id",
          "website_sources.url",
          "website_sources.crawl_depth",
          "website_sources.scraped_content",
          "website_sources.scraping_status",
          "website_sources.scraping_error",
          "website_sources.scraped_at",
          "website_sources.content_length",
          "website_sources.word_count",
          "website_sources.pages_scraped",
          "website_sources.extracted_links",
        ])
        .first();

      if (!websiteSource) {
        throw new HttpException(404, "Website source not found");
      }

      return websiteSource;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching website source: ${error.message}`
      );
    }
  }

  public async createWebsiteSource(
    agentId: number,
    name: string,
    description: string,
    url: string,
    crawlDepth: number,
    userId: number
  ): Promise<WebsiteSource> {
    try {
      await validateAgentExists(agentId);
      const userInfo = await getUserForAgent(agentId);

      // Validate that the requesting user owns the agent
      if (userInfo.user_id !== userId) {
        throw new HttpException(
          403,
          "You don't have permission to create sources for this agent"
        );
      }

      const result = await knex.transaction(async (trx) => {
        const sourceResult = await trx("sources")
          .insert({
            agent_id: agentId,
            source_type: "website",
            name,
            description,
            status: "processing", // Set to processing immediately
            is_embedded: false,
            created_by: userInfo.user_id,
            created_at: new Date(),
            updated_at: new Date(),
            is_deleted: false,
          })
          .returning("id");

        const sourceId = extractInsertedId(sourceResult);

        await trx("website_sources").insert({
          source_id: sourceId,
          url,
          crawl_depth: crawlDepth,
          scraping_status: "processing", // Start processing immediately
          pages_scraped: 0,
        });

        return sourceId;
      });

      // Scrape asynchronously (don't block the response)
      logger.info(`🚀 Starting asynchronous scraping for source ${result}`);
      this.webScrapingService
        .scrapeWebsite(result, url, {
          maxDepth: crawlDepth,
          maxPages: crawlDepth > 1 ? 10 : 1,
        })
        .catch((error) => {
          logger.error(`❌ Async scraping failed for source ${result}:`, error);
        });

      return await this.getWebsiteSourceById(result);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error creating website source: ${error.message}`
      );
    }
  }

  /**
   * Manually trigger scraping for a website source
   */
  public async triggerScraping(sourceId: number): Promise<void> {
    try {
      const websiteSource = await this.getWebsiteSourceById(sourceId);
      await this.webScrapingService.scrapeWebsite(sourceId, websiteSource.url, {
        maxDepth: websiteSource.crawl_depth,
      });
    } catch (error) {
      throw new HttpException(
        500,
        `Error triggering scraping: ${error.message}`
      );
    }
  }

  /**
   * Get scraping status and statistics
   */
  public async getScrapingStatus(sourceId: number): Promise<any> {
    try {
      return await this.webScrapingService.getScrapingStats(sourceId);
    } catch (error) {
      throw new HttpException(
        500,
        `Error getting scraping status: ${error.message}`
      );
    }
  }

  public async updateWebsiteSource(
    sourceId: number,
    sourceData: WebsiteSourceUpdateInput,
    userId: number
  ): Promise<WebsiteSource> {
    try {
      if (isEmpty(sourceData)) {
        throw new HttpException(400, "Source data is empty");
      }

      const source = await knex("sources")
        .join("website_sources", "sources.id", "website_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .select([
          // Sources table fields
          "sources.id",
          "sources.agent_id",
          "sources.source_type",
          "sources.name",
          "sources.description",
          "sources.status",
          "sources.is_embedded",
          "sources.created_by",
          "sources.created_at",
          "sources.updated_by",
          "sources.updated_at",
          "sources.is_deleted",
          "sources.deleted_by",
          "sources.deleted_at",
          // Website sources table fields
          "website_sources.source_id",
          "website_sources.url",
          "website_sources.crawl_depth",
          "website_sources.scraped_content",
          "website_sources.scraping_status",
          "website_sources.scraping_error",
          "website_sources.scraped_at",
          "website_sources.content_length",
          "website_sources.word_count",
          "website_sources.pages_scraped",
          "website_sources.extracted_links",
        ])
        .first();

      if (!source) {
        throw new HttpException(404, "Website source not found");
      }

      const { name, description, url, crawl_depth } = sourceData;

      return await knex.transaction(async (trx) => {
        // Update sources table with base fields and audit fields
        const sourcesUpdateData: any = {
          updated_by: userId,
          updated_at: new Date(),
        };
        if (name !== undefined) sourcesUpdateData.name = name;
        if (description !== undefined)
          sourcesUpdateData.description = description;

        await trx("sources").where("id", sourceId).update(sourcesUpdateData);

        // Update website_sources table
        const updateData: any = {};
        if (url !== undefined) updateData.url = url;
        if (crawl_depth !== undefined) updateData.crawl_depth = crawl_depth;

        if (Object.keys(updateData).length > 0) {
          await trx("website_sources")
            .where("source_id", sourceId)
            .update(updateData);
        }

        return await this.getWebsiteSourceById(sourceId);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error updating website source: ${error.message}`
      );
    }
  }
}

export default WebsiteSourceService;
