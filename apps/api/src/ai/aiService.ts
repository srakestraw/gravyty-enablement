/**
 * AI Service
 * 
 * Factory and unified API for AI providers (OpenAI, Google Gemini)
 */

import { AIProvider, AIProviderName, ChatMessage, ChatResponse, EmbeddingOptions, ChatOptions, ImageOptions, ImageResponse } from './types';
import { OpenAIProvider } from './providers/openaiProvider';
import { GeminiProvider } from './providers/geminiProvider';

const AI_DEFAULT_PROVIDER = (process.env.AI_DEFAULT_PROVIDER || 'openai') as AIProviderName;

// Cache provider instances (singleton pattern per provider)
const providerCache: Map<AIProviderName, AIProvider> = new Map();

/**
 * Get AI provider instance
 */
function getProvider(providerName?: AIProviderName): AIProvider {
  const provider = providerName || AI_DEFAULT_PROVIDER;

  // Return cached instance if available
  if (providerCache.has(provider)) {
    return providerCache.get(provider)!;
  }

  // Create new provider instance
  let providerInstance: AIProvider;
  switch (provider) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    case 'gemini':
      providerInstance = new GeminiProvider();
      break;
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }

  // Cache the instance
  providerCache.set(provider, providerInstance);
  return providerInstance;
}

/**
 * Generate embeddings for text
 * 
 * @param text - Text to generate embeddings for
 * @param options - Options including provider override, timeout, and model
 * @returns Embedding vector
 */
export async function generateEmbedding(
  text: string,
  options?: {
    provider?: AIProviderName;
    timeoutMs?: number;
    model?: string;
  }
): Promise<number[]> {
  const provider = getProvider(options?.provider);
  const embeddingOptions: EmbeddingOptions = {
    timeoutMs: options?.timeoutMs,
    model: options?.model,
  };
  return provider.generateEmbedding(text, embeddingOptions);
}

/**
 * Create chat completion
 * 
 * @param messages - Array of chat messages
 * @param options - Options including provider override, timeout, model, temperature, and maxTokens
 * @returns Chat response with content and usage metrics
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options?: {
    provider?: AIProviderName;
    timeoutMs?: number;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ChatResponse> {
  const provider = getProvider(options?.provider);
  const chatOptions: ChatOptions = {
    timeoutMs: options?.timeoutMs,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  };
  return provider.createChatCompletion(messages, chatOptions);
}

/**
 * Generate image from prompt
 * 
 * @param prompt - Text prompt for image generation
 * @param options - Options including provider override, timeout, model, size, quality, and style
 * @returns Image response with URL and optional revised prompt
 */
export async function generateImage(
  prompt: string,
  options?: {
    provider?: AIProviderName;
    timeoutMs?: number;
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  }
): Promise<ImageResponse> {
  const provider = getProvider(options?.provider);
  const imageOptions: ImageOptions = {
    timeoutMs: options?.timeoutMs,
    model: options?.model,
    size: options?.size,
    quality: options?.quality,
    style: options?.style,
  };
  return provider.generateImage(prompt, imageOptions);
}

/**
 * Get the default provider name
 */
export function getDefaultProvider(): AIProviderName {
  return AI_DEFAULT_PROVIDER;
}

/**
 * Clear provider cache (useful for testing or key rotation)
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

// Export types for convenience
export type { ChatMessage, ChatResponse, ImageResponse, AIProviderName } from './types';
export { AIProviderError, AITimeoutError, AIAuthError, AIConfigError } from './types';


