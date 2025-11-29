import { logger } from "../../../utils/logger";
import { vectorConfig } from "../../../config/vector.config";

export interface DocumentContext {
  title?: string;
  summary?: string;
  sectionTitles?: string[];
  metadata?: {
    wordCount?: number;
  };
}

export interface ChunkContext {
  documentTitle?: string;
  documentSummary?: string;
  sectionTitle?: string;
  chunkPosition: 'start' | 'middle' | 'end';
  precedingContext?: string;
  followingContext?: string;
}

/**
 * Simplified service for extracting essential document metadata
 * that improves chatbot accuracy through better document understanding
 */
export class DocumentMetadataService {

  /**
   * Extract essential document context for chatbot accuracy
   */
  public async extractDocumentContext(
    sourceId: number,
    sourceType: string,
    content: string,
    sourceName: string
  ): Promise<DocumentContext> {
    try {
      logger.debug(`📄 Extracting essential context for source ${sourceId}`);

      const context: DocumentContext = {
        title: this.extractTitle(content, sourceName, sourceType),
        summary: this.generateSummary(content),
        sectionTitles: this.extractSectionTitles(content),
        metadata: this.extractBasicMetadata(content)
      };

      logger.debug(`✅ Extracted context: title="${context.title}", sections=${context.sectionTitles?.length || 0}`);
      return context;
    } catch (error) {
      logger.error(`❌ Failed to extract document context for source ${sourceId}:`, error);
      // Return minimal fallback context
      return {
        title: sourceName,
        summary: content.slice(0, vectorConfig.documentContext.maxSummaryPreviewLength) + "...",
        metadata: { wordCount: content.split(/\s+/).length }
      };
    }
  }

  /**
   * Extract document title from content or use source name
   */
  private extractTitle(content: string, sourceName: string, sourceType: string): string {
    // Simple title extraction - look for first heading or meaningful line
    const lines = content.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < vectorConfig.documentContext.maxTitleCandidateLength && !trimmed.includes('.')) {
        return trimmed;
      }
    }

    // Fallback to source name without extension for files
    if (sourceType === 'file') {
      return sourceName.replace(/\.[^/.]+$/, "");
    }

    return sourceName;
  }

  /**
   * Generate a brief summary of the document
   */
  private generateSummary(content: string, maxLength: number = vectorConfig.documentContext.maxSummaryLength): string {
    // Extract first few sentences
    const sentences = content.match(/[^\.!?]+[\.!?]+/g) || [];
    const firstSentences = sentences.slice(0, 3).join(' ').trim();

    if (firstSentences.length <= maxLength) {
      return firstSentences;
    }

    return firstSentences.slice(0, maxLength).trim() + "...";
  }

  /**
   * Extract section titles from content (simplified to markdown only)
   */
  private extractSectionTitles(content: string): string[] {
    const titles: string[] = [];

    // Only extract markdown headings for simplicity
    const markdownHeadings = content.match(/^#{1,6}\s+(.+)$/gm);
    if (markdownHeadings) {
      titles.push(...markdownHeadings.map(h => h.replace(/^#+\s+/, '').trim()));
    }

    return titles.slice(0, vectorConfig.documentContext.maxSectionTitles); // Limit to configured number of section titles
  }

  /**
   * Extract basic metadata (word count only)
   */
  private extractBasicMetadata(content: string): DocumentContext['metadata'] {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    return { wordCount };
  }

  /**
   * Generate simplified chunk context for better chatbot understanding
   */
  public generateChunkContext(
    documentContext: DocumentContext,
    chunks: string[],
    chunkIndex: number
  ): ChunkContext {
    const totalChunks = chunks.length;

    // Determine position
    let chunkPosition: 'start' | 'middle' | 'end';
    if (chunkIndex === 0) {
      chunkPosition = 'start';
    } else if (chunkIndex === totalChunks - 1) {
      chunkPosition = 'end';
    } else {
      chunkPosition = 'middle';
    }

    // Find relevant section title
    let sectionTitle: string | undefined;
    if (documentContext.sectionTitles && documentContext.sectionTitles.length > 0) {
      const sectionIndex = Math.floor((chunkIndex / totalChunks) * documentContext.sectionTitles.length);
      sectionTitle = documentContext.sectionTitles[Math.min(sectionIndex, documentContext.sectionTitles.length - 1)];
    }

    // Get brief context around the chunk
    const precedingContext = chunkIndex > 0 ?
      chunks[chunkIndex - 1].slice(-vectorConfig.documentContext.contextOverlapRange) : undefined;

    const followingContext = chunkIndex < chunks.length - 1 ?
      chunks[chunkIndex + 1].slice(0, vectorConfig.documentContext.contextOverlapRange) : undefined;

    return {
      documentTitle: documentContext.title,
      documentSummary: documentContext.summary,
      sectionTitle,
      chunkPosition,
      precedingContext,
      followingContext
    };
  }
}

export default DocumentMetadataService;
