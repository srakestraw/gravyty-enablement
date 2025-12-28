# Next Phases Plan - Enablement Portal

## Current State Summary

### ✅ Completed Infrastructure

**Phase 1: Foundation**
- ✅ Monorepo structure with npm workspaces
- ✅ Design system package (`@gravyty/design-system`) with MUI theme
- ✅ Domain package (`@gravyty/domain`) with Zod schemas
- ✅ Web app shell (React + Vite + TypeScript) with MUI components
- ✅ Basic routing and page structure

**Phase 2: API Skeleton**
- ✅ Express API server (Lambda-ready)
- ✅ Domain types and validators
- ✅ API endpoints: Content CRUD, Lifecycle, Assistant (stub), Notifications, Subscriptions, Events
- ✅ RBAC middleware (JWT + fallback to dev headers)
- ✅ Telemetry stub
- ✅ Error handling and request ID middleware
- ✅ Rate limiting middleware

**Phase 3A: DynamoDB Persistence**
- ✅ CDK infrastructure stack
- ✅ DynamoDB tables: `content_registry`, `notifications`, `subscriptions`, `events`
- ✅ GSIs: `by_status_updated`, `by_product`
- ✅ Storage abstraction layer (factory pattern)
- ✅ DynamoDB repositories for all entities
- ✅ Environment variable automation scripts
- ✅ Smoke test scripts

**Phase 3B: S3 File Storage**
- ✅ S3 bucket with versioning, encryption, CORS
- ✅ Presigned upload/download URLs
- ✅ File attachment metadata in content items
- ✅ RBAC rules for file access
- ✅ Content detail page with upload/download UI

**Authentication & Authorization**
- ✅ Cognito User Pool with Google IdP (configured in CDK)
- ✅ Cognito groups: Viewer, Contributor, Approver, Admin
- ✅ JWT verification middleware (`aws-jwt-verify`)
- ✅ Fallback to dev headers for local development
- ✅ Email domain restriction (@gravyty.com only) via Lambda trigger
- ✅ Custom domain: `enablement.gravytylabs.com` (configured in Cognito)
- ✅ Web app Amplify Auth integration (configured, needs testing)

**Deployment**
- ✅ Lambda function deployment (CDK configured)
- ✅ API Gateway HTTP API (v2) configured
- ✅ Lambda execution role with least-privilege permissions
- ✅ Build scripts for Lambda bundling
- ✅ Environment variable configuration
- ✅ CORS configured for localhost origins

### 🔄 Partially Implemented

**Notifications**
- ✅ CRUD operations (DynamoDB)
- ✅ List and mark-as-read endpoints
- ✅ Web UI for viewing notifications (`NotificationsPage.tsx`)
- ❌ No automatic notification triggers (content approval, expiry, etc.)
- ❌ No delivery channel (email, push, in-app only)
- ❌ No subscription-based notification generation

**Subscriptions**
- ✅ CRUD operations (DynamoDB)
- ✅ Create/delete subscription endpoints
- ✅ List subscriptions endpoint (implied by repo)
- ❌ No subscription matching logic
- ❌ No notification generation from subscriptions
- ❌ No web UI for managing subscriptions

**Content Lifecycle**
- ✅ Manual approve/deprecate/expire endpoints
- ✅ Expiry date and policy fields in schema
- ✅ Status-based access control
- ❌ No scheduled expiry automation (EventBridge/Lambda)
- ❌ No expiry notifications
- ❌ No review due date reminders

**Analytics/Events**
- ✅ Event storage (DynamoDB)
- ✅ Telemetry stub in web app
- ✅ POST /v1/events endpoint
- ❌ No event aggregation or analytics queries
- ❌ No dashboards or reporting UI
- ❌ No event-driven workflows

**AI Assistant**
- ✅ Stub endpoint (`POST /v1/assistant/query`)
- ✅ Web UI chat interface (`AssistantPage.tsx`)
- ✅ Feedback endpoint stub
- ❌ No OpenAI integration
- ❌ No RAG (Retrieval-Augmented Generation)
- ❌ No vector store (OpenSearch)
- ❌ No content ingestion pipeline
- ❌ No embeddings generation

### ❌ Not Implemented

**Deployment**
- ❌ Amplify hosting for web app (no `amplify.yml` or deployment config)
- ❌ CI/CD pipeline
- ❌ Environment-specific configurations (dev/staging/prod)
- ❌ Custom domain for web app (only Cognito domain configured)
- ❌ Production CORS configuration for Amplify domain

**Content Governance**
- ❌ Automated content expiry (scheduled jobs)
- ❌ Review due date reminders
- ❌ Content versioning UI
- ❌ Bulk operations

**Notifications & Subscriptions**
- ❌ Event-driven notification triggers
- ❌ Email notifications (SES)
- ❌ Push notifications
- ❌ Subscription matching engine
- ❌ User notification preferences

**Analytics**
- ❌ Event aggregation queries
- ❌ Analytics dashboards
- ❌ Content usage metrics
- ❌ User engagement metrics
- ❌ Admin analytics UI

**AI/RAG**
- ❌ OpenAI API integration
- ❌ Content ingestion pipeline (S3 → chunk → embed → vector store)
- ❌ Vector store (OpenSearch)
- ❌ RAG query processing
- ❌ Citation generation
- ❌ Context window management

**Mobile Readiness**
- ❌ Mobile-optimized UI
- ❌ Push notification support
- ❌ Offline capabilities
- ❌ Mobile app API considerations

## Gap Analysis

### Deployment Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Amplify hosting not configured | Web app not deployed, only runs locally | **Critical** |
| No CI/CD pipeline | Manual deployments, error-prone | High |
| No environment separation | Can't test safely before production | High |
| Custom domain for web app | Using localhost/Cognito domain only | Medium |
| Production CORS not configured | API won't accept requests from Amplify domain | High |

### Authentication Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Manual group assignment | Users must be manually added to groups via AWS Console/CLI | High |
| No group sync from Google | Can't auto-assign based on Google groups | Medium |
| No user management UI | Must use AWS Console/CLI | Medium |
| Cognito integration not fully tested | May have issues in production | High |

### Content Governance Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No scheduled expiry | Content doesn't auto-expire based on `expiry_date` | High |
| No expiry notifications | Users don't know content expired | High |
| No review reminders | Content review dates ignored | Medium |
| No bulk operations | Can't manage multiple items efficiently | Low |

### Notifications & Subscriptions Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No automatic triggers | Notifications only created manually | **Critical** |
| No subscription matching | Subscriptions don't generate notifications | **Critical** |
| No email delivery | In-app only, users may miss notifications | High |
| No user preferences | Can't control notification types | Medium |
| No subscription UI | Can't manage subscriptions in web app | Medium |

### Analytics Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No event aggregation | Can't analyze usage patterns | High |
| No dashboards | No visibility into metrics | High |
| No admin UI | Can't view analytics | Medium |
| Events stored but not queried | Data exists but unused | Medium |

### AI/RAG Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No OpenAI integration | Assistant doesn't work | **Critical** |
| No vector store | Can't search content semantically | **Critical** |
| No ingestion pipeline | Content not indexed for RAG | **Critical** |
| No RAG query processing | Can't answer questions with context | **Critical** |
| No citation generation | Can't show sources | High |

### Mobile Readiness Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No mobile optimization | Poor mobile UX | Medium |
| No push notifications | Limited mobile engagement | Medium |
| No offline support | Requires constant connection | Low |

## Recommended Next Phases

### Phase 4: Production Deployment & Core Features
**Objective**: Get a working, deployed product with essential enablement features

**User-Visible Outcomes**:
- Web app deployed to Amplify (accessible via custom domain)
- Notifications automatically generated for content lifecycle events
- Subscriptions trigger notifications when matching content is published
- Content expiry automation with notifications
- Basic analytics visible to admins

**Engineering Deliverables**:

**Infrastructure**:
- Amplify app configuration (`amplify.yml` build spec)
- Custom domain for web app (`enablement.gravytylabs.com`) via Amplify
- EventBridge rules for content lifecycle events (optional, can use Lambda scheduled function)
- Lambda functions for:
  - Scheduled content expiry (EventBridge scheduled rule, runs daily)
  - Subscription matching (triggered on content approval via API call)
  - Notification generation (helper function)
- SES configuration for email notifications (optional, start with in-app only)
- CloudWatch dashboards for basic metrics (API Gateway, Lambda)
- Update API Gateway CORS to include Amplify domain

**API**:
- Event-driven notification triggers:
  - Content approved → notify subscribers (call subscription matching function)
  - Content expired → notify viewers (via scheduled job)
  - Review due date approaching → notify owner (via scheduled job)
- Subscription matching logic:
  - Match subscriptions to new approved content
  - Generate notifications for matches
  - Store in DynamoDB notifications table
- Scheduled expiry job (Lambda):
  - Query content with `expiry_date` in past and status != Expired
  - Update status to Expired
  - Generate notifications for affected users
- Analytics aggregation endpoints:
  - `GET /v1/analytics/content` - Content usage stats (views, downloads)
  - `GET /v1/analytics/users` - User engagement stats (active users, events)
  - `GET /v1/analytics/events` - Event summaries (by type, date range)
- Helper functions:
  - `createNotification(userId, type, title, message, contentId?)` - Centralized notification creation
  - `matchSubscriptions(content)` - Match content to subscriptions

**Web App**:
- Subscription management UI:
  - Create/edit/delete subscriptions page
  - View subscription matches
  - List user's subscriptions
- Admin analytics dashboard:
  - Content usage charts (views, downloads over time)
  - User engagement metrics (active users, top content)
  - Event summaries (by type, date range)
- Notification preferences UI (optional, MVP can skip)
- Mobile-responsive improvements (basic breakpoints)

**Risks & Mitigations**:
- **Risk**: Amplify deployment complexity
  - **Mitigation**: Start with manual Amplify console setup, automate later
- **Risk**: EventBridge complexity
  - **Mitigation**: Start with simple Lambda scheduled function, add EventBridge later if needed
- **Risk**: SES email delivery issues
  - **Mitigation**: Start with in-app notifications only, add email in Phase 5
- **Risk**: Subscription matching performance
  - **Mitigation**: Use DynamoDB queries with GSIs, batch processing, limit to 100 subscriptions per user
- **Risk**: Analytics query performance
  - **Mitigation**: Use DynamoDB queries with date buckets, cache results, limit date ranges

**Acceptance Criteria**:
- ✅ Web app deployed to Amplify and accessible via custom domain
- ✅ Content approval triggers notifications to matching subscribers
- ✅ Content expiry runs daily and updates status + sends notifications
- ✅ Subscription matching works for new approved content
- ✅ Admin can view basic analytics dashboard
- ✅ All features work with Cognito JWT auth (no dev headers in production)
- ✅ API Gateway CORS accepts requests from Amplify domain

**Complexity**: **Large** (L)

**Dependencies**:
- Custom domain DNS configured (`enablement.gravytylabs.com`)
- Amplify account access
- SES verified domain (if using email, optional for MVP)

---

### Phase 5: AI Assistant with RAG
**Objective**: Enable AI-powered content discovery using OpenAI and vector search

**User-Visible Outcomes**:
- AI assistant answers questions using enablement content
- Assistant provides citations to source content
- Content automatically indexed when uploaded/approved
- Semantic search across all content

**Engineering Deliverables**:

**Infrastructure**:
- OpenSearch domain (managed, or use AWS Bedrock Knowledge Bases)
- Lambda functions for:
  - Content ingestion pipeline (S3 → extract text → chunk → embed → index)
  - RAG query processing (query → embed → search → generate)
- OpenAI API integration:
  - Embeddings API (text-embedding-3-small or similar)
  - Chat API (gpt-4-turbo or gpt-3.5-turbo)
- S3 event triggers for automatic ingestion (optional, can trigger via API)
- Secrets Manager for OpenAI API key

**API**:
- Content ingestion endpoint:
  - `POST /v1/content/:id/ingest` - Trigger ingestion for content
  - Background: Download from S3 → Extract text → Chunk → Generate embeddings → Index in OpenSearch
- Enhanced assistant endpoint:
  - `POST /v1/assistant/query` - RAG query:
    1. Generate query embedding via OpenAI
    2. Vector search in OpenSearch (top K results, e.g., top 5)
    3. Build context from results (include content title, summary, chunks)
    4. Call OpenAI Chat API with context and system prompt
    5. Extract citations from context (map chunks to content IDs)
    6. Return answer + citations
- Embedding generation utility:
  - Cache embeddings in DynamoDB (optional, to avoid regeneration)
  - Batch embedding generation
- Chunking strategy:
  - Sentence-based chunking (~500 tokens per chunk)
  - Overlap between chunks (~50 tokens)
  - Store chunk metadata (content_id, chunk_index, start_char, end_char)

**Web App**:
- Enhanced assistant UI:
  - Display citations as clickable links to content
  - Show source content snippets
  - Loading states for RAG processing
  - Error handling for API failures
- Content ingestion status indicator:
  - Show "Indexed" badge on content items
  - Admin can trigger re-indexing
- Admin controls for re-indexing content

**Risks & Mitigations**:
- **Risk**: OpenAI API costs
  - **Mitigation**: Use cheaper models (gpt-3.5-turbo, text-embedding-3-small), cache embeddings, rate limit queries
- **Risk**: OpenSearch complexity and cost
  - **Mitigation**: Use AWS Bedrock Knowledge Bases (managed) or start with small OpenSearch domain, scale later
- **Risk**: Content extraction (PDFs, etc.)
  - **Mitigation**: Use AWS Textract for PDFs, simple text extraction for other formats, handle errors gracefully
- **Risk**: Chunking strategy
  - **Mitigation**: Start with simple sentence-based chunking, iterate based on results
- **Risk**: RAG quality
  - **Mitigation**: Test with real queries, iterate on system prompt, adjust K (number of results)

**Acceptance Criteria**:
- ✅ Content uploaded/approved automatically triggers ingestion (or manual trigger works)
- ✅ Assistant answers questions using content context
- ✅ Citations link to source content
- ✅ Vector search returns relevant content
- ✅ Embeddings cached to avoid regeneration
- ✅ Admin can trigger re-indexing
- ✅ Assistant response time < 5 seconds

**Complexity**: **Large** (L)

**Dependencies**:
- Phase 4 complete (deployed infrastructure)
- OpenAI API account and key
- OpenSearch domain provisioned (or AWS Bedrock Knowledge Bases)
- Content extraction library decision (Textract vs. pdf-parse, etc.)

---

### Phase 6: Advanced Features & Mobile Readiness
**Objective**: Polish the product with advanced features and mobile optimization

**User-Visible Outcomes**:
- Mobile-optimized UI
- Push notifications (if mobile app)
- Advanced analytics and reporting
- Content versioning and history
- Bulk operations

**Engineering Deliverables**:

**Infrastructure**:
- Mobile push notification service (if building mobile app, use AWS SNS)
- Advanced analytics pipeline (Firehose → Athena or DynamoDB aggregation)
- Content versioning storage strategy (S3 versioning already enabled, track in DynamoDB)

**API**:
- Content versioning endpoints:
  - `GET /v1/content/:id/versions` - List versions
  - `GET /v1/content/:id/versions/:version` - Get specific version
  - `POST /v1/content/:id/revert` - Revert to version
- Bulk operations:
  - `POST /v1/content/bulk-approve` - Approve multiple items
  - `POST /v1/content/bulk-expire` - Expire multiple items
  - `POST /v1/content/bulk-deprecate` - Deprecate multiple items
- Advanced analytics:
  - `GET /v1/analytics/content/:id` - Content-specific analytics
  - `GET /v1/analytics/trends` - Usage trends over time
  - `GET /v1/analytics/export` - Export analytics data (CSV/JSON)
- Email notifications (if not done in Phase 4):
  - SES integration
  - Email templates
  - User notification preferences

**Web App**:
- Mobile-responsive design improvements:
  - Breakpoints for tablet and mobile
  - Touch-friendly interactions
  - Mobile navigation menu
- Content version history UI:
  - View version list
  - Compare versions
  - Revert to version
- Bulk operations UI:
  - Select multiple items
  - Bulk approve/expire/deprecate
  - Confirmation dialogs
- Advanced analytics dashboards:
  - Content usage trends
  - User engagement over time
  - Export functionality
- Push notification support (if mobile app)

**Risks & Mitigations**:
- **Risk**: Mobile app scope creep
  - **Mitigation**: Focus on mobile web optimization first, native app later
- **Risk**: Analytics performance
  - **Mitigation**: Use pre-aggregated metrics, caching, limit date ranges
- **Risk**: Versioning complexity
  - **Mitigation**: Use S3 versioning, track metadata in DynamoDB, simple UI

**Acceptance Criteria**:
- ✅ Mobile UI works well on phones/tablets (responsive design)
- ✅ Content versioning visible in UI
- ✅ Bulk operations work for admins
- ✅ Advanced analytics dashboards functional
- ✅ Push notifications work (if mobile app)
- ✅ Email notifications work (if implemented)

**Complexity**: **Medium** (M)

**Dependencies**:
- Phase 5 complete
- Mobile app decision (web-only vs. native app)
- Analytics storage decision (Firehose/Athena vs. DynamoDB aggregation)

## Sequence Rationale

**Why Phase 4 First?**
- **Deployment is foundational**: Can't test AI features without deployed infrastructure
- **Core features unlock value**: Notifications and subscriptions are essential enablement features
- **Lower risk**: Uses existing DynamoDB/S3 infrastructure, no new external dependencies
- **User value**: Gets a working product in users' hands faster
- **Prerequisites for AI**: Need content and users before AI can be useful

**Why Phase 5 Second?**
- **Builds on stable foundation**: Requires deployed infrastructure and content
- **High user value**: AI assistant is a key differentiator
- **Complex but isolated**: Can be developed independently once infrastructure is stable
- **Natural progression**: Content exists → Index it → Enable AI queries
- **Requires content**: Need approved content before RAG is useful

**Why Phase 6 Last?**
- **Polish and optimization**: Enhances existing features rather than adding new ones
- **Mobile can wait**: Web-first approach is faster to market
- **Analytics mature**: Better to build analytics after usage patterns emerge
- **Lower priority**: Nice-to-have features vs. core functionality

## Dependencies & Prerequisites

### Phase 4 Prerequisites
- ✅ Custom domain DNS configured (`enablement.gravytylabs.com`)
- ✅ Amplify account access
- ✅ AWS SES verified domain (for email notifications, optional)
- ✅ EventBridge permissions in Lambda execution role (or use scheduled Lambda)
- ✅ API Gateway CORS update to include Amplify domain

### Phase 5 Prerequisites
- ✅ Phase 4 complete
- ✅ OpenAI API account and key
- ✅ OpenSearch domain provisioned (or AWS Bedrock Knowledge Bases)
- ✅ Content extraction library decision (Textract vs. pdf-parse, etc.)
- ✅ Secrets Manager for storing API keys

### Phase 6 Prerequisites
- ✅ Phase 5 complete
- ✅ Mobile app decision (web-only vs. native app)
- ✅ Analytics storage decision (Firehose/Athena vs. DynamoDB aggregation)

## Rollback Plans

### Phase 4 Rollback
- **If Amplify deployment fails**: Continue using localhost, deploy API only
- **If EventBridge triggers fail**: Fall back to manual notification creation, use Lambda scheduled function instead
- **If subscription matching fails**: Disable automatic matching, keep manual notifications
- **Rollback steps**:
  1. Disable EventBridge rules (if used)
  2. Remove Lambda functions (or disable triggers)
  3. Keep API endpoints but disable automatic triggers
  4. Revert to manual notification creation
  5. Keep web app on localhost

### Phase 5 Rollback
- **If OpenAI integration fails**: Keep stub assistant endpoint, show "Coming soon" message
- **If OpenSearch fails**: Disable ingestion, keep content in DynamoDB only
- **If RAG performance issues**: Fall back to keyword search, disable RAG temporarily
- **Rollback steps**:
  1. Disable ingestion Lambda triggers
  2. Remove OpenAI API calls from assistant endpoint
  3. Keep assistant UI but show "Coming soon" message
  4. Content remains in DynamoDB/S3, not indexed
  5. Re-enable stub response

### Phase 6 Rollback
- **If mobile optimization breaks desktop**: Revert responsive changes
- **If analytics performance issues**: Disable advanced analytics, keep basic metrics
- **Rollback steps**:
  1. Revert mobile CSS changes
  2. Disable advanced analytics endpoints
  3. Keep basic analytics only
  4. Remove bulk operations if causing issues

## Success Metrics

### Phase 4 Success Metrics
- Web app accessible via custom domain (100% uptime)
- Content approval triggers notifications to subscribers (100% of approvals)
- Subscription matching accuracy > 90%
- Content expiry runs daily without errors (0 failures per week)
- Admin analytics dashboard loads < 2 seconds
- API Gateway CORS accepts Amplify domain requests

### Phase 5 Success Metrics
- Content ingestion success rate > 95%
- Assistant response time < 5 seconds (p95)
- Citation accuracy > 80% (manual review)
- User satisfaction with assistant answers > 70% (survey)
- Vector search returns relevant content (top 3 results relevant)

### Phase 6 Success Metrics
- Mobile UI usability score > 80% (user testing)
- Bulk operations process 100+ items in < 30 seconds
- Analytics dashboard loads < 3 seconds
- Push notification delivery rate > 95% (if applicable)
- Email notification delivery rate > 95% (if applicable)

## Next Steps

**Immediate Next Phase**: Phase 4 - Production Deployment & Core Features

See the next Cursor prompt below for detailed implementation steps.
