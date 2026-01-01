/**
 * AI Service - Public Exports
 */

export {
  generateEmbedding,
  createChatCompletion,
  generateImage,
  getDefaultProvider,
  clearProviderCache,
} from './aiService';

export type {
  ChatMessage,
  ChatResponse,
  ImageResponse,
  AIProviderName,
} from './types';

export {
  AIProviderError,
  AITimeoutError,
  AIAuthError,
  AIConfigError,
} from './types';

