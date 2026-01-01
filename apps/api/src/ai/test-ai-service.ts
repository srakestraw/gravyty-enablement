/**
 * Test Script for AI Service
 * 
 * Tests OpenAI and Google Gemini providers for embeddings, chat completions, and image generation
 * 
 * Usage:
 *   npm run test:ai
 *   or
 *   npx tsx apps/api/src/ai/test-ai-service.ts
 */

import { generateEmbedding, createChatCompletion, generateImage, getDefaultProvider } from './aiService';
import { ChatMessage } from './types';

async function testEmbeddings() {
  console.log('\n=== Testing Embeddings ===\n');

  try {
    console.log('Testing OpenAI embeddings...');
    const openaiEmbedding = await generateEmbedding('Hello, world!', {
      provider: 'openai',
    });
    console.log(`✅ OpenAI: Generated embedding with ${openaiEmbedding.length} dimensions`);
    console.log(`   First 5 values: [${openaiEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  } catch (error) {
    console.error('❌ OpenAI embeddings failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    console.log('\nTesting Gemini embeddings...');
    const geminiEmbedding = await generateEmbedding('Hello, world!', {
      provider: 'gemini',
    });
    console.log(`✅ Gemini: Generated embedding with ${geminiEmbedding.length} dimensions`);
    console.log(`   First 5 values: [${geminiEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  } catch (error) {
    console.error('❌ Gemini embeddings failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    console.log('\nTesting default provider embeddings...');
    const defaultEmbedding = await generateEmbedding('Test with default provider');
    console.log(`✅ Default (${getDefaultProvider()}): Generated embedding with ${defaultEmbedding.length} dimensions`);
  } catch (error) {
    console.error('❌ Default provider embeddings failed:', error instanceof Error ? error.message : String(error));
  }
}

async function testChatCompletions() {
  console.log('\n=== Testing Chat Completions ===\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a helpful assistant. Keep responses brief.' },
    { role: 'user', content: 'What is 2+2? Answer in one sentence.' },
  ];

  try {
    console.log('Testing OpenAI chat completion...');
    const openaiResponse = await createChatCompletion(messages, {
      provider: 'openai',
      maxTokens: 50,
    });
    console.log(`✅ OpenAI Response: ${openaiResponse.content}`);
    if (openaiResponse.usage) {
      console.log(`   Usage: ${openaiResponse.usage.promptTokens} prompt + ${openaiResponse.usage.completionTokens} completion = ${openaiResponse.usage.totalTokens} total tokens`);
    }
  } catch (error) {
    console.error('❌ OpenAI chat completion failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    console.log('\nTesting Gemini chat completion...');
    const geminiResponse = await createChatCompletion(messages, {
      provider: 'gemini',
      maxTokens: 50,
    });
    console.log(`✅ Gemini Response: ${geminiResponse.content}`);
    if (geminiResponse.usage) {
      console.log(`   Usage: ${geminiResponse.usage.promptTokens} prompt + ${geminiResponse.usage.completionTokens} completion = ${geminiResponse.usage.totalTokens} total tokens`);
    }
  } catch (error) {
    console.error('❌ Gemini chat completion failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    console.log('\nTesting default provider chat completion...');
    const defaultResponse = await createChatCompletion(messages, {
      maxTokens: 50,
    });
    console.log(`✅ Default (${getDefaultProvider()}) Response: ${defaultResponse.content}`);
  } catch (error) {
    console.error('❌ Default provider chat completion failed:', error instanceof Error ? error.message : String(error));
  }
}

async function testImageGeneration() {
  console.log('\n=== Testing Image Generation ===\n');

  const prompt = 'A serene sunset over mountains, digital art style';

  try {
    console.log('Testing OpenAI image generation...');
    const openaiImage = await generateImage(prompt, {
      provider: 'openai',
      size: '1024x1024',
      quality: 'standard',
    });
    console.log(`✅ OpenAI: Generated image`);
    console.log(`   URL: ${openaiImage.url}`);
    if (openaiImage.revisedPrompt) {
      console.log(`   Revised Prompt: ${openaiImage.revisedPrompt}`);
    }
  } catch (error) {
    console.error('❌ OpenAI image generation failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    console.log('\nTesting Gemini image generation...');
    const geminiImage = await generateImage(prompt, {
      provider: 'gemini',
    });
    console.log(`✅ Gemini: Generated image`);
    console.log(`   URL: ${geminiImage.url}`);
  } catch (error) {
    console.error('❌ Gemini image generation failed:', error instanceof Error ? error.message : String(error));
    console.error('   Note: Gemini image generation requires Vertex AI setup');
  }
}

async function testProviderSelection() {
  console.log('\n=== Testing Provider Selection ===\n');

  console.log(`Default provider: ${getDefaultProvider()}`);
  console.log(`Environment variable AI_DEFAULT_PROVIDER: ${process.env.AI_DEFAULT_PROVIDER || 'not set (defaults to openai)'}`);

  try {
    const embedding1 = await generateEmbedding('test', { provider: 'openai' });
    console.log(`✅ Explicit OpenAI selection: ${embedding1.length} dimensions`);
  } catch (error) {
    console.error('❌ Explicit OpenAI selection failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    const embedding2 = await generateEmbedding('test', { provider: 'gemini' });
    console.log(`✅ Explicit Gemini selection: ${embedding2.length} dimensions`);
  } catch (error) {
    console.error('❌ Explicit Gemini selection failed:', error instanceof Error ? error.message : String(error));
  }
}

async function runTests() {
  console.log('🚀 Starting AI Service Tests\n');
  console.log('=' .repeat(60));

  // Test provider selection first
  await testProviderSelection();

  // Test embeddings
  await testEmbeddings();

  // Test chat completions
  await testChatCompletions();

  // Test image generation
  await testImageGeneration();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test suite completed');
}

// Run tests if this file is executed directly
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { runTests };

