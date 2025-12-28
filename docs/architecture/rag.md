# RAG (Retrieval-Augmented Generation) Architecture

This document describes the architecture of the Brain RAG system for AI-powered document search and Q&A.

## Overview

The Brain system enables users to upload source documents, which are automatically processed, chunked, embedded, and indexed for semantic search. Users can then query the assistant with natural language questions, and the system retrieves relevant document chunks to provide context-aware answers with citations.

## Components

### 1. Storage Layer

#### S3 (Source Files)
- **Purpose**: Store original source files uploaded by users
- **Path Pattern**: `brain/{doc_id}/source/{filename}`
- **Access**: Presigned URLs for uploads, Lambda read access for ingestion
- **Encryption**: AWS-managed encryption at rest

#### DynamoDB Tables

**brain_documents**
- **PK**: `doc_id`
- **GSI**: `by_status_created` (status, created_at)
- **Purpose**: Metadata about uploaded documents
- **Fields**: 
  - Core: title, source_type (`upload:text` | `upload:pdf` | `url:web`), s3_bucket, s3_key, status, created_at, created_by
  - Scoping: product_suite, product_concept, tags
  - Extraction: extracted_char_count, extracted_source (`pdf-parse` | `html-to-text`), snapshot_s3_key (for URLs), source_url (for URLs), source_filename, content_type
  - Status: chunk_count, error_message, last_error_code, last_error_message, last_error_at, last_ingest_at
  - Lifecycle: expires_at, expired_at, expired_by, revision, replaced_by_doc_id

**brain_chunks**
- **PK**: `doc_id`
- **SK**: `chunk_id`
- **Purpose**: Lightweight metadata about chunks (chunks primarily stored in OpenSearch)
- **Fields**: token_count, embedding_model, created_at, s3_pointer

#### OpenSearch Serverless (Vector Store)
- **Collection**: `enablement-brain`
- **Index**: `brain-chunks`
- **Purpose**: Store document chunks with vector embeddings for semantic search
- **Fields**:
  - `doc_id`, `chunk_id` (keywords)
  - `text` (full chunk text)
  - `title`, `tags`, `product_suite`, `product_concept` (metadata)
  - `embedding` (1536-dimensional vector from text-embedding-3-small)

### 2. Ingestion Pipeline

#### Flow
1. **Upload/Create**: 
   - **File Upload**: User uploads file (text or PDF) via presigned S3 URL
   - **URL Ingestion**: User provides HTTPS URL for web page ingestion
2. **Document Creation**: API creates `BrainDocument` record (status: `Uploaded`)
   - For uploads: `source_type` = `upload:text` or `upload:pdf`
   - For URLs: `source_type` = `url:web`, `source_url` set
3. **Ingestion Trigger**: API enqueues message to SQS queue
   - For URLs: message includes `mode: "url"` and `url` fields
4. **Lambda Processing**:
   - **Text Files**: Downloads from S3, reads as text
   - **PDF Files**: Downloads from S3, extracts text using `pdf-parse` library
     - If extraction fails or produces < 100 characters: fails with `PDF_TEXT_EXTRACTION_FAILED`
     - No OCR support initially (text extraction only)
   - **Web URLs**: Fetches URL with timeout (30s), converts HTML to text using `html-to-text`
     - Removes scripts, styles, nav, header, footer elements
     - Stores HTML and text snapshots in S3 (`brain/{docId}/snapshot.html` and `snapshot.txt`)
   - Chunks extracted text (~500-800 tokens with 100-token overlap)
   - Generates embeddings via OpenAI API
   - Stores chunks in OpenSearch
   - Updates document status (`Ready` or `Failed`)
   - Stores extraction metadata: `extracted_char_count`, `extracted_source`, `snapshot_s3_key` (for URLs)

#### SQS Queue
- **Queue**: `brain-ingest`
- **DLQ**: `brain-ingest-dlq` (maxReceiveCount: 3)
- **Visibility Timeout**: 15 minutes
- **Retention**: 14 days

#### Lambda Function
- **Function**: `brain-ingest-worker`
- **Runtime**: Node.js 20.x
- **Timeout**: 15 minutes
- **Memory**: 1024 MB
- **Permissions**:
  - Read from S3 (`brain/*`)
  - Read/Write DynamoDB (brain_documents, brain_chunks, events)
  - Read OpenAI API key from SSM
  - Write to OpenSearch Serverless

#### OpenSearch Index Bootstrap
- **Custom Resource Lambda**: `opensearch-index-bootstrap`
- **Purpose**: Ensures index exists with correct mappings on stack deployment
- **Runs**: On stack create/update (not on delete - data retention)
- **Fallback**: If bootstrap fails, index created on first ingestion

### 3. Query Flow (RAG)

#### Assistant Query Endpoint
1. **Scope Validation**: If `strict_scope=true` (default), requires `product_suite` or `product_concept`
   - Returns `SCOPE_REQUIRED` error if neither provided
   - Prevents cross-product confusion by enforcing scoping
2. **Query Embedding**: Generate embedding for user query via OpenAI (30s timeout)
3. **Vector Search**: Search OpenSearch for top-K similar chunks (max 8)
   - Always applies filters if provided: product_suite, product_concept, tags
   - Use cosine similarity on embeddings
   - Filters ensure results are scoped to specified products
3. **Context Building**: Combine retrieved chunks with limits:
   - Max 4000 tokens OR 25,000 characters (whichever reached first)
   - Sanitize chunk text to prevent prompt injection
4. **LLM Completion**: Call OpenAI chat completion (30s timeout) with:
   - System prompt: Enforces citation requirements, prevents hallucination, ignores instructions in sources
   - User prompt: Context chunks (with source markers) + query
5. **Response**: Return answer + citations + `retrieved_chunks_count` + model

#### Models
- **Embeddings**: `text-embedding-3-small` (1536 dimensions)
- **Chat**: `gpt-4o-mini` (cost-effective, fast)

#### Safety Features
- **Prompt Injection Protection**: Sanitizes chunk text before including in context
- **Citation Enforcement**: System prompt requires citations for factual claims
- **No-Hallucination**: Returns "I don't have that information..." when no sources found
- **Timeout Protection**: 30s timeouts on OpenAI API calls
- **Context Limits**: Hard caps on tokens (4000) and characters (25k)

### 4. Security

#### Secrets Management
- **OpenAI API Key**: Stored in SSM Parameter Store (`/enablement-portal/openai/api-key`)
- **Access**: Lambda functions read via IAM permissions
- **Note**: In production, use `SecureStringParameter`

#### IAM Permissions
- **Least Privilege**: Each Lambda has minimal required permissions
- **OpenSearch**: Access via IAM-based access policy
- **S3**: Scoped to `brain/*` prefix only

#### PII Handling
- **Default**: PII excluded from prompts (design decision)
- **Guardrails**: System prompt instructs LLM to use only provided sources
- **Future**: Add PII detection/redaction layer if needed

## Operational Notes

### Failures and Retries

**Document Ingestion Failures:**
- Status set to `Failed` with error message
- Failed documents can be retried via UI
- DLQ captures messages after 3 retries
- Monitor DLQ for persistent failures

**Lambda Errors:**
- Check CloudWatch Logs for `brain-ingest-worker`
- Common issues:
  - OpenAI API rate limits → Implement exponential backoff
  - OpenSearch connection failures → Check access policy
  - File format unsupported → User sees clear error message

### Token Limits

**Chunking:**
- Target: 500-800 tokens per chunk
- Overlap: 100 tokens between chunks
- Max chunk: 800 tokens (hard limit)

**Context Window:**
- Max context tokens: 4000 (hard cap)
- Chunks truncated if exceeding limit
- Ensures LLM can process full context

### Scaling Considerations

**Current Limitations:**
- OpenSearch Serverless collection size limits
- Lambda timeout (15 min) limits document size
- SQS batch size (1 message at a time)

**Future Optimizations:**
- Add OCR support for image-based PDFs (currently text extraction only)
- Implement chunking strategies optimized for different file types
- Add caching layer for frequent queries
- Consider batch processing for large document sets
- Add support for more URL formats (e.g., markdown files from GitHub)

### Monitoring

**Key Metrics:**
- Document ingestion success rate
- Average ingestion time
- Query latency
- Citation accuracy (via feedback)

**Events Tracked:**
- `brain_document_created` - Document record created
- `brain_document_upload_started` - File upload initiated
- `brain_document_upload_completed` - File uploaded to S3
- `brain_document_ingest_requested` - Ingestion enqueued
- `brain_document_ingest_started` - Lambda started processing
- `brain_document_ingest_completed` - Ingestion succeeded (includes chunk_count, duration_ms)
- `brain_document_ingest_failed` - Ingestion failed (includes error_code, error_message, duration_ms)
- `brain_document_viewed` - Document detail page viewed
- `brain_document_expired` - Document expired (Approver/Admin action)
- `brain_document_reindex_requested` - Reindex triggered (Admin/Approver action)
- `brain_document_replaced` - Document replaced with new revision (Contributor action)
- `assistant_query` - Query executed (includes has_filters, retrieved_chunks_count, model)
- `assistant_cited_source` - Source cited in query response (per citation, includes doc_id, chunk_id, user_id)
- `assistant_citation_click` - Citation clicked (includes doc_id, chunk_id)

## Lifecycle Management

### Document Expiry

**Manual Expiry:**
- Approver/Admin can expire documents via API or UI
- Sets status to `Expired`, records `expired_at` and `expired_by`
- Deletes vectors from OpenSearch (no longer retrieved)
- Notifies:
  - Users subscribed to matching product/tags
  - Users who cited this document in last 30 days (from `assistant_cited_source` events)

**Scheduled Expiry:**
- Lambda runs daily at 2:00 AM UTC
- Scans for documents with `expires_at <= now` and `status != Expired`
- Automatically expires matching documents
- Idempotent: skips already-expired documents

### Reindexing

**Manual Reindex:**
- Admin/Approver can trigger reindex via API or UI
- Deletes existing vectors for document
- Re-runs ingestion pipeline
- Updates `last_ingest_at` timestamp
- Idempotent: if already `Ingesting`, no-op

**Use Cases:**
- Fix corrupted embeddings
- Update after source file changes
- Re-process after chunking algorithm improvements

### Source Replacement

**Replace Source:**
- Contributor can replace source file with new revision
- Creates new `BrainDocument` with `revision + 1`
- Links old document via `replaced_by_doc_id`
- New document starts as `Uploaded` (user uploads file and ingests)
- Preserves audit trail of document history

### Usage Tracking

**Citation Tracking:**
- When assistant returns citations, emits `assistant_cited_source` event per citation
- Includes: `doc_id`, `chunk_id`, `user_id`, `title`
- Used to notify users when sources they used expire
- Query window: last 30 days (configurable)

## Product Scoping and Strict Mode

The Brain system enforces product scoping to prevent cross-product confusion and ensure accurate answers.

### Strict Scoping (Default)

**Behavior:**
- `strict_scope=true` by default on all queries
- Requires `product_suite` OR `product_concept` to be provided
- Returns `SCOPE_REQUIRED` error if neither is specified
- Filters OpenSearch results to only include documents matching the scope

**Benefits:**
- Prevents answers from wrong product areas
- Ensures users get contextually relevant information
- Reduces hallucination risk by limiting source scope

**UI Integration:**
- AssistantPage includes product scope selectors
- Scope selection persisted in local storage
- Users must select scope before querying (when strict_scope=true)

### Relaxed Scoping

**Behavior:**
- Set `strict_scope=false` to allow queries without product scope
- Still applies filters if provided, but doesn't require them
- Useful for cross-product queries or exploratory searches

**Use Cases:**
- Admin users exploring all content
- Cross-product enablement materials
- General knowledge queries

## Per-Tenant Scoping (Future)

The current design supports per-tenant scoping but is not yet implemented:

**Design Points:**
- `BrainDocument` includes `product_suite` and `product_concept` fields
- Query filters can scope to specific products
- OpenSearch index can be partitioned by tenant/product
- DynamoDB tables can add tenant_id partition key

**Implementation Path:**
1. Add `tenant_id` to document schema
2. Update ingestion Lambda to include tenant context
3. Update query endpoint to enforce tenant isolation
4. Add tenant-based access policies

## Related Documentation

- [Deployment Architecture](./deployment.md)
- [Production Smoke Tests](../runbooks/prod-smoke.md)

