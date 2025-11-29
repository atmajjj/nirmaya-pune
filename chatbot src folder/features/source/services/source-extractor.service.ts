import knex from "../../../../database/index.schema";
import { IVectorRecord } from "../../vector/vector.interface";
import {
  SemanticChunkerService,
  ChunkingResult,
  ChunkingConfig,
} from "../../vector/services/semantic-chunker.service";
import HttpException from "../../../exceptions/HttpException";
import { logger } from "../../../utils/logger";

export interface ExtractedSource {
  sourceId: number;
  sourceType: "file" | "text" | "qa" | "website";
  content: string;
  name: string;
  // Enhanced metadata for timestamp tracking
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  // Additional metadata for different source types
  fileSize?: number; // For file sources
  url?: string; // For website sources
}

export interface TransformedVectorRecord extends IVectorRecord {
  sourceId: number;
  sourceType: "file" | "text" | "qa" | "website" | "database";
  // Add semantic chunking metadata
  chunkIndex?: number;
  totalChunks?: number;
  breakpointScore?: number;
  similarity?: number;
  chunkingStrategy?: string;
  // Add overlap metadata
  hasOverlapPrefix?: boolean;
  overlapPrefixLength?: number;
  hasOverlapSuffix?: boolean;
  overlapSuffixLength?: number;
  overlapScore?: number;
  overlapStrategy?: string;
  // Add timestamp metadata
  sourceCreatedAt?: string;
  sourceUpdatedAt?: string;
  sourceName?: string;
  sourceDescription?: string;
  sourceStatus?: string;
  sourceFileSize?: number;
  sourceUrl?: string;
}

export class SourceExtractorService {
  private semanticChunker: SemanticChunkerService;

  constructor() {
    this.semanticChunker = new SemanticChunkerService();
  }
  /**
   * Extract content from all sources for a specific agent
   */
  public async extractAllSourcesForAgent(
    agentId: number
  ): Promise<ExtractedSource[]> {
    try {
      logger.info(`🔄 Extracting sources for agent ${agentId}`);

      const extractedSources: ExtractedSource[] = [];

      // Get all sources for the agent that are ready to be embedded
      const sources = await knex("sources")
        .where({
          agent_id: agentId,
          is_deleted: false,
          is_embedded: false, // Only process sources that haven't been embedded yet
        })
        .whereIn("status", ["pending", "completed"]) // Process both pending and completed sources
        .select(
          "id", 
          "source_type", 
          "name", 
          "description", 
          "status", 
          "created_at", 
          "updated_at"
        );

      logger.info(`📊 Found ${sources.length} sources for agent ${agentId}`);

      for (const source of sources) {
        try {
          let content = "";

          switch (source.source_type) {
            case "file":
              content = await this.extractFromFileSource(source.id);
              break;
            case "text":
              content = await this.extractFromTextSource(source.id);
              break;
            case "qa":
              content = await this.extractFromQASource(source.id);
              break;
            case "website":
              content = await this.extractFromWebsiteSource(source.id);
              break;
            default:
              logger.warn(
                `⚠️ Unknown source type: ${source.source_type} for source ${source.id}`
              );
              continue;
          }

          if (content.trim()) {
            // Get additional metadata based on source type
            const additionalMetadata = await this.getSourceMetadata(source.id, source.source_type);
            
            extractedSources.push({
              sourceId: source.id,
              sourceType: source.source_type as "file" | "text" | "qa" | "website",
              content: content.trim(),
              name: source.name,
              description: source.description,
              status: source.status,
              createdAt: source.created_at,
              updatedAt: source.updated_at,
              ...additionalMetadata,
            });
            logger.info(
              `✅ Extracted content from ${source.source_type} source ${source.id} (${content.length} chars)`
            );
          } else {
            logger.warn(
              `⚠️ No content found for ${source.source_type} source ${source.id}`
            );
          }
        } catch (error) {
          logger.error(
            `❌ Failed to extract from ${source.source_type} source ${source.id}:`,
            error
          );
          // Continue with other sources even if one fails
        }
      }

      logger.info(
        `✅ Successfully extracted ${extractedSources.length} sources for agent ${agentId}`
      );
      return extractedSources;
    } catch (error) {
      logger.error(`❌ Failed to extract sources for agent ${agentId}:`, error);
      throw new HttpException(
        500,
        `Failed to extract sources: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract content from file source (text_content column)
   */
  private async extractFromFileSource(sourceId: number): Promise<string> {
    const fileSource = await knex("file_sources")
      .where({ source_id: sourceId })
      .select("text_content")
      .first();

    if (!fileSource) {
      throw new Error(`File source not found for source ID ${sourceId}`);
    }

    return fileSource.text_content || "";
  }

  /**
   * Extract content from text source (content column)
   */
  private async extractFromTextSource(sourceId: number): Promise<string> {
    const textSource = await knex("text_sources")
      .where({ source_id: sourceId })
      .select("content")
      .first();

    if (!textSource) {
      throw new Error(`Text source not found for source ID ${sourceId}`);
    }

    return textSource.content || "";
  }

  /**
   * Extract content from QA source (question + answer)
   */
  private async extractFromQASource(sourceId: number): Promise<string> {
    const qaSource = await knex("qa_sources")
      .where({ source_id: sourceId })
      .select("question", "answer")
      .first();

    if (!qaSource) {
      throw new Error(`QA source not found for source ID ${sourceId}`);
    }

    // Combine question and answer
    const question = qaSource.question || "";
    const answer = qaSource.answer || "";

    if (!question && !answer) {
      return "";
    }

    return `Q: ${question}\nA: ${answer}`;
  }

  /**
   * Extract content from website source (scraped_content column)
   */
  private async extractFromWebsiteSource(sourceId: number): Promise<string> {
    const websiteSource = await knex("website_sources")
      .where({ source_id: sourceId })
      .select("scraped_content", "scraping_status")
      .first();

    if (!websiteSource) {
      throw new Error(`Website source not found for source ID ${sourceId}`);
    }

    // Only extract if scraping is completed
    if (websiteSource.scraping_status !== "completed") {
      logger.warn(
        `⚠️ Website source ${sourceId} scraping not completed (status: ${websiteSource.scraping_status})`
      );
      return "";
    }

    return websiteSource.scraped_content || "";
  }

  /**
   * Transform extracted sources to vector format using semantic chunking
   */
  public async transformToVectorFormat(
    agentId: number,
    extractedSources: ExtractedSource[]
  ): Promise<TransformedVectorRecord[]> {
    logger.info(
      `🔄 Transforming ${extractedSources.length} sources to vector format with semantic chunking for agent ${agentId}`
    );

    const vectorRecords: TransformedVectorRecord[] = [];

    for (const source of extractedSources) {
      try {
        let chunks: string[];

        if (source.content.length > 100) {
          // Use enhanced semantic chunking with research project awareness
          const chunkingResult = await this.semanticChunker.chunkText(
            source.content,
            {
              strategy: "semantic", // Use existing semantic strategy
              minChunkSize: 300, // Reduced for better granularity 
              maxChunkSize: 1000, // Optimal for BGE-M3 (vs previous 1200)
              enableOverlap: true,  // Enable chunk overlap for context preservation
              overlapPercentage: 30, // Increased for better context continuity
              preserveResearchProjects: true, // Preserve research project sections
              enhanceSemanticBoundaries: true, // Enhanced boundary detection
            },
            source.sourceId,
            source.sourceType,
            source.name
          );
          chunks = chunkingResult.chunks;

          // Filter out noise chunks (too small to be meaningful)
          const filteredChunks: string[] = [];
          const filteredMetadata: ChunkingResult['metadata'] = [];

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const metadata = chunkingResult.metadata[i];
            
            // Remove chunks that are too small (less than 25 tokens ≈ 100 characters)
            // or contain mostly whitespace/punctuation
            const wordCount = chunk.split(/\s+/).filter(word => word.length > 2).length;
            const isMeaningful = wordCount >= 15 && chunk.length >= 100;
            
            if (isMeaningful) {
              filteredChunks.push(chunk);
              filteredMetadata.push(metadata);
            }
          }

          // Update chunking result with filtered chunks
          chunks = filteredChunks;
          chunkingResult.metadata = filteredMetadata.map((meta, newIndex) => ({
            ...meta,
            chunkIndex: newIndex, // Update indices after filtering
          }));
          chunkingResult.stats.totalChunks = chunks.length;

          // Convert chunks to vector records with enhanced context
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const metadata = chunkingResult.metadata[i];

            // Calculate dynamic freshness and authority scores
            const contentFreshness = this.calculateContentFreshness(source.createdAt, source.updatedAt);
            const contentAuthority = this.calculateContentAuthority(
              source.sourceType,
              source.status,
              Boolean(source.description)
            );

            vectorRecords.push({
              _id: `${source.sourceId}_chunk_${i}`,
              text: chunk,
              category: source.sourceType,
              sourceId: source.sourceId,
              sourceType: source.sourceType,
              chunkIndex: i,
              totalChunks: chunks.length,
              chunkingStrategy: metadata?.strategy || "semantic",
              // Simplified content metadata (removed complex quality metrics)
              chunkPosition: i === 0 ? 'start' : i === chunks.length - 1 ? 'end' : 'middle',
              contentFreshness: contentFreshness, // Use calculated freshness
              contentAuthority: contentAuthority, // Use calculated authority
              // Source timestamp metadata for freshness tracking
              sourceCreatedAt: source.createdAt.toISOString(),
              sourceUpdatedAt: source.updatedAt.toISOString(),
              sourceName: source.name,
              sourceDescription: source.description || "No description available",
              sourceStatus: source.status,
              sourceFileSize: source.fileSize || 0,
              sourceUrl: source.url || "",
            });
          }

          logger.info(
            `✅ Semantic chunking: ${source.name} -> ${chunks.length} chunks (avg: ${chunkingResult.stats.averageChunkSize} chars)`
          );
        } else {
          // Fallback to fixed-size chunking for small content
          const fixedChunks = this.chunkContentFixed(source.content, 4000);

          // Calculate freshness and authority for fallback chunks
          const contentFreshness = this.calculateContentFreshness(source.createdAt, source.updatedAt);
          const contentAuthority = this.calculateContentAuthority(
            source.sourceType, 
            source.status, 
            Boolean(source.description)
          );

          for (let i = 0; i < fixedChunks.length; i++) {
            const chunk = fixedChunks[i];
            // Calculate basic quality for fallback chunks
            const chunkPosition: 'start' | 'middle' | 'end' = 
              i === 0 ? 'start' : i === fixedChunks.length - 1 ? 'end' : 'middle';
            
            vectorRecords.push({
              _id:
                fixedChunks.length > 1
                  ? `agent_${agentId}_${source.sourceType}_source_${
                      source.sourceId
                    }_chunk_${i + 1}`
                  : `agent_${agentId}_${source.sourceType}_source_${source.sourceId}`,
              text: chunk,
              category: source.sourceType,
              sourceId: source.sourceId,
              sourceType: source.sourceType,
              chunkIndex: i,
              totalChunks: fixedChunks.length,
              chunkingStrategy: "fixed_size",
              // Basic quality metadata for fallback chunks
              chunkQuality: 0.5, // Default quality for fallback
              chunkDensity: 0.5,
              chunkPosition,
              contentFreshness: contentFreshness, // Use calculated freshness
              contentAuthority: contentAuthority, // Use calculated authority  
              contentRelevance: 0.5,
              // Source timestamp metadata for fallback chunks
              sourceCreatedAt: source.createdAt.toISOString(),
              sourceUpdatedAt: source.updatedAt.toISOString(),
              sourceName: source.name,
              sourceDescription: source.description || "No description available",
              sourceStatus: source.status,
              sourceFileSize: source.fileSize || 0,
              sourceUrl: source.url || "",
            });
          }

          logger.info(
            `✅ Fixed chunking: ${source.name} -> ${fixedChunks.length} chunks`
          );
        }
      } catch (error) {
        logger.error(`❌ Failed to chunk source ${source.sourceId}:`, error);
        // Fallback to single chunk if chunking fails
        vectorRecords.push({
          _id: `agent_${agentId}_${source.sourceType}_source_${source.sourceId}_fallback`,
          text: source.content,
          category: source.sourceType,
          sourceId: source.sourceId,
          sourceType: source.sourceType,
          chunkIndex: 0,
          totalChunks: 1,
          chunkingStrategy: "fallback",
          // Source timestamp metadata for error fallback
          sourceCreatedAt: source.createdAt.toISOString(),
          sourceUpdatedAt: source.updatedAt.toISOString(),
          sourceName: source.name,
          sourceDescription: source.description || "No description available",
          sourceStatus: source.status,
          sourceFileSize: source.fileSize || 0,
          sourceUrl: source.url || "",
        });
      }
    }

    logger.info(
      `✅ Transformed to ${vectorRecords.length} vector records with semantic chunking`
    );
    return vectorRecords;
  }

  /**
   * Fixed-size chunking (fallback method)
   */
  private chunkContentFixed(
    content: string,
    maxChunkSize: number = 8000
  ): string[] {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < content.length) {
      let endIndex = currentIndex + maxChunkSize;

      // Try to break at word boundary
      if (endIndex < content.length) {
        const lastSpaceIndex = content.lastIndexOf(" ", endIndex);
        if (lastSpaceIndex > currentIndex) {
          endIndex = lastSpaceIndex;
        }
      }

      chunks.push(content.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Validate extracted content
   */
  public validateExtractedContent(extractedSources: ExtractedSource[]): {
    valid: ExtractedSource[];
    invalid: ExtractedSource[];
  } {
    const valid: ExtractedSource[] = [];
    const invalid: ExtractedSource[] = [];

    for (const source of extractedSources) {
      if (this.isValidContent(source.content)) {
        valid.push(source);
      } else {
        invalid.push(source);
        logger.warn(
          `⚠️ Invalid content for source ${source.sourceId}: too short or empty`
        );
      }
    }

    logger.info(
      `✅ Content validation: ${valid.length} valid, ${invalid.length} invalid`
    );
    return { valid, invalid };
  }

  /**
   * Check if content is valid for embedding
   */
  private isValidContent(content: string): boolean {
    // Content should be at least 10 characters and not empty
    return content && content.trim().length >= 10;
  }

  /**
   * Get extraction statistics
   */
  public getExtractionStats(extractedSources: ExtractedSource[]): {
    totalSources: number;
    fileCount: number;
    textCount: number;
    qaCount: number;
    totalCharacters: number;
    averageLength: number;
  } {
    const stats = {
      totalSources: extractedSources.length,
      fileCount: extractedSources.filter((s) => s.sourceType === "file").length,
      textCount: extractedSources.filter((s) => s.sourceType === "text").length,
      qaCount: extractedSources.filter((s) => s.sourceType === "qa").length,
      totalCharacters: extractedSources.reduce(
        (sum, s) => sum + s.content.length,
        0
      ),
      averageLength: 0,
    };

    stats.averageLength =
      stats.totalSources > 0
        ? Math.round(stats.totalCharacters / stats.totalSources)
        : 0;

    return stats;
  }

  /**
   * Get additional metadata for different source types
   */
  private async getSourceMetadata(
    sourceId: number, 
    sourceType: string
  ): Promise<{ fileSize?: number; url?: string }> {
    try {
      switch (sourceType) {
        case "file":
          const fileSource = await knex("file_sources")
            .where({ source_id: sourceId })
            .select("file_size")
            .first();
          return { fileSize: fileSource?.file_size };

        case "website":
          const websiteSource = await knex("website_sources")
            .where({ source_id: sourceId })
            .select("url")
            .first();
          return { url: websiteSource?.url };

        default:
          return {};
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to get metadata for source ${sourceId}:`, error);
      return {};
    }
  }

  /**
   * Calculate content freshness score based on creation/update dates
   */
  private calculateContentFreshness(
    createdAt: Date, 
    updatedAt: Date
  ): number {
    const now = new Date();
    const mostRecentDate = updatedAt > createdAt ? updatedAt : createdAt;
    const daysSinceUpdate = Math.floor(
      (now.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Freshness score: 1.0 for today, decreasing over time
    // Content is considered "fresh" for first 7 days, then gradually decreases
    if (daysSinceUpdate === 0) return 1.0;
    if (daysSinceUpdate <= 7) return 0.9;
    if (daysSinceUpdate <= 30) return 0.7;
    if (daysSinceUpdate <= 90) return 0.5;
    if (daysSinceUpdate <= 180) return 0.3;
    return 0.1; // Very old content
  }

  /**
   * Calculate content authority score based on source type and metadata
   */
  private calculateContentAuthority(
    sourceType: string,
    status: string,
    hasDescription: boolean
  ): number {
    let authority = 0.5; // Base authority

    // Source type based authority
    switch (sourceType) {
      case "file":
        authority += 0.2; // Files are generally more authoritative
        break;
      case "website":
        authority += 0.1; // Websites can vary in authority
        break;
      case "text":
        authority += 0.0; // Text sources need other factors
        break;
      case "qa":
        authority += 0.15; // Q&A pairs are structured knowledge
        break;
    }

    // Status based authority
    if (status === "completed") authority += 0.2;
    if (status === "processing") authority += 0.1;

    // Description availability
    if (hasDescription) authority += 0.1;

    return Math.max(0, Math.min(1, authority));
  }

  /**
   * Mark sources as embedded after successful processing
   */
  public async markSourcesAsEmbedded(sourceIds: number[]): Promise<void> {
    try {
      if (sourceIds.length === 0) {
        return;
      }

      await knex("sources").whereIn("id", sourceIds).update({
        is_embedded: true,
        status: "completed", // Also update status to completed if it was pending
        updated_at: new Date(),
      });

      logger.info(`✅ Marked ${sourceIds.length} sources as embedded`);
    } catch (error) {
      logger.error("❌ Failed to mark sources as embedded:", error);
      throw error;
    }
  }
}
