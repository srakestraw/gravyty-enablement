/**
 * Brain Ingestion Lambda Worker
 * 
 * Processes documents from SQS queue:
 * 1. Downloads source file from S3
 * 2. Extracts text (plain text for now; PDF support deferred)
 * 3. Chunks text (~500-800 tokens with overlap)
 * 4. Generates embeddings via OpenAI
 * 5. Stores chunks in OpenSearch Serverless
 * 6. Updates document status in DynamoDB
 */

import { SQSHandler, SQSEvent } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import { DynamoDBClient as EventsDynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient as EventsDynamoDocClient, PutCommand as EventsPutCommand } from '@aws-sdk/lib-dynamodb';
import type { BrainDocument } from '@gravyty/domain';
import pdfParse from 'pdf-parse';
import { convert as htmlToText } from 'html-to-text';
import { generateEmbedding } from '../../apps/api/src/ai/aiService';

const s3Client = new S3Client({});
const dynamoDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const eventsDynamoDocClient = EventsDynamoDocClient.from(new EventsDynamoDBClient({}));

const EVENTS_TABLE = process.env.DDB_TABLE_EVENTS || 'events';

const DOCUMENTS_TABLE = process.env.DDB_TABLE_BRAIN_DOCUMENTS || 'brain_documents';
const CHUNKS_TABLE = process.env.DDB_TABLE_BRAIN_CHUNKS || 'brain_chunks';
const LMS_TRANSCRIPTS_TABLE = process.env.LMS_TRANSCRIPTS_TABLE || 'lms_transcripts';
const LMS_LESSONS_TABLE = process.env.LMS_LESSONS_TABLE || 'lms_lessons';
const LMS_COURSES_TABLE = process.env.LMS_COURSES_TABLE || 'lms_courses';
const S3_BUCKET = process.env.S3_BUCKET || '';
const OPENSEARCH_COLLECTION_NAME = process.env.OPENSEARCH_COLLECTION_NAME || 'enablement-brain';
const OPENSEARCH_INDEX_NAME = process.env.OPENSEARCH_INDEX_NAME || 'brain-chunks';
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || '';
const OPENAI_EMBEDDINGS_MODEL = process.env.OPENAI_EMBEDDINGS_MODEL || 'text-embedding-3-small';

// Token estimation: ~4 characters per token (rough approximation)
const TARGET_CHUNK_TOKENS = 600;
const CHUNK_OVERLAP_TOKENS = 100;
const MAX_CHUNK_TOKENS = 800;

// Safety limits
const MAX_CHUNKS_PER_DOC = parseInt(process.env.MAX_CHUNKS_PER_DOC || '200', 10);
const MAX_TOTAL_TOKENS_PER_DOC = parseInt(process.env.MAX_TOTAL_TOKENS_PER_DOC || '120000', 10);
const OPENSEARCH_READY_TIMEOUT_MS = parseInt(process.env.OPENSEARCH_READY_TIMEOUT_MS || '120000', 10); // 2 minutes
const OPENSEARCH_RETRY_DELAY_MS = 2000; // Start with 2 seconds
const URL_FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MIN_EXTRACTED_TEXT_LENGTH = 100; // Minimum characters for valid extraction

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text into overlapping segments
 */
function chunkText(text: string): Array<{ text: string; startIndex: number; endIndex: number }> {
  const chunks: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  const targetChars = TARGET_CHUNK_TOKENS * 4; // ~4 chars per token
  const overlapChars = CHUNK_OVERLAP_TOKENS * 4;
  const maxChars = MAX_CHUNK_TOKENS * 4;

  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + targetChars, text.length);
    
    // Try to break at sentence boundary
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex);
      const lastNewline = text.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > startIndex + targetChars * 0.5) {
        endIndex = breakPoint + 1;
      }
    }
    
    const chunkText = text.slice(startIndex, endIndex).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
      });
    }
    
    // Move start forward with overlap
    startIndex = Math.max(endIndex - overlapChars, startIndex + 1);
    
    if (startIndex >= text.length) break;
  }
  
  return chunks;
}


/**
 * Initialize OpenSearch client
 */
function getOpenSearchClient() {
  const endpoint = OPENSEARCH_ENDPOINT.replace(/^https?:\/\//, '');
  
  return new Client({
    node: `https://${endpoint}`,
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: defaultProvider(),
    }),
  });
}

/**
 * Wait for OpenSearch to be ready with exponential backoff
 */
async function waitForOpenSearchReady(client: Client, maxWaitMs: number): Promise<void> {
  const startTime = Date.now();
  let delay = OPENSEARCH_RETRY_DELAY_MS;
  let attempt = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check cluster health
      const healthResponse = await client.cluster.health({ timeout: '5s' });
      if (healthResponse.status === 'green' || healthResponse.status === 'yellow') {
        // Check if index exists
        const indexExists = await client.indices.exists({ index: OPENSEARCH_INDEX_NAME });
        if (indexExists) {
          console.log(`[OpenSearch] Ready after ${attempt} attempts`);
          return;
        }
      }
    } catch (error) {
      console.warn(`[OpenSearch] Not ready yet (attempt ${attempt}):`, error instanceof Error ? error.message : String(error));
    }

    attempt++;
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 10000); // Exponential backoff, max 10s
  }

  throw new Error(`OpenSearch not ready after ${maxWaitMs}ms (${attempt} attempts)`);
}

/**
 * Ensure OpenSearch index exists
 */
async function ensureIndexExists(client: Client) {
  const indexExists = await client.indices.exists({ index: OPENSEARCH_INDEX_NAME });
  
  if (!indexExists) {
    await client.indices.create({
      index: OPENSEARCH_INDEX_NAME,
      body: {
        mappings: {
          properties: {
            doc_id: { type: 'keyword' },
            chunk_id: { type: 'keyword' },
            text: { type: 'text' },
            title: { type: 'text' },
            tags: { type: 'keyword' },
            product_suite: { type: 'keyword' },
            product_concept: { type: 'keyword' },
            embedding: {
              type: 'knn_vector',
              dimension: 1536, // text-embedding-3-small dimension
              method: {
                name: 'hnsw',
                space_type: 'cosinesimil',
                engine: 'nmslib',
              },
            },
          },
        },
      },
    });
    console.log(`[OpenSearch] Created index: ${OPENSEARCH_INDEX_NAME}`);
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch URL and convert HTML to text
 */
async function fetchAndExtractTextFromURL(url: string): Promise<{ text: string; html: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnablementPortal/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Convert HTML to text, removing scripts, styles, nav elements
    const text = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'footer', format: 'skip' },
      ],
    });

    return { text, html };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('URL fetch timeout');
    }
    throw new Error(`URL fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Store snapshot in S3 (for URL sources)
 */
async function storeSnapshot(docId: string, html: string, text: string): Promise<{ htmlKey: string; textKey: string }> {
  const htmlKey = `brain/${docId}/snapshot.html`;
  const textKey = `brain/${docId}/snapshot.txt`;

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: htmlKey,
    Body: html,
    ContentType: 'text/html',
  }));

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: textKey,
    Body: text,
    ContentType: 'text/plain',
  }));

  return { htmlKey, textKey };
}

/**
 * Emit ingestion event
 */
async function emitIngestionEvent(
  eventName: string,
  docId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const dateBucket = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const eventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await eventsDynamoDocClient.send(new EventsPutCommand({
      TableName: EVENTS_TABLE,
      Item: {
        date_bucket: dateBucket,
        'ts#event_id': `${timestamp}#${eventId}`,
        event_name: eventName,
        user_id: 'system',
        metadata: {
          doc_id: docId,
          ...metadata,
        },
        timestamp,
      },
    }));
  } catch (error) {
    console.warn(`Failed to emit event ${eventName}:`, error);
    // Don't throw - event tracking is non-critical
  }
}

/**
 * Process a single document
 */
async function processDocument(docId: string, isReindex: boolean = false): Promise<void> {
  const startTime = Date.now();
  
  // Emit ingestion started event
  await emitIngestionEvent('brain_document_ingest_started', docId);

  // Get document from DynamoDB
  const docResponse = await dynamoDocClient.send(new GetCommand({
    TableName: DOCUMENTS_TABLE,
    Key: { doc_id: docId },
  }));

  if (!docResponse.Item) {
    throw new Error(`Document ${docId} not found`);
  }

  const doc = docResponse.Item as BrainDocument;

  // Check if document is expired
  if (doc.status === 'Expired') {
    errorCode = 'CONFIGURATION_ERROR';
    errorMessage = 'Cannot ingest expired document';
    throw new Error(errorMessage);
  }

  // If reindex, delete existing vectors first
  if (isReindex) {
    try {
      const osClient = getOpenSearchClient();
      await osClient.deleteByQuery({
        index: OPENSEARCH_INDEX_NAME,
        body: {
          query: {
            term: { doc_id: docId },
          },
        },
      });
      console.log(`[${docId}] Deleted existing vectors for reindex`);
    } catch (error) {
      console.warn(`[${docId}] Failed to delete existing vectors:`, error);
      // Continue with reindex even if deletion fails
    }
  }

  // Update status to Ingesting
  await dynamoDocClient.send(new UpdateCommand({
    TableName: DOCUMENTS_TABLE,
    Key: { doc_id: docId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'Ingesting' },
  }));

  let errorCode = 'UNKNOWN_ERROR';
  let errorMessage = '';
  let extractedText = '';
  let extractedSource: string | undefined;
  let extractedCharCount: number | undefined;
  let snapshotS3Key: string | undefined;

  try {
    // Extract text based on source type
    if (doc.source_type === 'url:web') {
      // URL ingestion: fetch and convert HTML to text
      if (!doc.source_url) {
        errorCode = 'CONFIGURATION_ERROR';
        errorMessage = 'source_url is required for url:web sources';
        throw new Error(errorMessage);
      }

      console.log(`[${docId}] Fetching URL: ${doc.source_url}`);
      const { text, html } = await fetchAndExtractTextFromURL(doc.source_url);
      extractedText = text;
      extractedSource = 'html-to-text';
      extractedCharCount = text.length;

      // Store snapshot in S3
      const { htmlKey, textKey } = await storeSnapshot(docId, html, text);
      snapshotS3Key = textKey; // Store text key as snapshot reference
      console.log(`[${docId}] Stored snapshot: ${htmlKey}, ${textKey}`);

      // Update s3_key to point to snapshot if not already set
      if (!doc.s3_key) {
        await dynamoDocClient.send(new UpdateCommand({
          TableName: DOCUMENTS_TABLE,
          Key: { doc_id: docId },
          UpdateExpression: 'SET s3_key = :s3Key',
          ExpressionAttributeValues: { ':s3Key': textKey },
        }));
        doc.s3_key = textKey;
      }
    } else if (doc.source_type === 'upload:pdf') {
      // PDF extraction: download and extract text
      console.log(`[${docId}] Extracting text from PDF: ${doc.s3_key}`);
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: doc.s3_bucket,
        Key: doc.s3_key,
      }));

      const buffer = await s3Response.Body?.transformToByteArray();
      if (!buffer || buffer.length === 0) {
        throw new Error('Empty PDF file');
      }

      extractedText = await extractTextFromPDF(Buffer.from(buffer));
      extractedSource = 'pdf-parse';
      extractedCharCount = extractedText.length;

      // Validate extraction result
      if (!extractedText || extractedText.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
        errorCode = 'PDF_TEXT_EXTRACTION_FAILED';
        errorMessage = `PDF text extraction failed or produced too little text (${extractedText.length} chars). The PDF may be image-based or corrupted. Consider using OCR or converting to text manually.`;
        throw new Error(errorMessage);
      }
    } else if (doc.source_type === 'upload:text') {
      // Text file: download as-is
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: doc.s3_bucket,
        Key: doc.s3_key,
      }));

      extractedText = await s3Response.Body?.transformToString() || '';
      extractedSource = 'text';
      extractedCharCount = extractedText.length;
    } else {
      errorCode = 'UNSUPPORTED_SOURCE_TYPE';
      errorMessage = `Unsupported source_type: ${doc.source_type}`;
      throw new Error(errorMessage);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Empty file or unsupported format');
    }

    // Chunk extracted text
    const chunks = chunkText(extractedText);
    console.log(`[${docId}] Generated ${chunks.length} chunks from ${extractedCharCount} characters`);

    // Check chunk limit
    if (chunks.length > MAX_CHUNKS_PER_DOC) {
      errorCode = 'DOCUMENT_TOO_LARGE';
      errorMessage = `Document exceeds maximum of ${MAX_CHUNKS_PER_DOC} chunks. Please split into smaller documents.`;
      throw new Error(errorMessage);
    }

    // Check total token limit
    const totalTokens = chunks.reduce((sum, chunk) => sum + estimateTokens(chunk.text), 0);
    if (totalTokens > MAX_TOTAL_TOKENS_PER_DOC) {
      errorCode = 'DOCUMENT_TOO_LARGE';
      errorMessage = `Document exceeds maximum of ${MAX_TOTAL_TOKENS_PER_DOC} tokens. Please split into smaller documents.`;
      throw new Error(errorMessage);
    }

    // Initialize OpenSearch client and wait for readiness
    const osClient = getOpenSearchClient();
    await waitForOpenSearchReady(osClient, OPENSEARCH_READY_TIMEOUT_MS);
    await ensureIndexExists(osClient);

    // Process each chunk
    let successCount = 0;
    const embedStartTime = Date.now();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${docId}_chunk_${i}`;
      const tokenCount = estimateTokens(chunk.text);

      try {
        // Generate embedding using shared AI service
        const embedding = await generateEmbedding(chunk.text, {
          model: OPENAI_EMBEDDINGS_MODEL,
          timeoutMs: 30000,
        });

        // Store in OpenSearch
        await osClient.index({
          index: OPENSEARCH_INDEX_NAME,
          id: chunkId,
          body: {
            doc_id: docId,
            chunk_id: chunkId,
            text: chunk.text,
            title: doc.title,
            tags: doc.tags || [],
            product_suite: doc.product_suite,
            product_concept: doc.product_concept,
            embedding,
          },
        });

        // Store metadata in DynamoDB
        await dynamoDocClient.send(new PutCommand({
          TableName: CHUNKS_TABLE,
          Item: {
            doc_id: docId,
            chunk_id: chunkId,
            token_count: tokenCount,
            embedding_model: OPENAI_EMBEDDINGS_MODEL,
            created_at: new Date().toISOString(),
            s3_pointer: `${doc.s3_key}:${chunk.startIndex}:${chunk.endIndex}`,
          },
        }));

        successCount++;
      } catch (error) {
        console.error(`[${docId}] Failed to process chunk ${i}:`, error);
        // Continue with other chunks
      }
    }

    const durationMs = Date.now() - startTime;
    const embedDurationMs = Date.now() - embedStartTime;

    // Update document status to Ready with extraction metadata
    const updateExpression: string[] = [
      '#status = :status',
      'chunk_count = :chunkCount',
      'last_error_code = :empty',
      'last_error_message = :emptyMsg',
      'last_error_at = :emptyDate',
      'last_ingest_at = :now',
    ];
    const expressionAttributeValues: Record<string, any> = {
      ':status': 'Ready',
      ':chunkCount': successCount,
      ':empty': null,
      ':emptyMsg': null,
      ':emptyDate': null,
      ':now': new Date().toISOString(),
    };

    if (extractedCharCount !== undefined) {
      updateExpression.push('extracted_char_count = :extractedCharCount');
      expressionAttributeValues[':extractedCharCount'] = extractedCharCount;
    }
    if (extractedSource) {
      updateExpression.push('extracted_source = :extractedSource');
      expressionAttributeValues[':extractedSource'] = extractedSource;
    }
    if (snapshotS3Key) {
      updateExpression.push('snapshot_s3_key = :snapshotS3Key');
      expressionAttributeValues[':snapshotS3Key'] = snapshotS3Key;
    }

    await dynamoDocClient.send(new UpdateCommand({
      TableName: DOCUMENTS_TABLE,
      Key: { doc_id: docId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    console.log(`[${docId}] Successfully processed ${successCount}/${chunks.length} chunks in ${durationMs}ms`);

    // Emit ingestion completed event
    await emitIngestionEvent('brain_document_ingest_completed', docId, {
      chunk_count: successCount,
      total_chunks: chunks.length,
      duration_ms: durationMs,
      embed_duration_ms: embedDurationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Determine error code
    if (!errorCode || errorCode === 'UNKNOWN_ERROR') {
      if (error instanceof Error) {
        if (error.message.includes('OpenSearch not ready')) {
          errorCode = 'OPENSEARCH_NOT_READY';
        } else if (error.message.includes('timeout')) {
          errorCode = 'TIMEOUT';
        } else if (error.message.includes('OpenAI') || error.message.includes('AI provider')) {
          errorCode = 'OPENAI_API_ERROR';
        } else {
          errorCode = 'PROCESSING_ERROR';
        }
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
    }

    // Update document status to Failed with error details
    await dynamoDocClient.send(new UpdateCommand({
      TableName: DOCUMENTS_TABLE,
      Key: { doc_id: docId },
      UpdateExpression: 'SET #status = :status, error_message = :error, last_error_code = :errorCode, last_error_message = :errorMsg, last_error_at = :errorAt, chunk_count = :chunkCount',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'Failed',
        ':error': errorMessage,
        ':errorCode': errorCode,
        ':errorMsg': errorMessage.length > 500 ? errorMessage.substring(0, 500) : errorMessage,
        ':errorAt': new Date().toISOString(),
        ':chunkCount': 0,
      },
    }));

    // Emit ingestion failed event
    await emitIngestionEvent('brain_document_ingest_failed', docId, {
      error_code: errorCode,
      error_message: errorMessage,
      duration_ms: durationMs,
    });

    // Re-throw if it's a retriable error (OpenSearch not ready)
    if (errorCode === 'OPENSEARCH_NOT_READY') {
      throw error; // SQS will retry
    }

    throw error;
  }
}

/**
 * Process a transcript for RAG ingestion
 */
async function processTranscript(transcriptId: string, lessonId: string): Promise<void> {
  console.log(`[${transcriptId}] Processing transcript for lesson ${lessonId}`);

  // Get transcript from DynamoDB
  const transcriptResponse = await dynamoDocClient.send(new GetCommand({
    TableName: LMS_TRANSCRIPTS_TABLE,
    Key: { transcript_id: transcriptId },
  }));

  if (!transcriptResponse.Item) {
    throw new Error(`Transcript ${transcriptId} not found`);
  }

  const transcript = transcriptResponse.Item as any;
  const transcriptText = transcript.full_text;

  if (!transcriptText || transcriptText.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new Error(`Transcript ${transcriptId} has insufficient text (${transcriptText?.length || 0} chars)`);
  }

  // Get lesson and course metadata
  let lessonTitle = 'Video Lesson';
  let courseId = '';
  let courseTitle = 'Course';

  if (lessonId) {
    try {
      const lessonResponse = await dynamoDocClient.send(new GetCommand({
        TableName: LMS_LESSONS_TABLE,
        Key: { lesson_id: lessonId },
      }));

      if (lessonResponse.Item) {
        lessonTitle = lessonResponse.Item.title || lessonTitle;
        courseId = lessonResponse.Item.course_id || '';

        if (courseId) {
          const courseResponse = await dynamoDocClient.send(new GetCommand({
            TableName: LMS_COURSES_TABLE,
            Key: { course_id: courseId },
          }));

          if (courseResponse.Item) {
            courseTitle = courseResponse.Item.title || courseTitle;
          }
        }
      }
    } catch (error) {
      console.warn(`[${transcriptId}] Failed to fetch lesson/course metadata:`, error);
      // Continue without metadata
    }
  }

  // Chunk transcript text
  const chunks = chunkText(transcriptText);
  console.log(`[${transcriptId}] Chunked transcript into ${chunks.length} chunks`);

  if (chunks.length === 0) {
    throw new Error(`No chunks created for transcript ${transcriptId}`);
  }

  // Get OpenSearch client
  const osClient = getOpenSearchClient();

  // Process chunks
  let successCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = `transcript_${transcriptId}_chunk_${i}`;
    const tokenCount = estimateTokens(chunk.text);

    try {
      // Generate embedding using shared AI service
      const embedding = await generateEmbedding(chunk.text, {
        model: OPENAI_EMBEDDINGS_MODEL,
        timeoutMs: 30000,
      });

      // Store in OpenSearch
      await osClient.index({
        index: OPENSEARCH_INDEX_NAME,
        id: chunkId,
        body: {
          doc_id: `transcript_${transcriptId}`,
          chunk_id: chunkId,
          text: chunk.text,
          title: lessonTitle,
          tags: [],
          product_suite: undefined, // Could be added from course metadata if needed
          product_concept: undefined,
          lesson_id: lessonId,
          course_id: courseId,
          course_title: courseTitle,
          transcript_id: transcriptId,
          embedding,
        },
      });

      // Store metadata in DynamoDB (optional, for tracking)
      await dynamoDocClient.send(new PutCommand({
        TableName: CHUNKS_TABLE,
        Item: {
          doc_id: `transcript_${transcriptId}`,
          chunk_id: chunkId,
          token_count: tokenCount,
          embedding_model: OPENAI_EMBEDDINGS_MODEL,
          created_at: new Date().toISOString(),
        },
      }));

      successCount++;
    } catch (error) {
      console.error(`[${transcriptId}] Failed to process chunk ${i}:`, error);
      // Continue with other chunks
    }
  }

  console.log(`[${transcriptId}] Successfully indexed ${successCount}/${chunks.length} chunks`);
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Received SQS event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    const messageType = messageBody.type; // 'transcript' or undefined (defaults to document)
    
    if (messageType === 'transcript') {
      // Process transcript
      const transcriptId = messageBody.transcript_id;
      const lessonId = messageBody.lesson_id;
      
      if (!transcriptId) {
        console.error('Invalid transcript message: missing transcript_id');
        continue;
      }

      try {
        await processTranscript(transcriptId, lessonId);
      } catch (error) {
        console.error(`Failed to process transcript ${transcriptId}:`, error);
        // Message will be retried or sent to DLQ
        throw error;
      }
    } else {
      // Process document (existing logic)
      const docId = messageBody.doc_id;
      const isReindex = messageBody.reindex === true;
      const mode = messageBody.mode; // 'url' for URL ingestion
      
      if (!docId) {
        console.error('Invalid message: missing doc_id');
        continue;
      }

      try {
        // For URL mode, the document should already exist with source_url set
        // The processDocument function will handle fetching and extraction
        await processDocument(docId, isReindex);
      } catch (error) {
        console.error(`Failed to process document ${docId}:`, error);
        // Message will be retried or sent to DLQ
        throw error;
      }
    }
  }
};

