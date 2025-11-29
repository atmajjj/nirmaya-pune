import VectorService from "../../vector/services/vector.service";
import SystemPromptTemplates from "../system-prompt-templates";
import { logger } from "../../../utils/logger";
import { searchConfig } from "../../../config/search.config";

/**
 * Service responsible for context retrieval and system prompt generation during chat
 */
class ChatContextService {
  private vectorService = new VectorService();

  /**
   * Preprocess complex queries to extract key search terms for better retrieval
   */
  private preprocessQueryForSearch(query: string): string[] {
    const originalQuery = query.trim();
    const searchQueries = [originalQuery];

    // Extract key terms from common question patterns
    const questionPatterns = [
      // What is X questions
      /what is ([^?]+?)(?:\s+and\s+|\?|$)/i,
      // Who are X questions
      /who are ([^?]+?)(?:\?|$)/i,
      // What are X questions
      /what are ([^?]+?)(?:\?|$)/i,
      // Possessive questions like "QuantumForge's market share"
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)'s\s+([^?]+?)(?:\s+and\s+|\?|$)/i,
    ];

    let extractedTerms: string[] = [];

    for (const pattern of questionPatterns) {
      const match = originalQuery.match(pattern);
      if (match && match[1]) {
        let terms = match[1].trim();
        
        // For possessive patterns, also capture the possessed term
        if (match[2]) {
          terms += ` ${match[2].trim()}`;
        }
        
        // Split compound terms and clean them
        const cleanedTerms = terms
          .split(/\s+(?:and|or|with|for|in|of|by|to|from)\s+/i)
          .map(term => term.trim())
          .filter(term => term.length > 2);

        extractedTerms.push(...cleanedTerms);
      }
    }

    // Extract proper nouns and capitalized terms (likely important entities)
    const properNounMatches = originalQuery.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g);
    if (properNounMatches) {
      extractedTerms.push(...properNounMatches);
    }

    // Extract key business terms that are likely searchable
    const businessTerms = originalQuery.match(/\b(market share|competitors|partnerships|collaborations|university|corporation|company|technology|product|service|platform|strategic partnerships)\b/gi);
    if (businessTerms) {
      extractedTerms.push(...businessTerms);
    }

    // Remove duplicates and filter out common stop words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'their', 'they', 'them', 'this', 'that', 'these', 'those', 'what', 'who', 'how', 'when', 'where', 'why']);

    extractedTerms = [...new Set(extractedTerms)]
      .filter(term => !stopWords.has(term.toLowerCase()))
      .filter(term => term.length > 2);

    // Create additional search queries from extracted terms
    if (extractedTerms.length > 0) {
      // Add combinations of key terms
      if (extractedTerms.length >= 2) {
        // Pairwise combinations of key terms
        for (let i = 0; i < extractedTerms.length - 1; i++) {
          for (let j = i + 1; j < extractedTerms.length; j++) {
            if (extractedTerms[i] && extractedTerms[j]) {
              searchQueries.push(`${extractedTerms[i]} ${extractedTerms[j]}`);
            }
          }
        }
      }

      // Add individual key terms as separate queries
      searchQueries.push(...extractedTerms.filter(term => term && term.length > 2));
    }

    // Limit to prevent too many queries (performance)
    return searchQueries.slice(0, 5);
  }

  /**
   * Remove duplicate search results based on text content and keep highest scoring ones
   */
  private deduplicateSearchResults(results: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const result of results) {
      // Create a normalized key from the text content (first 200 chars)
      const key = result.text?.substring(0, 200).toLowerCase().trim();
      
      if (key && (!seen.has(key) || result.score > seen.get(key).score)) {
        seen.set(key, result);
      }
    }
    
    // Return deduplicated results sorted by score (highest first)
    return Array.from(seen.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Enhanced context search with configurable search strategies
   */
  public async getRelevantContext(
    query: string,
    userId: number,
    agentId: number,
    sourceSelection?: string,
    searchStrategy: 'pinecone_hybrid' | 'semantic_only' = 'pinecone_hybrid',
    enableReranking = false, // DISABLED: Reranking was causing correct chunks to be demoted
    rerankModel?: string
  ): Promise<{ contextText: string; contextSources: any[] }> {
    try {
      // Early exit for short queries that likely don't need context
      if (query.length < searchConfig.global.minQueryLength) {
        return { contextText: "", contextSources: [] };
      }

      const hasVectors = await this.vectorService.agentHasVectors(userId, agentId);
      if (!hasVectors) {
        return { contextText: "", contextSources: [] };
      }

      // Preprocess query to extract key search terms for better retrieval
      const searchQueries = this.preprocessQueryForSearch(query);
      console.log(`🔍 DEBUG: Preprocessed query "${query}" into ${searchQueries.length} search terms: ${searchQueries.join(', ')}`);
      logger.info(`🔍 Preprocessed query "${query}" into ${searchQueries.length} search terms: ${searchQueries.join(', ')}`);

      let allSearchResults: any[] = [];

      // Perform searches with all preprocessed queries
      for (const searchQuery of searchQueries) {
        let searchResults;

        // Select search strategy
        switch (searchStrategy) {
          case 'pinecone_hybrid':
            logger.info(`🔍 Using Pinecone hybrid search for query: "${searchQuery}"`);
            try {
              searchResults = await this.vectorService.searchSimilarWithPineconeHybrid(
                searchQuery,
                userId,
                agentId,
                {
                  topK: searchConfig.layers.chat.vectorSearch.topK,
                  includeMetadata: true,
                  minSimilarity: searchConfig.layers.chat.vectorSearch.minSimilarity,
                  enableCache: searchConfig.layers.chat.vectorSearch.enableCache,
                  enableReranking,
                  rerankModel: rerankModel || searchConfig.reranking.defaultModel,
                  rerankTopN: searchConfig.layers.chat.vectorSearch.rerankTopN,
                  sourceType: sourceSelection && sourceSelection !== 'auto' ? sourceSelection : undefined,
                }
              );
            } catch (pineconeError) {
              logger.warn(`⚠️ Pinecone hybrid search failed for "${searchQuery}", falling back to semantic search:`, pineconeError);
              // Fallback to semantic search
              searchResults = await this.vectorService.searchSimilarWithReranking(
                searchQuery,
                userId,
                agentId,
                {
                  topK: searchConfig.layers.chat.vectorSearch.topK,
                  includeMetadata: true,
                  minSimilarity: searchConfig.layers.chat.vectorSearch.minSimilarity,
                  enableReranking,
                  rerankTopN: searchConfig.layers.chat.vectorSearch.rerankTopN,
                  rerankThreshold: searchConfig.layers.chat.vectorSearch.rerankThreshold,
                  prioritizeSpeed: false,
                  sourceType: sourceSelection && sourceSelection !== 'auto' ? sourceSelection : undefined,
                }
              );
              logger.info(`✅ Successfully fell back to semantic search for "${searchQuery}"`);
            }
            break;

          case 'semantic_only':
            logger.info(`🔍 Using semantic-only search for query: "${searchQuery}"`);
            searchResults = await this.vectorService.searchSimilarWithReranking(
              searchQuery,
              userId,
              agentId,
              {
                topK: searchConfig.layers.chat.vectorSearch.topK,
                includeMetadata: true,
                minSimilarity: searchConfig.layers.chat.vectorSearch.minSimilarity,
                enableReranking,
                rerankTopN: searchConfig.layers.chat.vectorSearch.rerankTopN,
                rerankThreshold: searchConfig.layers.chat.vectorSearch.rerankThreshold,
                prioritizeSpeed: false,
                sourceType: sourceSelection && sourceSelection !== 'auto' ? sourceSelection : undefined,
              }
            );
            break;

          default:
            logger.info(`🔍 Using Pinecone hybrid search for query: "${searchQuery}" (default)`);
            searchResults = await this.vectorService.searchSimilarWithPineconeHybrid(
              searchQuery,
              userId,
              agentId,
              {
                topK: searchConfig.layers.chat.vectorSearch.topK,
                includeMetadata: true,
                minSimilarity: searchConfig.layers.chat.vectorSearch.minSimilarity,
                enableCache: searchConfig.layers.chat.vectorSearch.enableCache,
                enableReranking,
                rerankModel: rerankModel || searchConfig.reranking.defaultModel,
                rerankTopN: searchConfig.layers.chat.vectorSearch.rerankTopN,
                sourceType: sourceSelection && sourceSelection !== 'auto' ? sourceSelection : undefined,
              }
            );
            break;
        }

        // Add results from this query, marking the source query
        if (searchResults?.length) {
          const resultsWithQuery = searchResults.map(result => ({
            ...result,
            sourceQuery: searchQuery
          }));
          allSearchResults.push(...resultsWithQuery);
        }
      }

      // Remove duplicates based on text content and sort by score
      const uniqueResults = this.deduplicateSearchResults(allSearchResults);

      if (!uniqueResults?.length) {
        return { contextText: "", contextSources: [] };
      }

      // Process top results to build context with document context
      const contextParts: string[] = [];
      const contextSources: any[] = [];
      
      // Use top deduplicated results for better coverage
      for (const result of uniqueResults.slice(0, searchConfig.layers.chat.context.maxResultsToUse)) {
        if (result.text && result.text.length > 0) {
          contextParts.push(`${result.text}`);
          
          // Extract document context information for enhanced responses
          contextSources.push({
            score: result.score,
            sourceId: result.metadata?.sourceId,
            chunkIndex: result.metadata?.chunkIndex,
            text: result.text?.substring(0, searchConfig.layers.chat.context.textPreviewLength) + "...",
            documentTitle: result.metadata?.documentTitle || result.documentTitle,
            sectionTitle: result.metadata?.sectionTitle || result.sectionTitle,
            chunkPosition: result.metadata?.chunkPosition || result.chunkPosition,
            sourceQuery: result.sourceQuery // Track which query found this result
          });
        }
      }

      // Join context parts and limit to configured characters for better coverage
      const context = contextParts.join("\n\n").substring(0, searchConfig.layers.chat.context.maxContextChars);

      // Log context usage for monitoring
      if (context) {
        logger.info(
          `🎯 Used reranked context (${context.length} chars) with model: ${
            process.env.COHERE_RERANK_MODEL || "cohere-rerank-3.5"
          }`
        );
      }

      // Return both context string and source information
      return {
        contextText: context,
        contextSources: contextSources
      };
    } catch (error) {
      logger.warn(`⚠️ Context search failed, continuing without context:`, error);
      return { contextText: "", contextSources: [] };
    }
  }

  /**
   * Generate enhanced system prompt based on context and intent
   */
  public generateEnhancedSystemPrompt(
    basePrompt: string,
    hasContext: boolean,
    availableTopics: string[],
    isGreeting: boolean,
    context?: string
  ): string {
    // For greetings, use the original prompt to allow natural conversation
    if (isGreeting) {
      return basePrompt;
    }

    // If no context and no topics available, suggest they upload content
    if (!hasContext && availableTopics.length === 0) {
      return SystemPromptTemplates.generateNoSourcesPrompt(basePrompt);
    }

    // Generate standard system prompt
    let enhancedPrompt = SystemPromptTemplates.generateSystemPrompt(basePrompt);

    // Add available topics if we have them
    if (availableTopics.length > 0) {
      enhancedPrompt += `\n\n**AVAILABLE TOPICS IN YOUR KNOWLEDGE BASE**: ${availableTopics.slice(0, 8).join(', ')}.`;
    }

    // Add context if available
    if (context && context.length > 0) {
      // Use configured max context length from search config (default: 3000 chars)
      const maxContextChars = searchConfig.layers.chat.context.maxContextChars;
      const truncatedContext = context.length > maxContextChars 
        ? context.substring(0, maxContextChars) + "..."
        : context;
        
      enhancedPrompt += `\n\n**RELEVANT CONTEXT**:\n${truncatedContext}`;
    }

    return enhancedPrompt;
  }
}

export default ChatContextService;