/**
 * Token Cost Calculator Utility
 * Provides centralized token cost estimation for analytics and billing
 */

/**
 * Cost rates per 1K tokens for different providers (in USD)
 */
const COST_RATES_PER_1K_TOKENS: Record<string, number> = {
  'openai': 0.002,
  'anthropic': 0.008,
  'groq': 0.001,
  'google': 0.001,
};

/**
 * Estimate token cost based on response length and provider
 * Uses a rough approximation of 4 characters per token
 */
export function estimateTokenCost(provider: string, responseLength: number): number {
  const estimatedTokens = Math.ceil(responseLength / 4);
  const rate = COST_RATES_PER_1K_TOKENS[provider.toLowerCase()] || COST_RATES_PER_1K_TOKENS['openai'];
  return (estimatedTokens / 1000) * rate;
}

/**
 * Get cost rate for a specific provider
 */
export function getCostRate(provider: string): number {
  return COST_RATES_PER_1K_TOKENS[provider.toLowerCase()] || COST_RATES_PER_1K_TOKENS['openai'];
}

/**
 * Estimate tokens from text length
 */
export function estimateTokens(textLength: number): number {
  return Math.ceil(textLength / 4);
}