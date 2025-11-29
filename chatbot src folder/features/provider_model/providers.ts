import { createGroq, groq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// Create default groq provider for backward compatibility (only if API key is provided)
const defaultGroqProvider = process.env.GROQ_API_KEY
  ? createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

export const languageModels = defaultGroqProvider
  ? {
      "kimi-k2": defaultGroqProvider("moonshotai/kimi-k2-instruct"),
      "meta-llama/llama-4-scout-17b-16e-instruct": defaultGroqProvider(
        "meta-llama/llama-4-scout-17b-16e-instruct"
      ),
      "llama-3.1-8b-instant": defaultGroqProvider("llama-3.1-8b-instant"),
      "deepseek-r1-distill-llama-70b": wrapLanguageModel({
        middleware: extractReasoningMiddleware({
          tagName: "think",
        }),
        model: defaultGroqProvider("deepseek-r1-distill-llama-70b"),
      }),
      "llama-3.3-70b-versatile": defaultGroqProvider("llama-3.3-70b-versatile"),
    }
  : {}; // Empty object if no global API key

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "kimi-k2";

/**
 * Create a Groq model instance with a custom API key
 * This allows per-agent API key usage instead of global environment variables
 */
export const createGroqModel = (modelName: string, apiKey: string) => {
  const customGroqProvider = createGroq({
    apiKey: apiKey,
  });
  return customGroqProvider(modelName);
};

/**
 * Create a model instance with custom API key for any supported provider
 * Currently only supports Groq, but can be extended for other providers
 */
export const createModelWithApiKey = (
  provider: string,
  modelName: string,
  apiKey: string
) => {
  switch (provider.toLowerCase()) {
    case "groq":
      return createGroqModel(modelName, apiKey);
    // Add other providers here as needed
    // case "openai":
    //   return createOpenAI({ apiKey })(modelName);
    // case "anthropic":
    //   return createAnthropic({ apiKey })(modelName);
    default:
      throw new Error(`Provider ${provider} not supported for custom API keys`);
  }
};
