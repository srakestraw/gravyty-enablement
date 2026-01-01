/**
 * Google Gemini Provider
 * 
 * Implements AIProvider interface for Google Gemini API
 */

import { AIProvider, AIProviderName, ChatMessage, ChatResponse, EmbeddingOptions, ChatOptions, ImageOptions, ImageResponse, AIProviderError, AITimeoutError, AIAuthError, AIConfigError } from '../types';
import { ssmClient } from '../../aws/ssmClient';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { initializeVertexAiCredentials, getGcpProjectId, getGcpRegion } from './vertexAiCredentials';
import { GoogleAuth } from 'google-auth-library';
import { PredictionServiceClient } from '@google-cloud/aiplatform';

const GEMINI_API_KEY_PARAM = process.env.GEMINI_API_KEY_PARAM || '/enablement-portal/gemini/api-key';
const GEMINI_EMBEDDINGS_MODEL = process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'imagen-3';
const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);

// Cache API key in memory to avoid repeated SSM calls
let cachedApiKey: string | null = null;
let apiKeyCacheTime: number = 0;
const API_KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get Google Gemini API key from SSM Parameter Store
 */
async function getApiKey(): Promise<string> {
  // Return cached key if still valid
  if (cachedApiKey && Date.now() - apiKeyCacheTime < API_KEY_CACHE_TTL_MS) {
    return cachedApiKey;
  }

  try {
    const command = new GetParameterCommand({
      Name: GEMINI_API_KEY_PARAM,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    const apiKey = response.Parameter?.Value;

    if (!apiKey || apiKey === 'REPLACE_WITH_GEMINI_API_KEY') {
      throw new AIConfigError('gemini', 'Google Gemini API key not configured');
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
      'gemini',
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
        throw new AIAuthError('gemini', errorData?.error?.message || errorText);
      }

      throw new AIProviderError(
        errorData?.error?.message || `Gemini API error: ${errorText}`,
        errorData?.error?.code || 'API_ERROR',
        'gemini'
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AIProviderError || error instanceof AIAuthError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AITimeoutError('gemini', timeoutMs);
    }
    throw new AIProviderError(
      `Gemini API request failed: ${error instanceof Error ? error.message : String(error)}`,
      'REQUEST_ERROR',
      'gemini',
      error instanceof Error ? error : undefined
    );
  }
}

export class GeminiProvider implements AIProvider {
  getName(): AIProviderName {
    return 'gemini';
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const apiKey = await getApiKey();
    const model = options?.model || GEMINI_EMBEDDINGS_MODEL;
    const timeoutMs = options?.timeoutMs || GEMINI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      // Gemini Embeddings API endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

      const response = await makeRequest<{
        embedding: { values: number[] };
      }>(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
        },
        timeoutMs
      );

      const latency = Date.now() - startTime;
      console.log(`[Gemini] Embedding generated: model=${model}, latency=${latency}ms`);

      return response.embedding.values;
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[Gemini] Embedding failed: model=${model}, latency=${latency}ms`, error);
      throw error;
    }
  }

  async createChatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const apiKey = await getApiKey();
    const model = options?.model || GEMINI_CHAT_MODEL;
    const timeoutMs = options?.timeoutMs || GEMINI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      // Gemini Chat API endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Convert messages to Gemini format
      // Gemini uses a different message structure - we'll combine system/user messages
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      
      for (const msg of messages) {
        if (msg.role === 'system') {
          // Gemini doesn't have a separate system role, prepend to first user message
          if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
            // Create a user message with system content prepended
            contents.push({
              role: 'user',
              parts: [{ text: `System: ${msg.content}` }],
            });
          } else {
            // Prepend to last user message
            const lastMsg = contents[contents.length - 1];
            lastMsg.parts[0].text = `System: ${msg.content}\n\n${lastMsg.parts[0].text}`;
          }
        } else {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      const requestBody: any = {
        contents,
      };

      // Gemini generation config
      const generationConfig: any = {};
      if (options?.temperature !== undefined) {
        generationConfig.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }
      if (Object.keys(generationConfig).length > 0) {
        requestBody.generationConfig = generationConfig;
      }

      const response = await makeRequest<{
        candidates: Array<{
          content: { parts: Array<{ text: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount: number;
          candidatesTokenCount: number;
          totalTokenCount: number;
        };
      }>(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs
      );

      const latency = Date.now() - startTime;
      const usage = response.usageMetadata;
      console.log(`[Gemini] Chat completion: model=${model}, prompt_tokens=${usage?.promptTokenCount || 'unknown'}, completion_tokens=${usage?.candidatesTokenCount || 'unknown'}, latency=${latency}ms`);

      if (!response.candidates || response.candidates.length === 0) {
        throw new AIProviderError('No candidates returned from Gemini API', 'NO_CANDIDATES', 'gemini');
      }

      return {
        content: response.candidates[0].content.parts[0].text,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        } : undefined,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[Gemini] Chat completion failed: model=${model}, latency=${latency}ms`, error);
      throw error;
    }
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse> {
    const model = options?.model || GEMINI_IMAGE_MODEL;
    const timeoutMs = options?.timeoutMs || GEMINI_TIMEOUT_MS;

    const startTime = Date.now();

    try {
      // Initialize Vertex AI credentials (sets GOOGLE_APPLICATION_CREDENTIALS)
      // This will throw AIConfigError if credentials are not configured
      try {
        await initializeVertexAiCredentials();
      } catch (error) {
        // Re-throw with more context
        if (error instanceof AIConfigError) {
          throw new AIConfigError(
            'gemini',
            `Vertex AI credentials not configured. ${error.message} For image generation, you can use OpenAI provider instead, or configure Vertex AI following: docs/runbooks/vertex-ai-setup.md`
          );
        }
        throw error;
      }

      const projectId = getGcpProjectId();
      const region = getGcpRegion();

      // Ensure credentials are set before initializing GoogleAuth
      // initializeVertexAiCredentials() should have set GOOGLE_APPLICATION_CREDENTIALS
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new AIAuthError('gemini', 'GOOGLE_APPLICATION_CREDENTIALS not set after initialization');
      }

      // Initialize Google Auth client for Application Default Credentials
      // Explicitly set credentials file path if available
      const authOptions: any = {
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId: projectId,
      };
      
      // If credentials file is set, use it explicitly
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      const auth = new GoogleAuth(authOptions);
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      
      // getAccessToken() returns { token: string, res: ... }
      const accessToken = tokenResponse?.token || tokenResponse;

      if (!accessToken) {
        throw new AIAuthError('gemini', 'Failed to obtain access token for Vertex AI');
      }

      // Vertex AI Imagen API endpoint
      // Imagen uses model: imagegeneration@006
      // Endpoint format: https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:predict
      const imagenModel = model === 'imagen-3' ? 'imagegeneration@006' : model;
      const apiEndpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${imagenModel}:predict`;

      // Imagen API request body structure
      // Vertex AI prediction API format for Imagen
      const requestBody: any = {
        instances: [
          {
            prompt: prompt,
          },
        ],
        parameters: {
          sampleCount: 1,
        },
      };

      // Map size options (Imagen supports: 256x256, 512x512, 1024x1024)
      if (options?.size) {
        // Extract dimensions from size string (e.g., "1024x1024")
        const [width, height] = options.size.split('x').map(Number);
        if (width && height) {
          // Imagen uses aspectRatio parameter
          if (width === height) {
            requestBody.parameters.aspectRatio = '1:1';
          } else if (width > height) {
            requestBody.parameters.aspectRatio = `${width / height}:1`;
          } else {
            requestBody.parameters.aspectRatio = `1:${height / width}`;
          }
        }
      }

      // Map quality options if supported
      if (options?.quality === 'hd') {
        requestBody.parameters.safetyFilterLevel = 'block_some';
      }

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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
            throw new AIAuthError(
              'gemini',
              errorData?.error?.message || `Vertex AI authentication failed: ${errorText}`
            );
          }

          throw new AIProviderError(
            errorData?.error?.message || `Vertex AI API error: ${errorText}`,
            errorData?.error?.code || 'API_ERROR',
            'gemini'
          );
        }

        const responseData = await response.json();

        // Parse Imagen API response
        // Vertex AI predict endpoint returns: { predictions: [{ bytesBase64Encoded: string, mimeType: string }] }
        const predictions = responseData.predictions || [];
        
        if (!predictions || predictions.length === 0) {
          throw new AIProviderError(
            'No predictions returned from Imagen API',
            'NO_PREDICTIONS',
            'gemini'
          );
        }

        const prediction = predictions[0];
        
        // Imagen returns base64-encoded image data
        // We need to convert it to a data URL or upload to storage
        // For now, return as data URL
        const imageData = prediction.bytesBase64Encoded || prediction.imageBytes || prediction.base64;
        const mimeType = prediction.mimeType || 'image/png';
        
        if (!imageData) {
          throw new AIProviderError(
            'No image data in Imagen API response',
            'NO_IMAGE_DATA',
            'gemini'
          );
        }

        const dataUrl = `data:${mimeType};base64,${imageData}`;

        const latency = Date.now() - startTime;
        console.log(`[Gemini] Image generated via Vertex AI Imagen: model=${model}, latency=${latency}ms`);

        return {
          url: dataUrl,
          // Imagen doesn't provide revised prompts like DALL-E
          revisedPrompt: undefined,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof AIProviderError || error instanceof AIAuthError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AITimeoutError('gemini', timeoutMs);
        }
        throw error;
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[Gemini] Image generation failed: model=${model}, latency=${latency}ms`, error);
      
      if (error instanceof AIProviderError || error instanceof AIAuthError || error instanceof AIConfigError || error instanceof AITimeoutError) {
        throw error;
      }
      
      throw new AIProviderError(
        `Image generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'GENERATION_ERROR',
        'gemini',
        error instanceof Error ? error : undefined
      );
    }
  }
}

