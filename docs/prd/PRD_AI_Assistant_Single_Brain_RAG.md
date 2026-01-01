# PRD - AI Assistant (Single Brain RAG) for Enablement App

## Summary

Build an AI Assistant inside the Enablement App that allows Sales and CSMs to ask questions and receive grounded answers with citations, using Retrieval Augmented Generation (RAG). The assistant sources knowledge from:

- Content uploads (manual)
- Content Hub assets and links
- Course transcripts
- Selected Slack channels

The assistant uses a single shared "Brain" (one knowledge store) with strict permissioning and query-time context controls. OpenAI is used for embeddings (indexing and retrieval) and response generation.

---

## Problem

Sales and CSMs spend time searching for answers across disconnected sources (docs, enablement assets, LMS content, Slack decisions). This slows ramp time, increases inconsistency in customer messaging, and creates risk of outdated or incorrect guidance being shared.

---

## Goals

1. Deliver fast, accurate, source-grounded answers with clickable citations.
2. Support a single shared Brain that indexes multiple sources while enforcing access controls.
3. Enable admins to curate what is included, manage freshness, and reindex content.
4. Provide a simple chat experience that supports:
   - Scoped searching (by product, source type, time window)
   - Saved answers
   - Conversation history
5. Make it safe and trustworthy:
   - Prevent data leakage across audiences
   - Resist prompt injection from ingested content
   - Avoid hallucinations via "answer from sources only" behavior
6. Operate within predictable cost and performance envelopes.

---

## Non-goals

- Fine-tuning a custom model.
- Replacing Slack search or a full enterprise knowledge management system.
- Autonomous actions (sending emails, updating CRM records, creating tickets).
- Perfect answer quality on day 1 without ongoing curation and evaluation.

---

## Personas

### Sales Rep
- Needs talk tracks, competitive positioning, pricing guidance, and objection handling.
- Values concise answers and links to approved assets.

### CSM
- Needs onboarding steps, troubleshooting guidance, renewal and upgrade positioning, and policy answers.
- Values accurate answers with direct references to training and product docs.

### Enablement Admin
- Curates content, manages access, connects Slack, monitors quality, and maintains freshness.

### System Admin
- Manages integrations, keys, security posture, and operational health.

---

## Jobs to be Done

1. As a Sales Rep, I want quick, accurate answers about products so I can respond confidently on calls.
2. As a CSM, I want step-by-step guidance sourced from training so I can resolve issues consistently.
3. As an Enablement Admin, I want to control what content the assistant can use and keep it up to date.
4. As a System Admin, I want security, auditability, and cost controls so we can safely scale usage.

---

## Key Use Cases

1. Product overview and key capabilities.
2. Pricing and packaging guidance (approved, role-scoped).
3. Competitive positioning (with approved sources).
4. Objection handling and talk tracks.
5. Implementation and onboarding steps (from courses and curated docs).
6. "What did we decide?" questions from Slack (time-windowed and channel-scoped).
7. "Where is the latest version?" for Content Hub assets (version and expiration aware).

---

## Product Requirements

### 1. AI Assistant Chat Experience

#### 1.1 Chat UI
- Chat page with:
  - Conversation list (Recent Conversations)
  - Chat transcript (user and assistant messages)
  - Composer with send button
  - Loading states and error handling
- Assistant responses must include:
  - Answer
  - Citations section with links (see 1.4)
  - Optional "Confidence note" in plain language (not a score)

#### 1.2 History
- Persist conversations by user.
- Allow renaming and deleting a conversation (soft delete is acceptable).

#### 1.3 Saved Answers
- Allow users to save an assistant response to a "Saved" tab.
- Saved answer stores:
  - Title
  - Answer text
  - Citations
  - Scope metadata (filters used)
  - Created by, created at

#### 1.4 Citations
- Each answer must return 1 or more citations when claims are made.
- Citation fields:
  - Title
  - Source type (Content Hub, Course, Slack, Upload, Link)
  - Deep link to the source item (asset page, course page, Slack permalink, or URL)
  - Short excerpt (optional)
- Clicking a citation opens the source in a new tab or in-app viewer (where applicable).

#### 1.5 Scope Controls (Context)
Provide scope chips above the composer:
- Product scope:
  - All (default)
  - One or more product tags
- Sources:
  - Content Hub
  - Courses
  - Slack
  - Uploads
  - Links
- Slack time window:
  - Last 30 days (default)
  - 90 days
  - All time (if enabled by admin)
- Optional: "Only approved sources" toggle (default on)

Scope is used as:
- Hard filters for permissions and published status
- Soft boosts for relevance when product scope is All

---

### 2. Single Brain Knowledge Store

#### 2.1 Brain Concepts
- A single shared Brain that stores:
  - BrainDocuments (source-level records)
  - BrainChunks (chunk-level records)
  - Vector index (OpenSearch) for chunks

#### 2.2 Document Lifecycle
BrainDocuments support:
- Draft, Published, Expired
- Effective date and expiration date
- Versioning:
  - New version of an asset creates a new document version or updates the document with a new revision id (implementation choice)
- Reindex:
  - Admin can request reindex for any document

#### 2.3 Content Sources
Supported sources:
- Uploads: PDF, text, markdown, doc exports (initially)
- Content Hub assets and links
- Course transcripts
- Slack channels selected by admin

---

### 3. Ingestion and Indexing

#### 3.1 Ingestion Pipeline
For each BrainDocument:
1. Acquire content (download S3 file, fetch URL snapshot, build transcript text, fetch Slack messages)
2. Normalize text (strip markup where appropriate)
3. Chunk text (configurable chunk size and overlap)
4. Generate embeddings for each chunk via OpenAI
5. Store chunk metadata in DynamoDB
6. Upsert chunk vectors and metadata into OpenSearch

#### 3.2 Chunking Requirements
- Chunk size and overlap must be configurable (admin setting or env config).
- Each chunk stores:
  - doc_id, chunk_id, ordinal
  - text
  - embedding vector
  - metadata needed for filtering (source_type, product_tags, status, expires_at, updated_at, acl)

#### 3.3 Idempotency
- Re-ingesting the same document revision should not create duplicates.
- Use a deterministic chunk id strategy or revision-aware delete and rebuild.

#### 3.4 Error Handling
- Track ingestion status per document:
  - Pending, Processing, Ready, Failed
- Store failure reason and allow retry.

---

### 4. Retrieval and Answer Generation

#### 4.1 Retrieval
- Embed the user question via OpenAI embeddings.
- Query OpenSearch for top-k chunks using:
  - Vector similarity
  - Filters (permissions, published, not expired, source type selection)
  - Boosts (approved > transcript > slack; recency for slack; product tag boost)

#### 4.2 Response Generation
- Call OpenAI response generation with:
  - System instructions enforcing grounded answers
  - Retrieved chunks (with source metadata)
  - Conversation summary or limited history (configurable)
- Requirements:
  - Use sources only. If not enough evidence, say so and ask a follow-up.
  - Never reveal restricted content.
  - Return citations mapped to retrieved chunks.

#### 4.3 Prompt Injection Defense
- System prompt must instruct the model to treat retrieved content as data, not instructions.
- Strip or label suspicious patterns when ingesting (optional later).
- Do not allow retrieved content to alter system rules.

---

### 5. Permissions and Governance

#### 5.1 Access Rules (MVP)
- Only index:
  - Published Content Hub items marked "Include in AI"
  - Published course transcripts
  - Slack channels explicitly approved by admin
  - Manual uploads by admins (or approved roles)
- At query time, filter content by:
  - Role-based access
  - Audience tags (if implemented)
  - Tenant id

#### 5.2 Audience and ACL (Recommended)
Add an `audience` field to BrainDocuments:
- Public (all internal users)
- Sales only
- CS only
- Admin only
- Custom groups (future)

Query must enforce:
- user roles intersect with document audience

---

### 6. Admin and Management

#### 6.1 AI Admin Pages
Under Admin:
- Brain Overview:
  - Document count by source
  - Ready vs Failed vs Processing
  - Last ingestion run time
- Documents table:
  - Filter by source, status, tags, audience
  - Actions: view, reindex, expire, delete (soft)
- Slack connector:
  - Connect Slack workspace (OAuth)
  - Select channels to index
  - Set sync cadence
  - View last sync status
- Settings:
  - Default slack time window
  - Chunk size and overlap
  - Top-k retrieval
  - Max context tokens
  - Cost limits (daily or monthly budget caps)

#### 6.2 Content Hub Integration Controls
On Content Hub item:
- Toggle: Include in AI
- Fields: product tags, topic tags, audience
- Button: Reindex now
- Show ingestion status

#### 6.3 Course Integration Controls
On Course:
- Toggle: Include transcript in AI
- Auto on publish (default true, configurable)
- Show transcript ingestion status

---

## Data Model (Logical)

### BrainDocuments
- doc_id (pk)
- tenant_id
- source_type
- source_id
- title
- s3_key or url
- product_tags[]
- topic_tags[]
- audience / acl
- status (draft|published|expired)
- effective_at
- expires_at
- revision_id
- ingestion_status (pending|processing|ready|failed)
- ingestion_error (nullable)
- created_at, updated_at

### BrainChunks
- chunk_id (pk)
- doc_id (gsi)
- tenant_id
- ordinal
- text
- embedding_model
- metadata (denormalized fields for filtering)
- created_at, updated_at

### Conversations
- conversation_id
- tenant_id
- user_id
- title
- created_at, updated_at
- deleted_at (nullable)

### Messages
- message_id
- conversation_id
- role (user|assistant)
- content
- citations (json)
- scope (json)
- created_at

### SavedAnswers
- saved_id
- tenant_id
- user_id
- title
- answer
- citations (json)
- scope (json)
- created_at

---

## Slack Connector Requirements

### Slack Data Ingestion Strategy (MVP)
- One BrainDocument per channel per day (or week), containing:
  - messages
  - thread replies
  - permalinks for each message
- Default retention:
  - Index last 90 days (configurable)
  - Older buckets may be expired automatically unless pinned

### Slack Permissions (MVP)
- Index only channels approved by admin.
- If private channels are supported, require explicit approval and correct scopes.

---

## User Experience Flows

### Flow A - Ask a question
1. User navigates to AI Assistant - Chat
2. User selects scope chips (optional)
3. User asks a question
4. System retrieves sources and generates answer
5. User sees answer with citations and can open cited sources

### Flow B - Save an answer
1. User receives an answer
2. User clicks Save
3. Answer appears in Saved tab with citations and scope

### Flow C - Admin adds Slack channel
1. Admin connects Slack workspace
2. Admin selects channels
3. System schedules sync and indexes new content
4. Admin sees sync status and ingestion health

### Flow D - Content Hub version update
1. New version of an asset is published
2. BrainDocument revision updates
3. Reindex is triggered
4. Assistant answers start citing latest revision

---

## Functional Acceptance Criteria

1. Chat answers are grounded and include citations for meaningful claims.
2. Answers never cite expired content.
3. Content is filtered by audience and role.
4. Slack content retrieval respects channel allowlist and default time window.
5. Admin can reindex a document and see status transitions.
6. Users can save answers and view them later with citations intact.
7. System logs every OpenAI call with user, scope, tokens estimate, and outcome.

---

## Non-functional Requirements

### Performance
- P95 response time:
  - Retrieval: < 500 ms (excluding model)
  - End-to-end: < 5-8 seconds for typical questions (configurable target)
- Support concurrent users consistent with expected internal usage (initial target defined by ops).

### Reliability
- Ingestion retries with backoff.
- Assistant endpoint fails gracefully:
  - If OpenSearch is down, return an error message and log.
  - If OpenAI fails, return a retryable message.

### Cost Controls
- Configurable daily budget caps.
- Rate limit per user and per tenant.
- Cache embeddings for repeated questions (optional).

### Security
- OpenAI API key stored server-side in Secrets Manager or SSM SecureString.
- Never expose keys to the browser.
- Encrypt sensitive data at rest (AWS defaults, plus explicit where needed).
- Audit logs for:
  - Slack connection changes
  - Document ingestion and deletion
  - Assistant queries (metadata only)

---

## Analytics and Success Metrics

### Product metrics
- Weekly active users of AI Assistant
- Queries per user per week
- Saved answers count
- Citation click-through rate

### Quality metrics
- Thumbs up/down ratio
- "Not enough info" rate
- Top failed queries and missing sources

### Business outcomes (proxy)
- Reduced time to answer enablement questions
- Improved consistency of talk tracks
- Reduced escalations for basic issues

---

## Risks and Mitigations

1. Hallucinations or incorrect answers
- Mitigation: grounded prompt, citations required, scope controls, feedback loop, approved source boosts

2. Stale content, especially in Slack
- Mitigation: default time windows, recency boosts, expiration policies, admin pinning

3. Permission leakage
- Mitigation: strict query filters, audience tagging, tenant isolation, only index approved sources

4. Prompt injection via documents
- Mitigation: system prompt rules, content labeling, ignore instructions inside sources

5. Cost creep
- Mitigation: budgets, rate limiting, top-k tuning, chunk sizing, caching

---

## Milestones

### Milestone 1 - RAG MVP (Chat with citations)
- Assistant endpoint implemented (retrieve + respond)
- UI wired to backend
- History and Saved answers
- Content Hub and course transcript ingestion (published only)

### Milestone 2 - Slack Connector
- Slack OAuth and channel selection
- Scheduled sync and indexing
- Slack citations via permalinks
- Default time window controls

### Milestone 3 - Governance and Quality
- Audience tagging and stricter ACL
- Admin dashboards and reindex workflows
- Eval set and regression testing
- Budget caps and rate limiting

---

## Open Questions

1. What is the default strictness for product scope when the user selects All?
2. Do we need private Slack channels in v1, or public channels only?
3. Should expired assets be retrievable for admins only (for audit)?
4. Which file types must be supported for uploads in v1 (PDF only vs docx, pptx)?
5. Do we require a human approval workflow for "approved sources" or is it manual tagging?
