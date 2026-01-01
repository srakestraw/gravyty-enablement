# AI Service Architecture

## Overview

The AI Service provides a unified, multi-provider abstraction for AI operations including embeddings, chat completions, and image generation. It supports multiple providers (OpenAI and Google Gemini) with config-based default selection and per-request override capability.

## Architecture

```
┌─────────────────────────────────────────┐
│         AI Service (Factory)            │
│  - getProvider(provider?: string)      │
│  - generateEmbedding()                  │
│  - createChatCompletion()               │
│  - generateImage()                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│ OpenAI      │  │ Google      │
│ Provider    │  │ Gemini      │
│             │  │ Provider    │
│ Implements  │  │ Implements  │
│ AIProvider  │  │ AIProvider  │
└─────────────┘  └─────────────┘
```

## Provider Selection

### Config-Based Default

Set the default provider via environment variable:

```bash
AI_DEFAULT_PROVIDER=openai  # or 'gemini'
```

### Per-Request Override

Specify provider in options for individual requests:

```typescript
import { generateEmbedding } from './ai/aiService';

// Use default provider (from AI_DEFAULT_PROVIDER env var)
const embedding = await generateEmbedding('Hello world');

// Override to use Gemini
const embedding = await generateEmbedding('Hello world', {
  provider: 'gemini',
});
```

## Usage Examples

### Embeddings

```typescript
import { generateEmbedding } from './ai/aiService';

// Basic usage (uses default provider)
const embedding = await generateEmbedding('Text to embed');

// With options
const embedding = await generateEmbedding('Text to embed', {
  provider: 'openai',
  model: 'text-embedding-3-small',
  timeoutMs: 30000,
});
```

### Chat Completions

```typescript
import { createChatCompletion, ChatMessage } from './ai/aiService';

const messages: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
];

const response = await createChatCompletion(messages, {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 500,
});

console.log(response.content); // "The capital of France is Paris."
console.log(response.usage); // { promptTokens: 20, completionTokens: 10, totalTokens: 30 }
```

### Image Generation

```typescript
import { generateImage } from './ai/aiService';

const image = await generateImage('A sunset over mountains', {
  provider: 'openai',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd',
  style: 'vivid',
});

console.log(image.url); // URL to generated image
console.log(image.revisedPrompt); // Revised prompt (if provider modified it)
```

## Configuration

### Environment Variables

#### Global Configuration

- `AI_DEFAULT_PROVIDER`: Default provider (`openai` or `gemini`), default: `openai`

#### OpenAI Configuration

- `OPENAI_API_KEY_PARAM`: SSM parameter path for API key, default: `/enablement-portal/openai/api-key`
- `OPENAI_EMBEDDINGS_MODEL`: Embeddings model, default: `text-embedding-3-small`
- `OPENAI_CHAT_MODEL`: Chat model, default: `gpt-4o-mini`
- `OPENAI_IMAGE_MODEL`: Image model, default: `dall-e-3`
- `OPENAI_TIMEOUT_MS`: Request timeout in milliseconds, default: `30000`

#### Google Gemini Configuration

- `GEMINI_API_KEY_PARAM`: SSM parameter path for API key, default: `/enablement-portal/gemini/api-key`
- `GEMINI_EMBEDDINGS_MODEL`: Embeddings model, default: `text-embedding-004`
- `GEMINI_CHAT_MODEL`: Chat model, default: `gemini-2.5-flash`
- `GEMINI_IMAGE_MODEL`: Image model, default: `imagen-3` (Note: requires Vertex AI setup)
- `GEMINI_TIMEOUT_MS`: Request timeout in milliseconds, default: `30000`

#### Vertex AI Configuration (Required for Imagen Image Generation)

- `GCP_SERVICE_ACCOUNT_PARAM`: SSM parameter path for service account JSON, default: `/enablement-portal/gcp/service-account-json`
- `GOOGLE_CLOUD_PROJECT` or `GCP_PROJECT_ID`: GCP project ID (required)
- `GOOGLE_CLOUD_REGION` or `GCP_REGION`: GCP region, default: `us-central1`

**Note**: Image generation via Imagen requires Vertex AI setup. See [Vertex AI Setup Guide](../runbooks/vertex-ai-setup.md) for detailed configuration instructions.

### SSM Parameter Store Setup

Store API keys securely in SSM Parameter Store:

```bash
# OpenAI API key
aws ssm put-parameter \
  --name /enablement-portal/openai/api-key \
  --value "sk-..." \
  --type SecureString

# Google Gemini API key
aws ssm put-parameter \
  --name /enablement-portal/gemini/api-key \
  --value "..." \
  --type SecureString
```

## Error Handling

The service provides specific error types:

```typescript
import { 
  AIProviderError, 
  AITimeoutError, 
  AIAuthError, 
  AIConfigError 
} from './ai/aiService';

try {
  const embedding = await generateEmbedding('text');
} catch (error) {
  if (error instanceof AITimeoutError) {
    // Handle timeout
  } else if (error instanceof AIAuthError) {
    // Handle authentication error (invalid API key)
  } else if (error instanceof AIConfigError) {
    // Handle configuration error (missing API key)
  } else if (error instanceof AIProviderError) {
    // Handle other provider errors
    console.error('Provider:', error.provider);
    console.error('Code:', error.code);
  }
}
```

## Provider Comparison

### OpenAI

**Strengths:**
- Mature API with excellent documentation
- DALL-E 3 for high-quality image generation
- Wide range of models (GPT-4, GPT-3.5, embeddings)

**Models:**
- Embeddings: `text-embedding-3-small`, `text-embedding-3-large`
- Chat: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Image: `dall-e-3`, `dall-e-2`

**Cost:** Pay-per-use pricing

### Google Gemini

**Strengths:**
- Competitive pricing
- Multimodal capabilities
- Google ecosystem integration

**Models:**
- Embeddings: `text-embedding-004`
- Chat: `gemini-1.5-pro`, `gemini-pro`
- Image: `imagen-3` (requires Vertex AI setup)

**Cost:** Pay-per-use pricing (may be more cost-effective)

**Note:** Image generation via Gemini/Imagen requires Vertex AI setup. See [Vertex AI Setup Guide](../runbooks/vertex-ai-setup.md) for configuration instructions.

## Cost Considerations

### Embeddings

- OpenAI `text-embedding-3-small`: ~$0.02 per 1M tokens
- Gemini `text-embedding-004`: Pricing varies, typically competitive

### Chat Completions

- OpenAI `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Gemini `gemini-1.5-pro`: Pricing varies, check current rates

### Image Generation

- OpenAI DALL-E 3: $0.040 per image (1024x1024, standard quality)
- Gemini Imagen: Pricing varies, check current rates

## Best Practices

1. **Use Default Provider**: Set `AI_DEFAULT_PROVIDER` for consistency across the application
2. **Override When Needed**: Use per-request override for specific use cases (e.g., cost optimization, feature requirements)
3. **Error Handling**: Always handle provider-specific errors appropriately
4. **Timeout Configuration**: Set appropriate timeouts based on your use case
5. **Cost Monitoring**: Monitor usage metrics logged by the service
6. **API Key Security**: Never commit API keys; always use SSM Parameter Store

## Migration Guide

### From Direct API Calls

**Before:**
```typescript
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: text,
  }),
});
const embedding = (await response.json()).data[0].embedding;
```

**After:**
```typescript
import { generateEmbedding } from './ai/aiService';

const embedding = await generateEmbedding(text);
```

### Benefits

- **Simplified Code**: No need to handle API details, authentication, timeouts
- **Provider Flexibility**: Easy to switch providers
- **Error Handling**: Consistent error handling across providers
- **Logging**: Built-in usage metrics and logging

## Future Enhancements

- [ ] Support for more providers (Anthropic Claude, etc.)
- [ ] Batch embedding generation
- [ ] Streaming chat completions
- [ ] Automatic provider fallback on errors
- [ ] Cost tracking and budgeting
- [ ] Rate limiting and retry logic

## Related Documentation

- [Architecture Overview](./architecture.md)
- [RAG Architecture](./rag.md)
- [Build Plan - AI Assistant](../prd/Build_Plan_AI_Assistant_Single_Brain_RAG.md)

