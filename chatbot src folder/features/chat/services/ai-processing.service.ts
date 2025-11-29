import { streamText, CoreMessage } from "ai";
import { createModelWithApiKey } from "../../provider_model/providers";
import HttpException from "../../../exceptions/HttpException";
import { logger } from "../../../utils/logger";
import encryption from "../../agent/services/encryption";
import apiKeyCacheService from "../../agent/services/api-key-cache.service";
import unifiedCacheService from "../../vector/services/unified-cache.service";
import { chatConfig } from '../../../config/chat.config';

/**
 * Service responsible for AI model interactions and response generation
 */
class AiProcessingService {
  private unifiedCacheService = unifiedCacheService;

  /**
   * Validate API key format based on provider
   */
  private validateApiKeyFormat(provider: string, apiKey: string): void {
    const providerLower = provider?.toLowerCase();
    
    if (providerLower === 'openai' && !chatConfig.aiProcessing.apiKeyPatterns.openai.test(apiKey)) {
      throw new HttpException(400, chatConfig.aiProcessing.invalidApiKeyMessages.openai);
    }
    if (providerLower === 'anthropic' && !chatConfig.aiProcessing.apiKeyPatterns.anthropic.test(apiKey)) {
      throw new HttpException(400, chatConfig.aiProcessing.invalidApiKeyMessages.anthropic);
    }
    if (providerLower === 'groq' && !chatConfig.aiProcessing.apiKeyPatterns.groq.test(apiKey)) {
      throw new HttpException(400, chatConfig.aiProcessing.invalidApiKeyMessages.groq);
    }
    if (providerLower === 'google' && !chatConfig.aiProcessing.apiKeyPatterns.google.test(apiKey)) {
      throw new HttpException(400, chatConfig.aiProcessing.invalidApiKeyMessages.google);
    }
  }

  /**
   * Get cached and decrypted API key for agent
   */
  public async getDecryptedApiKey(agent: any, agentId: number, userId: number): Promise<string> {
    const apiKey = await apiKeyCacheService.getOrDecrypt(agentId, userId, async () => {
      return encryption.decryptApiKey(agent.encrypted_api_key, agent.encryption_salt);
    });

    if (!apiKey || apiKey.trim().length === 0) {
      logger.error(`Empty or invalid API key for agent ${agentId}`);
      throw new HttpException(400, "Invalid or missing API key. Please update your agent's API key.");
    }

    // Debug: Log API key format for troubleshooting
    logger.debug(`🔍 API key validation for agent ${agentId}: provider=${agent.provider}, key starts with: ${apiKey.substring(0, 4)}..., length: ${apiKey.length}`);

    this.validateApiKeyFormat(agent.provider, apiKey);
    return apiKey;
  }

  /**
   * Create model instance with agent's API key
   */
  private createModelInstance(agent: any, apiKey: string): any {
    try {
      return createModelWithApiKey(agent.provider, agent.model, apiKey);
    } catch (modelError: any) {
      logger.error(`Failed to create model instance for agent ${agent.id}:`, modelError);
      throw new HttpException(400, "Failed to initialize AI model. Please check your API key and model configuration.");
    }
  }

  /**
   * Generate AI response with caching support
   */
  public async generateResponse(
    agent: any,
    userMessage: string,
    systemContent: string,
    dbMessages: CoreMessage[],
    context: string,
    userId: number
  ): Promise<{ response: string; isFromCache: boolean }> {
    const agentId = agent.id;

    // Check for cached response before AI generation
    const cachedResponse = await this.unifiedCacheService.getCachedResponse(
      userMessage,
      agentId,
      userId,
      context
    );

    logger.info(`🔍 Cache check for agent ${agentId}: "${userMessage.substring(0, 50)}..." - Result: ${cachedResponse ? 'HIT' : 'MISS'}`);

    if (cachedResponse) {
      logger.info(`⚡ Using cached response for agent ${agentId}: ${userMessage.substring(0, 50)}...`);
      return { response: cachedResponse, isFromCache: true };
    }

    // Get API key and create model instance
    const apiKey = await this.getDecryptedApiKey(agent, agentId, userId);
    const modelInstance = this.createModelInstance(agent, apiKey);

    // Generate new AI response
    let fullResponse = "";
    try {
      // Ensure temperature is a valid number between configured min and max
      const temperature = parseFloat(agent.temperature?.toString() || chatConfig.aiProcessing.defaultTemperature.toString());
      const validTemperature = isNaN(temperature) ? chatConfig.aiProcessing.defaultTemperature : Math.max(chatConfig.aiProcessing.minTemperature, Math.min(chatConfig.aiProcessing.maxTemperature, temperature));

      // Note: Tools are disabled for Groq models due to compatibility issues causing empty responses
      const result = await streamText({
        model: modelInstance,
        messages: dbMessages,
        system: systemContent,
        maxTokens: chatConfig.aiProcessing.defaultMaxTokens,
        temperature: validTemperature,
      });

      for await (const delta of result.textStream) {
        fullResponse += delta;
      }
    } catch (aiError: any) {
      logger.error(`AI streaming error for agent ${agentId}:`, {
        error: aiError.message,
        provider: agent.provider,
        model: agent.model,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        stack: aiError.stack
      });

      this.handleAiError(aiError, agent);
    }

    // Check for empty response
    if (!fullResponse || fullResponse.trim().length === 0) {
      logger.warn(`Empty response received for agent ${agentId}, user ${userId}`, {
        provider: agent.provider,
        model: agent.model,
        messageCount: dbMessages.length,
        contextLength: context?.length || 0
      });

      throw new HttpException(
        400,
        chatConfig.aiProcessing.emptyResponseMessage
      );
    }

    // Cache the new response for future use
    await this.unifiedCacheService.setCachedResponse(
      userMessage,
      fullResponse,
      agentId,
      userId,
      context
    );

    return { response: fullResponse, isFromCache: false };
  }

  /**
   * Handle AI service errors with specific error types
   */
  private handleAiError(aiError: any, agent: any): never {
    const errorMessage = aiError.message?.toLowerCase() || '';

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("api key") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("expired") ||
      errorMessage.includes("signature") ||
      errorMessage.includes("token")
    ) {
      throw new HttpException(
        400,
        `Invalid or expired API key for ${agent.provider}. Please update your agent's API key.`
      );
    }

    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      throw new HttpException(
        429,
        chatConfig.aiProcessing.rateLimitMessage
      );
    }

    if (errorMessage.includes("model") && (errorMessage.includes("not found") || errorMessage.includes("does not exist"))) {
      throw new HttpException(
        400,
        `Model '${agent.model}' is not available for provider '${agent.provider}'. Please check your model configuration.`
      );
    }

    throw new HttpException(
      500,
      `AI service error: ${aiError.message || 'Unknown error occurred'}`
    );
  }
}

export default AiProcessingService;