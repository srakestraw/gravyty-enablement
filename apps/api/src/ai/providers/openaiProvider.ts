/**
 * OpenAI Provider
 * 
 * Implements AIProvider interface for OpenAI API
 */

import { AIProvider, AIProviderName, ChatMessage, ChatResponse, EmbeddingOptions, ChatOptions, ImageOptions, ImageResponse, AIProviderError, AITimeoutError, AIAuthError, AIConfigError } from '../types';
import { ssmClient } from '../../aws/ssmClient';
import { GetParameterCommand } from '@aws-sdk/client-ssm';

const OPENAI_API_KEY_PARAM = process.env.OPENAI_API_KEY_PARAM || '/enablement-portal/openai/api-key';
const OPENAI_EMBEDDINGS_MODEL = process.env.OPENAI_EMBEDDINGS_MODEL || 'text-embedding-3-small';
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '30000', 10);

// Cache API key in memory to avoid repeated SSM calls
let cachedApiKey: string | null = null;
let apiKeyCacheTime: number = 0;
const API_KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get OpenAI API key from SSM Parameter Store
 */
async function getApiKey(): Promise<string> {
  // Return cached key if still valid
  if (cachedApiKey && Date.now() - apiKeyCacheTime < API_KEY_CACHE_TTL_MS) {
    return cachedApiKey;
  }

  try {
    const command = new GetParameterCommand({
      Name: OPENAI_API_KEY_PARAM,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    const apiKey = response.Parameter?.Value;

    if (!apiKey || apiKey === 'REPLACE_WITH_OPENAI_API_KEY') {
      throw new AIConfigError('openai', 'OpenAI API key not configured');
    }

    // Cache the key
    cachedApiKey = apiKey;
    apiKeyCacheTime = Date.now();

    return apiKey;
  } catch (error) {
    if (error instanceof AIConfigError) {
      throw error;
    }
    throw new AIConfigError(
      'openai',
      `Failed to retrieve API key from SSM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Make API request with timeout
 */
async function makeRequest<T>(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use raw text
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear cached key on auth error
        cachedApiKey = null;
        apiKeyCacheTime = 0;
        throw new AIAuthError('openai', errorData?.error?.message || errorText);
      }

      throw new AIProviderError(
        errorData?.error?.message || `OpenAI API error: ${errorText}`,
        errorData?.error?.code || 'API_ERROR',
        'openai'
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AIProviderError || error instanceof AIAuthError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AITimeoutError('openai', timeoutMs);
    }
    throw new AIProviderError(
      `OpenAI API request failed: ${error instanceof Error ? error.message : String(error)}`,
      'REQUEST_ERROR',
      'openai',
      error instanceof Error ? error : undefined
    );
  }
}

export class OpenAIProvider implements AIProvider {
  getName(): AIProviderName {
    return 'openai';
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const apiKey = await getApiKey();
    const model = options?.model || OPENAI_EMBEDDINGS_MODEL;
    const timeoutMs = options?.timeoutMs || OPENAI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      const response = await makeRequest<{
        data: Array<{ embedding: number[] }>;
        usage: { prompt_tokens: number; total_tokens: number };
      }>(
        'https://api.openai.com/v1/embeddings',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: text,
          }),
        },
        timeoutMs
      );

      const latency = Date.now() - startTime;
      console.log(`[OpenAI] Embedding generated: model=${model}, tokens=${response.usage.prompt_tokens}, latency=${latency}ms`);

      return response.data[0].embedding;
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[OpenAI] Embedding failed: model=${model}, latency=${latency}ms`, error);
      throw error;
    }
  }

  async createChatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const apiKey = await getApiKey();
    const model = options?.model || OPENAI_CHAT_MODEL;
    const timeoutMs = options?.timeoutMs || OPENAI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      if (options?.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        requestBody.max_tokens = options.maxTokens;
      }

      const response = await makeRequest<{
        choices: Array<{ message: { role: string; content: string } }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }>(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs
      );

      const latency = Date.now() - startTime;
      console.log(`[OpenAI] Chat completion: model=${model}, prompt_tokens=${response.usage.prompt_tokens}, completion_tokens=${response.usage.completion_tokens}, latency=${latency}ms`);

      return {
        content: response.choices[0].message.content,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[OpenAI] Chat completion failed: model=${model}, latency=${latency}ms`, error);
      throw error;
    }
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse> {
    const apiKey = await getApiKey();
    const model = options?.model || OPENAI_IMAGE_MODEL;
    const timeoutMs = options?.timeoutMs || OPENAI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model,
        prompt,
        n: 1,
      };

      // Map size options (DALL-E 3 supports '1024x1024', '1792x1024', '1024x1792')
      if (options?.size) {
        // DALL-E 3 only supports specific sizes
        if (model === 'dall-e-3') {
          if (options.size === '1024x1024') {
            requestBody.size = '1024x1024';
          } else if (options.size === '512x512' || options.size === '256x256') {
            // DALL-E 3 doesn't support these sizes, use default
            requestBody.size = '1024x1024';
          }
        } else {
          // DALL-E 2 supports more sizes
          requestBody.size = options.size;
        }
      } else {
        // Default for DALL-E 3
        requestBody.size = '1024x1024';
      }

      if (options?.quality) {
        requestBody.quality = options.quality;
      }
      if (options?.style) {
        requestBody.style = options.style;
      }

      const response = await makeRequest<{
        data: Array<{ url: string; revised_prompt?: string }>;
      }>(
        'https://api.openai.com/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs
      );

      const latency = Date.now() - startTime;
      console.log(`[OpenAI] Image generated: model=${model}, latency=${latency}ms`);

      return {
        url: response.data[0].url,
        revisedPrompt: response.data[0].revised_prompt,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[OpenAI] Image generation failed: model=${model}, latency=${latency}ms`, error);
      throw error;
    }
  }
}


