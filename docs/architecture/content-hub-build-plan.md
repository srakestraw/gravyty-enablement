# Build Plan - Content Hub (DAM)

Status: Draft build plan for Cursor implementation  
Last updated: 2025-12-31  
Architecture reference: `architecture.md` (monorepo, AWS Lambda + API Gateway, DynamoDB, S3, Cognito, packages/domain, packages/jobs, infra/CDK)

---

## 1) Objective

Implement **Content Hub** as a DAM capability that:
- Stores assets once and reuses them across Courses (no duplicate uploads)
- Supports versioning, scheduled publishing, and expiration
- Notifies users when content is published, updated, expiring, or expired
- Supports pinning, metadata-driven discovery, and comments
- Supports external sharing via unique links with tracking and revocation
- Supports link assets (URL) and Google Drive import + sync

---

## 2) Assumptions based on architecture

From the architecture overview:
- Monorepo structure: `apps/api`, `apps/web`, `packages/domain`, `packages/design-system`, `packages/jobs`, `infra/`
- API: Express, Lambda-ready, request validation with Zod, repository abstraction for storage
- Auth: Cognito User Pool with Google OAuth; RBAC via Cognito groups and `requireRole()` middleware
- Data: DynamoDB primary store, designed by access patterns; avoid Scan on large tables (explicit deny for `content_registry` Scan)
- Files: S3 bucket `enablement-content` for content files; presigned URLs for upload/download
- Integrations: EventBridge described for event-driven use cases; SES planned for email notifications
- Observability: CloudWatch logs and metrics, rate limiting guidance

---

## 3) Dependencies and prerequisites

### Required (blocking)
1. **Metadata foundation** exists and is accessible via API and UI (Admin-managed).
2. **Users & Roles** exist, including groups for: Admin, Approver, Contributor, Viewer.
3. **S3 presigned URL pattern** exists for upload and download (or will be implemented in Phase 2).

### Recommended (non-blocking, but improves outcomes)
1. In-app notifications surface area in web UI (header bell or notifications page).
2. Central event logging pattern (events table or content events) for audit and analytics.
3. Feature flag mechanism (simple environment flag or config table) to ship incrementally.

---

## 4) Workstreams

This build plan is organized into parallel workstreams. Each phase lists tasks by stream.

- **Infra/CDK**: DynamoDB schema, S3 prefixes/policies, scheduled jobs (EventBridge), API Gateway routes
- **Domain**: Models, validators (Zod), repositories, access pattern definitions
- **API**: Endpoints, auth middleware, presigned URL flows, rate limiting, link-token public endpoints
- **Web**: Content Hub pages, upload/version UI, course picker, comments, share UX, admin integration UI
- **Jobs**: Publish/expire scheduler, notifications dispatcher, Drive sync jobs
- **Integrations**: Google Drive connector and token storage, optional SES mail delivery
- **QA/Observability**: Tests, logging, metrics, dashboards, audit events

---

## 5) Data design strategy

### Option A (recommended): Extend `content_registry` as a single-table design
Use `content_registry` to store multiple entity types (Asset, Version, Comment, Subscription, ShareLink, ShareRecipient, ShareEvent, Notification, CourseAttachment).
- Supports architecture preference for DynamoDB access-pattern-first design
- Avoids many tables and enables indexed queries via GSIs
- Requires careful key design to avoid Scan

### Option B: Add dedicated tables for Content Hub entities
Create separate DynamoDB tables for Assets, AssetVersions, Comments, ShareLinks, etc.
- Simpler to reason about early
- More tables to manage in infra, more cross-table consistency logic

Build plan assumes **Option A** unless the codebase strongly favors separate tables.

---

## 6) Phased build plan (Cursor-friendly)

### Phase 0 - Rename and scaffolding alignment (UI-level)
**Outcome**: “Resources” becomes “Content Hub” everywhere user-facing, with stable routes and placeholders intact.

- Web
  - Update nav label: Resources -> Content Hub
  - Confirm placeholder routes exist for:
    - Content Hub landing
    - Library/list view
    - Asset detail
  - Add empty state copy and placeholders for:
    - Pinned section
    - Recently updated
    - Expiring soon
- Domain/API
  - No functional changes required

**Acceptance**
- Users see “Content Hub” in the nav and page titles.
- Existing placeholders still compile and routes still resolve.

---

### Phase 1 - Foundations: storage + metadata + access patterns
**Outcome**: Core data model and storage layout established, ready for asset CRUD and upload.

- Domain
  - Define domain models and Zod validators:
    - Asset, AssetVersion, MetadataRef, PinnedState
  - Define enums:
    - `sourceType`: UPLOAD | LINK | GOOGLE_DRIVE
    - `status`: draft | scheduled | published | deprecated | expired | archived
  - Add repository interfaces following existing storage abstraction patterns

- Infra/CDK
  - Confirm `DDB_TABLE_CONTENT=content_registry` exists
  - Add new GSIs needed for discovery without Scan (examples):
    - ByMetadata + Status + UpdatedAt
    - ByPinned + UpdatedAt
    - ByOwner + UpdatedAt
    - ByShareToken (token -> ShareLink)
  - Confirm `ENABLEMENT_CONTENT_BUCKET` CORS supports web app
  - Add S3 prefix conventions for Content Hub:
    - `content/assets/{assetId}/{versionId}/original`
    - `content/assets/{assetId}/{versionId}/preview/*`
    - `content/assets/{assetId}/{versionId}/thumb/*`

- API
  - Create internal admin-only endpoint to validate planned access patterns (dev tool):
    - list queries with example key conditions and expected results

**Acceptance**
- Domain types compile across web and api.
- Infra deploy succeeds with required GSIs and S3 prefix policy aligned to least-privilege.
- No endpoints exposed to end-users yet.

---

### Phase 2 - Assets MVP: CRUD + presigned upload/download
**Outcome**: Users can create assets, upload versions, and download published assets.

- API
  - Assets
    - POST /assets (create metadata fields)
    - GET /assets (list with filters: metadata, type, status, pinned)
    - GET /assets/:id (detail)
    - PATCH /assets/:id (metadata fields, owner, metadata nodes)
  - Versions
    - POST /assets/:id/versions/init-upload (create draft version + presigned PUT)
    - POST /assets/:id/versions/complete-upload (finalize metadata, checksum, size)
    - GET /assets/:id/versions
  - Downloads
    - GET /versions/:id/download-url (RBAC check, presigned GET)
  - Validation
    - Zod validation on all request bodies
    - `requireRole()` on write routes (Contributor+)

- Web
  - Content Hub Library
    - Search + metadata filters (basic)
    - Default view: Published and non-expired
  - Asset detail
    - Metadata section
    - Versions list
    - Download button (latest published)
  - Upload flow
    - Create asset
    - Upload file as new version
    - Draft state visible to contributor/approver only

- QA/Observability
  - Basic API integration tests for upload flow
  - Log key events: asset created, version created, upload completed, download generated

**Acceptance**
- Contributor can upload v1 draft, approver can publish (Phase 3), viewer can download published.
- Downloads happen via S3 presigned URL only after RBAC check.

---

### Phase 3 - Publishing lifecycle: publish, schedule, expire
**Outcome**: Versions can be published immediately or scheduled; assets can expire automatically and block usage.

- Domain
  - Lifecycle transition rules (pure functions):
    - schedule(version, publishAt)
    - publish(version)
    - expire(version)
    - archive(version)
  - Enforce: only one scheduled version per asset (recommended)

- API
  - POST /versions/:id/publish (Approver+)
  - POST /versions/:id/schedule (Approver+)
  - POST /versions/:id/expire (Approver+)
  - POST /versions/:id/archive (Approver+)
  - Asset canonical resolution:
    - GET /assets/:id resolves `currentPublishedVersionId`
    - Add “not available” rules if no published version exists

- Jobs
  - Add scheduler job (EventBridge scheduled Lambda) that runs every N minutes:
    - Publish scheduled versions at publishAt
    - Expire published versions at expireAt
    - Emit events for notifications and audit
  - Job idempotency: safe to run repeatedly

- Web
  - Approver UI actions on version:
    - Publish now
    - Schedule publish
    - Set expiration date
  - Viewer UI:
    - Expired badge and download disabled
    - “Not available yet” for no published version

**Acceptance**
- Scheduled version becomes visible at publishAt without manual action.
- Expired versions block download by default and display clear UI state.

---

### Phase 4 - Discovery and governance: pinning + metadata enforcement
**Outcome**: Users reliably discover the right content; publishing requires metadata and required metadata fields.

- API
  - POST /assets/:id/pin (Approver+)
  - DELETE /assets/:id/pin (Approver+)
  - Enforce publish requirements:
    - Metadata required
    - Required metadata required (title, type, owner)
  - Add list variants:
    - Pinned first
    - Recently updated
    - Expiring soon

- Web
  - Content Hub landing:
    - Pinned section
    - Recently updated
    - Expiring soon
  - Pin/unpin controls (Approver+)
  - Metadata filter UX (multi-select if supported by metadata model)

- Jobs
  - If pinned asset expires:
    - Auto-unpin (recommended) and notify owner/approver

**Acceptance**
- Published assets always have metadata.
- Pinned content is prominently discoverable; expired pinned content is removed or clearly flagged.

---

### Phase 5 - Feedback loop: comments, mentions, outdated flags
**Outcome**: All authenticated users can provide feedback and request updates.

- Domain
  - Comment model (threaded)
  - OutdatedFlag model and resolution fields

- API
  - POST /comments (authenticated)
  - GET /assets/:id/comments
  - PATCH /comments/:id/resolve (Owner/Approver)
  - POST /assets/:id/flags/outdated
  - POST /assets/:id/requests/update

- Web
  - Comments tab on asset detail
  - @mention UI (simple autocomplete, internal users only)
  - “Mark as outdated” and “Request update” actions
  - Resolution UX for owners/approvers

- Notifications
  - In-app notifications:
    - New comment on asset you own
    - @mention
    - Outdated flag
    - Update request

**Acceptance**
- Any authenticated user can comment.
- Owners receive notifications and can resolve threads/flags.

---

### Phase 6 - Subscriptions and notifications (new version, expiring, expired)
**Outcome**: Users can subscribe and stay current without manual checking.

- API
  - POST /subscriptions (targets: asset, metadata)
  - DELETE /subscriptions/:id
  - Optional auto-subscribe:
    - on download
    - on comment
  - Notification generation endpoints (internal) for jobs to call

- Jobs
  - Notification fanout for triggers:
    - New version published -> subscribers
    - Expiring soon -> subscribers + recent downloaders
    - Expired -> subscribers + recent downloaders
  - Store notification records and mark read states

- Web
  - Subscribe/unsubscribe action on asset detail
  - Subscriptions management view (optional)
  - Notification inbox UI (bell or page)

- Integration (optional)
  - SES-based email delivery (planned): keep behind feature flag

**Acceptance**
- Subscribers receive in-app notifications for new versions and expirations.
- Users can manage subscription preferences.

---

### Phase 7 - External sharing: unique links, tracking, expiration, revocation
**Outcome**: Users can share outside the app with unique URLs, control access, and track usage.

- Domain
  - ShareLink, ShareRecipient (email verify), ShareEvent models
  - Token generation utility (high entropy)

- Infra/CDK
  - Add API Gateway public routes for external landing endpoints
  - Rate limiting and WAF rules as applicable
  - Ensure presigned download URLs are short-lived and require token validation first

- API
  - POST /share-links (create canonical or version share)
  - GET /share-links (list for owner/approver)
  - POST /share-links/:id/revoke
  - Public endpoints:
    - GET /s/:token (landing data)
    - POST /s/:token/events (view/download)
    - POST /s/:token/verify (email verification)
  - Canonical resolution:
    - log resolvedVersionId for each view/download event
  - Revocation and expiry checks on every request

- Web
  - Share modal on asset and version:
    - canonical vs version
    - expiresAt
    - access mode: open or email-verified
    - allowDownload toggle
  - Share management tab (authorized)
  - External landing page:
    - version badge, status badge
    - download/view CTA
    - “Newer version available” banner for version-pinned links (if allowed)

- Security/Privacy
  - Email verification requires storing recipient email.
  - If “no PII storage” is a firm constraint, store email encrypted (KMS) and index by hash for lookup.

**Acceptance**
- External link can be revoked and immediately stops working.
- Views and downloads are tracked, including resolvedVersionId for canonical links.
- Links can expire independently from asset expiration.

---

### Phase 8 - Courses integration: attach assets without duplication
**Outcome**: Course builders can attach assets from Content Hub; learners always see the intended version.

- Domain/API
  - Add CourseAsset join model in content_registry (or existing LMS course entities)
  - Endpoints:
    - POST /courses/:id/assets (attach)
    - PATCH /courses/:id/assets/:courseAssetId (update label, pin to version)
    - DELETE /courses/:id/assets/:courseAssetId (detach)
  - Attachment modes:
    - canonical (null versionId)
    - version pinned

- Web
  - Course editor:
    - “Add from Content Hub” picker component
    - search + metadata filter
    - choose canonical vs version pinned
    - optional display label
  - Course learner view:
    - display asset cards with status badges
    - block expired assets consistently (or show guidance)

- QA
  - Ensure one asset is referenced across multiple courses without duplication

**Acceptance**
- Course can reference the same asset as other courses without re-upload.
- Canonical attachment automatically reflects latest published version.

---

### Phase 9 - Google Drive connector: connect, import, sync, version creation
**Outcome**: Admin can connect Drive; users can import Drive files into Content Hub; sync creates new draft versions.

- Infra/CDK
  - Secure token storage approach:
    - SSM parameter per org connector, or
    - DynamoDB encrypted fields + KMS
  - Configure OAuth redirect URLs and allowed origins
  - IAM permissions for accessing secrets/tokens

- API
  - Admin endpoints:
    - POST /integrations/google-drive/connect (start OAuth)
    - POST /integrations/google-drive/callback
    - GET /integrations/google-drive/status
    - POST /integrations/google-drive/disconnect
  - User endpoints:
    - GET /integrations/google-drive/browse (folder and file listing)
    - POST /assets/import/google-drive (create Asset with sourceType GOOGLE_DRIVE)
    - POST /assets/:id/sync (manual sync)
    - GET /assets/:id/sync-status
  - Versioning behavior:
    - On sync, if remote changed, create new draft version and notify owner
  - Failure handling:
    - mark “Source unavailable” if access revoked or file deleted

- Web
  - Admin integrations page:
    - Connect/disconnect
    - Optional folder restrictions
  - Import UI:
    - Browse Drive, select file, import
  - Asset detail:
    - Source = Google Drive, last sync status, Sync now button

- Jobs (optional)
  - Scheduled sync for Drive assets (daily/hourly), behind feature flag

**Acceptance**
- Drive import creates asset once and can be attached to courses.
- Sync creates a new draft version and notifies owner for review.

---

## 7) Definition of Done (global)

A phase is considered done when:
- API endpoints are implemented with Zod validation and RBAC enforcement
- Web UI paths are functional with proper empty/loading/error states
- DynamoDB access patterns use Query/GSIs and do not rely on Scan
- S3 access uses presigned URLs only, generated after permission checks
- Logs and basic metrics exist for critical workflows
- Automated tests exist for the main flows implemented in the phase
- Documentation updated (README or feature docs)

---

## 8) Deliverables checklist (by phase)

- Phase 0: UI rename and route consistency
- Phase 1: Domain models, infra GSIs, S3 layout conventions
- Phase 2: Asset CRUD + upload/download
- Phase 3: Publish/schedule/expire + scheduler job
- Phase 4: Pinning + metadata enforcement + discovery sections
- Phase 5: Comments + mentions + outdated flags
- Phase 6: Subscriptions + in-app notifications
- Phase 7: External share links + tracking + revocation/expiry
- Phase 8: Course attachment integration
- Phase 9: Google Drive connector + import + sync

---

## 9) Implementation notes for Cursor

When implementing in Cursor, keep changes atomic by layer:
1. Add or update domain models and validators in `packages/domain`
2. Add repositories and storage adapters in `apps/api` (and any shared storage factories)
3. Add infra changes in `infra/` (tables, GSIs, policies) and deploy early
4. Implement API endpoints with `requireRole()` and Zod validation
5. Implement web pages and shared components in `apps/web`
6. Add jobs in `packages/jobs` and wire them in infra (EventBridge schedule or callable endpoints)
7. Add tests as you go (unit tests for domain rules, integration tests for endpoints)

---
