import { logger } from "../../../utils/logger";
import HttpException from "../../../exceptions/HttpException";
import {
  DocumentMetadataService,
  DocumentContext
} from "./document-metadata.service";
import { vectorConfig } from "../../../config/vector.config";

/**
 * Enhanced chunking configuration for knowledge base optimization
 */
export interface ChunkingConfig {
  strategy?: "semantic" | "fixed" | "hierarchical" | "content-aware";
  minChunkSize?: number; // Minimum chunk size (default: 400)
  maxChunkSize?: number; // Maximum chunk size (default: 1200)
  enableOverlap?: boolean; // Enable intelligent overlap (default: true)
  overlapPercentage?: number; // Overlap percentage (default: 25)
  preserveResearchProjects?: boolean; // Preserve research project sections (default: true)
  researchProjectNames?: string[]; // Configurable research project names (default: [])
  enhanceSemanticBoundaries?: boolean; // Enhanced semantic boundary detection (default: true)
  technicalKeywords?: string[]; // Keywords indicating technical content (default: ['technology', 'specifications', 'features'])
  factTypeKeywords?: { // Keywords for different fact types
    company?: string[];
    technical?: string[];
    people?: string[];
    product?: string[];
  };
  contentTransitions?: { // Content transition patterns for semantic boundaries
    overviewToResearch?: string[];
    researchToProducts?: string[];
  };
  // Advanced chunking options
  enableHierarchical?: boolean; // Create summary + detail chunks (default: false)
  enableContentAware?: boolean; // Adjust strategy based on content type (default: false)
  hierarchicalSummarySize?: number; // Size for summary chunks (default: 300)
}

/**
 * Streamlined chunking result with essential metadata
 */
export interface ChunkingResult {
  chunks: string[];
  metadata: Array<{
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    strategy: string;
    containsKeyFacts?: boolean;
    factTypes?: string[];
  }>;
  stats: {
    totalChunks: number;
    averageChunkSize: number;
    processingTimeMs: number;
  };
  documentContext?: DocumentContext;
}

/**
 * Intelligent Semantic Chunker optimized for knowledge base retrieval
 * Automatically detects and preserves key facts, technical specs, and structured content
 */
export class SemanticChunkerService {
  private documentMetadataService: DocumentMetadataService;

  constructor() {
    this.documentMetadataService = new DocumentMetadataService();
  }

  /**
   * Main chunking method with intelligent knowledge base optimization
   */
  public async chunkText(
    text: string,
    config: ChunkingConfig = {},
    sourceId?: number,
    sourceType?: string,
    sourceName?: string
  ): Promise<ChunkingResult> {
    const startTime = Date.now();

    // Apply enhanced defaults from config
    const finalConfig: Required<ChunkingConfig> = {
      strategy: config.strategy || vectorConfig.chunking.defaultStrategy,
      minChunkSize: config.minChunkSize || vectorConfig.chunking.minChunkSize,
      maxChunkSize: config.maxChunkSize || vectorConfig.chunking.maxChunkSize,
      enableOverlap: config.enableOverlap ?? vectorConfig.chunking.enableOverlap,
      overlapPercentage: config.overlapPercentage || vectorConfig.chunking.overlapPercentage,
      preserveResearchProjects: config.preserveResearchProjects ?? vectorConfig.chunking.preserveResearchProjects,
      researchProjectNames: config.researchProjectNames || vectorConfig.chunking.researchProjectNames,
      enhanceSemanticBoundaries: config.enhanceSemanticBoundaries ?? vectorConfig.chunking.enhanceSemanticBoundaries,
      technicalKeywords: config.technicalKeywords || vectorConfig.chunking.technicalKeywords,
      factTypeKeywords: config.factTypeKeywords || vectorConfig.chunking.factTypeKeywords,
      contentTransitions: config.contentTransitions || vectorConfig.chunking.contentTransitions,
      // Advanced chunking defaults
      enableHierarchical: config.enableHierarchical ?? vectorConfig.chunking.enableHierarchical,
      enableContentAware: config.enableContentAware ?? vectorConfig.chunking.enableContentAware,
      hierarchicalSummarySize: config.hierarchicalSummarySize || vectorConfig.chunking.hierarchicalSummarySize,
    };

    try {
      // Extract document context if source info provided
      let documentContext: DocumentContext | undefined;
      if (sourceId && sourceType && sourceName) {
        documentContext = await this.documentMetadataService.extractDocumentContext(
          sourceId,
          sourceType,
          text,
          sourceName
        );
      }

      // Use intelligent chunking based on strategy
      let chunks: string[] = [];
      
      if (finalConfig.strategy === "hierarchical" || finalConfig.enableHierarchical) {
        chunks = this.hierarchicalChunking(text, finalConfig);
      } else if (finalConfig.strategy === "content-aware" || finalConfig.enableContentAware) {
        chunks = this.contentAwareChunking(text, finalConfig);
      } else {
        chunks = this.intelligentChunking(text, finalConfig);
      }

      // Apply simple sentence-based overlap
      if (finalConfig.enableOverlap) {
        chunks = this.applySentenceOverlap(chunks, finalConfig);
      }

      // Generate essential metadata
      const metadata = chunks.map((chunk, index) => ({
        chunkIndex: index,
        startPosition: text.indexOf(chunk),
        endPosition: text.indexOf(chunk) + chunk.length,
        strategy: finalConfig.strategy,
        containsKeyFacts: this.containsImportantFact(chunk, finalConfig),
        factTypes: (() => {
          const types: string[] = [];
          const lowerChunk = chunk.toLowerCase();
          if (finalConfig.factTypeKeywords.company?.some(keyword => lowerChunk.includes(keyword))) types.push('company');
          if (finalConfig.factTypeKeywords.technical?.some(keyword => lowerChunk.includes(keyword))) types.push('technical');
          if (finalConfig.factTypeKeywords.people?.some(keyword => lowerChunk.includes(keyword))) types.push('people');
          if (finalConfig.factTypeKeywords.product?.some(keyword => lowerChunk.includes(keyword))) types.push('product');
          return types;
        })(),
      }));

      const processingTime = Date.now() - startTime;

      return {
        chunks,
        metadata,
        stats: {
          totalChunks: chunks.length,
          averageChunkSize: Math.round(chunks.reduce((sum, len) => sum + len.length, 0) / chunks.length),
          processingTimeMs: processingTime,
        },
        documentContext,
      };
    } catch (error) {
      logger.error("Error in semantic chunking:", error);
      throw new HttpException(500, `Chunking failed: ${error.message}`);
    }
  }

  /**
   * Enhanced intelligent chunking with research project preservation and semantic boundary detection
   */
  private intelligentChunking(text: string, config: Required<ChunkingConfig>): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Only break on major structural boundaries, not every header
      if (this.isMajorStructuralBreak(line, config)) {
        if (currentChunk.trim()) {
          chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
          currentChunk = '';
        }
        currentChunk = line + '\n';
        continue;
      }

      // Research project preservation (keep entire project sections together)
      const lowerLine = line.toLowerCase();
      const isResearchSection = lowerLine.includes('project ') &&
                               (config.researchProjectNames.some(name => lowerLine.includes(name)) ||
                                lowerLine.includes('research') || lowerLine.includes('development'));
      if (config.preserveResearchProjects && isResearchSection) {
        const lowerChunk = currentChunk.toLowerCase();
        const isRelatedToResearch = lowerChunk.includes('project') ||
                                   lowerChunk.includes('research') ||
                                   lowerChunk.includes('development') ||
                                   config.researchProjectNames.some(name => lowerChunk.includes(name));
        if (currentChunk.trim() && !isRelatedToResearch) {
          chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
          currentChunk = '';
        }
      }

      // Enhanced technical content grouping (only for major transitions)
      if (config.enhanceSemanticBoundaries) {
        const currentLower = currentChunk.toLowerCase();
        const newLower = line.toLowerCase();
        const isMajorTransition = currentChunk.trim() &&
          ((config.contentTransitions.overviewToResearch.some(keyword => currentLower.includes(keyword)) ||
            currentLower.includes('founded')) &&
           (config.contentTransitions.researchToProducts.some(keyword => newLower.includes(keyword)) ||
            newLower.includes('products') || newLower.includes('services')));

        if (isMajorTransition) {
          if (currentChunk.trim()) {
            chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
            currentChunk = '';
          }
        }
      }

      currentChunk += line + '\n';

      // Check chunk size limits with more flexibility
      if (currentChunk.length > config.maxChunkSize * vectorConfig.chunking.maxChunkSizeMultiplier) {
        chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
        currentChunk = '';
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
    }

    // Post-process: Combine small chunks to meet minimum size
    return this.combineSmallChunks(chunks, config.minChunkSize);
  }

  /**
   * Enhanced structural break detection with research project awareness
   * Only breaks on major boundaries to avoid overly small chunks
   */
  private isMajorStructuralBreak(line: string, config: Required<ChunkingConfig>): boolean {
    // Major markdown headers (h1, h2 only for major breaks)
    if (line.match(/^#{1,2}\s+/)) return true;

    // All caps section headers
    if (line.length > 5 && line === line.toUpperCase() && line.match(/^[A-Z\s]+$/)) return true;

    // Numbered main sections
    if (line.match(/^\d+\.\s+[A-Z]/)) return true;

    // Research project headers (enhanced detection)
    if (config.preserveResearchProjects && line.match(/^###?\s+Project\s+[A-Z][a-zA-Z]+/)) return true;

    // Major section dividers
    if (line.match(/^=+$/) || line.match(/^-+$/)) return true;

    return false;
  }

  /**
   * Combine small chunks to meet minimum size requirements
   */
  private combineSmallChunks(chunks: string[], minChunkSize: number): string[] {
    const result: string[] = [];
    let currentCombined = '';

    for (const chunk of chunks) {
      if (chunk.length >= minChunkSize) {
        // This chunk is big enough on its own
        if (currentCombined) {
          result.push(currentCombined.trim());
          currentCombined = '';
        }
        result.push(chunk);
      } else {
        // Combine small chunks
        if (currentCombined) {
          const combined = currentCombined + '\n\n' + chunk;
          if (combined.length >= minChunkSize) {
            result.push(combined.trim());
            currentCombined = '';
          } else {
            currentCombined = combined;
          }
        } else {
          currentCombined = chunk;
        }
      }
    }

    // Add any remaining combined chunk
    if (currentCombined && currentCombined.length >= minChunkSize) {
      result.push(currentCombined.trim());
    }

    return result;
  }

  /**
   * Check if line represents a research project section
   */
  /**
   * Finalize chunk by splitting if too large while preserving sentence boundaries
   */
  private finalizeChunk(chunk: string, config: Required<ChunkingConfig>): string[] {
    if (chunk.length <= config.maxChunkSize) {
      return [chunk];
    }

    // Split by sentences if chunk is too large
    const sentences = this.splitIntoSentences(chunk);
    const result: string[] = [];
    let currentPart = '';

    for (const sentence of sentences) {
      const potentialPart = currentPart + (currentPart ? ' ' : '') + sentence;

      if (potentialPart.length > config.maxChunkSize && currentPart.length >= config.minChunkSize) {
        result.push(currentPart.trim());
        currentPart = sentence;
      } else {
        currentPart = potentialPart;
      }
    }

    if (currentPart.trim()) {
      result.push(currentPart.trim());
    }

    return result.filter(part => part.length >= config.minChunkSize);
  }

  /**
   * Enhanced intelligent overlap strategy based on content type
   */
  private applySentenceOverlap(chunks: string[], config: Required<ChunkingConfig>): string[] {
    if (chunks.length <= 1) return chunks;

    const overlapped: string[] = [chunks[0]]; // First chunk unchanged

    for (let i = 1; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      const prevChunk = chunks[i - 1];

      // Determine overlap strategy based on content type
      const prevChunkLower = prevChunk.toLowerCase();
      const currentChunkLower = currentChunk.toLowerCase();

      // For research projects, use concept-based overlap
      let overlapStrategy: 'sentence' | 'concept' | 'minimal';
      if ((prevChunkLower.includes('project') || currentChunkLower.includes('project')) &&
          (prevChunkLower.includes('research') || currentChunkLower.includes('research'))) {
        overlapStrategy = 'concept';
      }
      // For technical specifications, use sentence overlap
      else if (config.technicalKeywords.some(keyword =>
                 prevChunkLower.includes(keyword) || currentChunkLower.includes(keyword))) {
        overlapStrategy = 'sentence';
      }
      // For general content, use minimal overlap
      else {
        overlapStrategy = 'minimal';
      }

      let overlapText = '';

      switch (overlapStrategy) {
        case 'sentence':
          // Extract percentage-based sentence overlap from chunk end
          const sentenceOverlapSentences = this.splitIntoSentences(prevChunk);
          const sentenceOverlapCount = Math.max(1, Math.floor(sentenceOverlapSentences.length * (config.overlapPercentage / 100)));
          overlapText = sentenceOverlapSentences.slice(-sentenceOverlapCount).join(' ');
          break;
        case 'concept':
          // Extract key terms from the end of previous chunk that relate to current chunk
          const prevSentences = this.splitIntoSentences(prevChunk);
          const currentWords = currentChunk.toLowerCase().split(/\s+/);
          // Find sentences from prev chunk that contain keywords from current chunk
          const relevantSentences = prevSentences.filter(sentence => {
            const sentenceWords = sentence.toLowerCase().split(/\s+/);
            return currentWords.some(word =>
              word.length > 3 && sentenceWords.includes(word)
            );
          });
          overlapText = relevantSentences.slice(-2).join(' '); // Take last 2 relevant sentences
          break;
        case 'minimal':
          // Just take the last sentence from previous chunk
          const minimalSentences = this.splitIntoSentences(prevChunk);
          overlapText = minimalSentences.slice(-1).join(' '); // Just the last sentence
          break;
        default:
          // Default to sentence overlap
          const defaultOverlapSentences = this.splitIntoSentences(prevChunk);
          const defaultOverlapCount = Math.max(1, Math.floor(defaultOverlapSentences.length * (config.overlapPercentage / 100)));
          overlapText = defaultOverlapSentences.slice(-defaultOverlapCount).join(' ');
      }

      // Add overlap to current chunk
      const overlappedChunk = overlapText ? overlapText + ' ' + currentChunk : currentChunk;
      overlapped.push(overlappedChunk);
    }

    return overlapped;
  }

  /**
   * Extract concept-based overlap (preserves key terms and context)
   */
  /**
   * Extract minimal contextual overlap
   */
  /**
   * Extract sentence-based overlap from chunk end
   */
  /**
   * Check if chunk contains important factual information
   */
  private containsImportantFact(chunk: string, config?: Required<ChunkingConfig>): boolean {
    if (!config) return false; // Fallback if config not provided
    const lowerChunk = chunk.toLowerCase();

    // Company and foundation facts
    if (config.factTypeKeywords.company?.some(keyword => lowerChunk.includes(keyword))) return true;

    // Technical definitions and acronyms
    if (lowerChunk.includes('stands for') || chunk.match(/\([A-Z]{2,}\)/)) return true;

    // Product and feature information
    if (config.factTypeKeywords.product?.some(keyword => lowerChunk.includes(keyword))) return true;

    // Key personnel
    if (config.factTypeKeywords.people?.some(keyword => lowerChunk.includes(keyword))) return true;

    return false;
  }

  /**
   * Hierarchical Chunking: Creates summary + detail chunks
   * Summary chunks contain high-level info, detail chunks contain specifics
   */
  private hierarchicalChunking(text: string, config: Required<ChunkingConfig>): string[] {
    const chunks: string[] = [];
    
    // First, do regular semantic chunking
    const baseChunks = this.intelligentChunking(text, config);
    
    // For each base chunk, create a summary and keep the detail
    baseChunks.forEach((chunk, index) => {
      // Create summary chunk (first few sentences with key facts)
      const sentences = this.splitIntoSentences(chunk);
      const summarySize = Math.min(config.hierarchicalSummarySize, Math.floor(chunk.length * vectorConfig.chunking.summarySizeRatio));
      
      let summary = '';
      let currentLength = 0;
      
      for (const sentence of sentences) {
        if (currentLength + sentence.length > summarySize) break;
        
        // Prioritize sentences with key facts
        if (this.containsImportantFact(sentence, config)) {
          summary += sentence + ' ';
          currentLength += sentence.length;
        }
      }
      
      // If summary is too short, add more sentences
      if (summary.length < summarySize * vectorConfig.chunking.minSummaryRatio) {
        for (const sentence of sentences) {
          if (currentLength + sentence.length > summarySize) break;
          if (!summary.includes(sentence)) {
            summary += sentence + ' ';
            currentLength += sentence.length;
          }
        }
      }
      
      // Add summary chunk (prefixed for identification)
      if (summary.trim()) {
        chunks.push(`[SUMMARY] ${summary.trim()}`);
      }
      
      // Add full detail chunk
      chunks.push(`[DETAIL] ${chunk}`);
    });
    
    return chunks;
  }

  /**
   * Content-Aware Chunking: Adjusts strategy based on content type
   * Technical content gets smaller chunks, narrative content gets larger chunks
   */
  private contentAwareChunking(text: string, config: Required<ChunkingConfig>): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Detect content type
      const contentType = this.detectContentType(line, config);
      
      // Adjust chunk size based on content type
      let maxSize = config.maxChunkSize;
      let minSize = config.minChunkSize;
      
      switch (contentType) {
        case 'technical':
          maxSize = Math.floor(config.maxChunkSize * vectorConfig.chunking.technicalSizeMultiplier); // Smaller for technical
          minSize = Math.floor(config.minChunkSize * vectorConfig.chunking.technicalSizeMultiplier);
          break;
        case 'list':
          maxSize = Math.floor(config.maxChunkSize * vectorConfig.chunking.listSizeMultiplier); // Even smaller for lists
          minSize = Math.floor(config.minChunkSize * vectorConfig.chunking.listSizeMultiplier);
          break;
        case 'narrative':
          maxSize = Math.floor(config.maxChunkSize * vectorConfig.chunking.narrativeSizeMultiplier); // Larger for narrative
          minSize = config.minChunkSize;
          break;
        default:
          // Use default sizes
          break;
      }
      
      // Check if we should break the chunk
      const shouldBreak = currentChunk.length > maxSize || 
                         this.isMajorStructuralBreak(line, config);
      
      if (shouldBreak && currentChunk.trim()) {
        chunks.push(...this.finalizeChunk(currentChunk.trim(), { ...config, maxChunkSize: maxSize, minChunkSize: minSize }));
        currentChunk = '';
      }
      
      currentChunk += line + '\n';
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(...this.finalizeChunk(currentChunk.trim(), config));
    }
    
    return chunks;
  }

  /**
   * Detect content type for content-aware chunking
   */
  private detectContentType(line: string, config: Required<ChunkingConfig>): 'technical' | 'list' | 'narrative' | 'header' {
    const lowerLine = line.toLowerCase();
    
    // Technical content detection
    if (config.technicalKeywords.some(keyword => lowerLine.includes(keyword))) {
      return 'technical';
    }
    
    // List content detection
    if (line.match(/^\s*[-*•]\s+/) || line.match(/^\s*\d+\.\s+/) || line.match(/^\s*[a-zA-Z]\.\s+/)) {
      return 'list';
    }
    
    // Header detection
    if (line.match(/^#{1,6}\s+/) || line.match(/^[A-Z\s]+$/) || this.isMajorStructuralBreak(line, config)) {
      return 'header';
    }
    
    // Default to narrative
    return 'narrative';
  }

  /**
   * Identify types of facts in a chunk
   */
  /**
   * Simple sentence splitting
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.');
  }

  /**
   * Fallback fixed-size chunking
   */
}
