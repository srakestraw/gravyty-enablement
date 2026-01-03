/**
 * AI Provider Types
 * 
 * Defines the interface and types for AI providers (OpenAI, Google Gemini, etc.)
 */

export type AIProviderName = 'openai' | 'gemini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EmbeddingOptions {
  timeoutMs?: number;
  model?: string;
}

export interface ChatOptions {
  timeoutMs?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ImageOptions {
  timeoutMs?: number;
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
}

export interface ImageResponse {
  url: string;
  revisedPrompt?: string;
  usage?: {
    promptTokens?: number;
  };
}

/**
 * AI Provider Interface
 * 
 * All AI providers must implement this interface to ensure consistent API
 */
export interface AIProvider {
  /**
   * Generate embeddings for text
   */
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;

  /**
   * Create chat completion
   */
  createChatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Generate image from prompt
   */
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse>;

  /**
   * Get the provider name
   */
  getName(): AIProviderName;
}

/**
 * AI Service Error Types
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: AIProviderName,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(provider: AIProviderName, timeoutMs: number) {
    super(
      `AI provider ${provider} request timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      provider
    );
    this.name = 'AITimeoutError';
  }
}

export class AIAuthError extends AIProviderError {
  constructor(provider: AIProviderName, message?: string) {
    super(
      message || `AI provider ${provider} authentication failed`,
      'AUTH_ERROR',
      provider
    );
    this.name = 'AIAuthError';
  }
}

export class AIConfigError extends AIProviderError {
  constructor(provider: AIProviderName, message: string) {
    super(
      `AI provider ${provider} configuration error: ${message}`,
      'CONFIG_ERROR',
      provider
    );
    this.name = 'AIConfigError';
  }
}


