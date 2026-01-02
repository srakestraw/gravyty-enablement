# PRD - Content Hub (Digital Asset Management)

Owner: Product  
Status: Draft (for implementation in Cursor)  
Last updated: 2025-12-31  
Timezone: America/New_York

---

## 1) Summary

Build **Content Hub**, a Digital Asset Management (DAM) capability inside the Enablement App that ensures users always find and use the most up-to-date, relevant content. Content Hub supports:

- Asset upload and versioning
- Scheduled publishing and expiration windows
- Notifications for new versions, expiring soon, and expired assets
- Pinning and metadata-based discovery
- Comments for all authenticated users
- External sharing via unique URLs with tracking and link expiration/revocation
- Link assets (URL-based content)
- Google Drive connector to import and keep assets in sync
- Course attachments that reference shared assets (no duplicate uploads)

---

## 2) Goals

1. Ensure users consistently use the latest approved asset.
2. Prevent expired or deprecated assets from being unknowingly used.
3. Provide clear lifecycle governance (draft, scheduled, published, deprecated, expired, archived).
4. Enable fast discovery via pinning and metadata filters.
5. Enable feedback loops via comments and structured feedback actions.
6. Enable safe external sharing with analytics and link controls.
7. Enable reuse across Courses without uploading content twice.
8. Support link-based content and Google Drive-sourced content with optional sync.

---

## 3) Non-goals

- In-app creative editing (image/video editing).
- Full enterprise rights and licensing management beyond expiration (Phase 2+).
- Deep integrations beyond Google Drive in MVP (design for extensibility).

---

## 4) Terminology

- **Content Hub**: user-facing area for finding and using content.
- **Asset**: logical item (example: “Q1 Sales Deck”).
- **Asset Version**: specific revision (v1, v2, v3).
- **Rendition**: preview/thumbnail or optimized derivative.
- **Lifecycle State**: draft, scheduled, published, deprecated, expired, archived.
- **Canonical asset view**: always routes to latest published version.
- **Share Link**: unique URL for external sharing, trackable, expirable, revocable.
- **Canonical share link**: link resolves to latest published version.
- **Version share link**: link resolves to a specific version (immutable target).
- **Metadata**: controlled categorization, used for discovery and governance.
- **Course Attachment**: course references an asset or specific version without duplication.

---

## 5) Personas

### Internal authenticated users
- **Viewer**: consumes assets, downloads, subscribes, comments
- **Contributor**: uploads, creates versions, schedules publish (if allowed)
- **Owner/Approver**: approves publish, pins, deprecates, expires, resolves feedback
- **Admin**: manages metadata, roles/permissions, integrations (Google Drive), system settings

### External recipients
- **Open link viewer**: anyone with the URL (tracked by session)
- **Email-verified viewer**: recipient verifies email before access
- **Password link viewer**: optional Phase 2

---

## 6) Navigation and routes

You already have navigation and placeholder routes. Recommended naming (adjust to your current structure):

### Content Hub (end-user)
- Content Hub landing: `/enablement/content-hub`
- Library (if separate): `/enablement/content-hub/library`
- Asset detail: `/enablement/content-hub/assets/:assetId`
- Optional: pinned `/enablement/content-hub/pinned`
- Optional: expiring soon `/enablement/content-hub/expiring`
- Optional: shares `/enablement/content-hub/shares`

### Admin
- Metadata: `/admin/metadata` (or existing)
- Google Drive integration: `/admin/integrations/google-drive`

If route churn is risky, keep existing routes and update UI labels to Content Hub. If early, rename paths now for long-term consistency.

---

## 7) Key product decisions

### 7.1 Assets are global, Courses reference assets
- Assets exist once in Content Hub.
- Courses attach assets via relationship records (no file duplication).
- Course attachment can reference:
  - the canonical asset (always latest published), or
  - a specific asset version (frozen)

### 7.2 Asset sources
Each Asset has a `sourceType`:
- `UPLOAD` (stored in your system)
- `LINK` (URL stored, optional preview)
- `GOOGLE_DRIVE` (Drive file reference, optional sync that creates new versions)

---

## 8) User stories (high priority)

1. As a contributor, I can upload a file, fill required metadata fields, and create a draft asset version.
2. As an approver, I can publish now or schedule publishAt for a version, with a required “what changed” note.
3. As a user, I can subscribe to an asset and be notified when a new version is published.
4. As a user, I can download an asset and be notified when the downloaded version expires.
5. As a user, I can pin key assets so new people find them quickly.
6. As a user, I can comment on an asset and @mention others to provide feedback.
7. As a user, I can share an asset externally via a unique URL that can expire or be revoked and track views/downloads.
8. As a course editor, I can attach existing assets to a course without uploading again.
9. As an admin, I can connect Google Drive and import files into Content Hub, keeping versions in sync.

---

## 9) Functional requirements

### 9.1 Asset creation, upload, and versioning
**Requirements**
- Create Asset record with metadata fields.
- Upload creates a new Asset Version, does not overwrite prior versions.
- Version history list and ability to open any version.
- Store or compute `currentPublishedVersionId`.

**Acceptance criteria**
- Uploading a new file creates v(n+1) with prior versions preserved.
- Viewer sees canonical asset view pointing to latest published version.

---

### 9.2 Lifecycle states and scheduling
**States**
- Draft: not visible to general viewers
- Scheduled: approved for future publish
- Published: visible in search and downloadable
- Deprecated: visible with warnings, typically replaced
- Expired: no longer valid, downloads blocked by default
- Archived: removed from default discovery but retained for audit/history

**Scheduling**
- Version fields: `publishAt` (optional), `expireAt` (optional)
- Background scheduler transitions:
  - Scheduled -> Published at `publishAt`
  - Published -> Expired at `expireAt`

**Rules**
- Default discovery shows Published and non-expired only.
- Canonical asset view routes to latest Published version.
- If no Published version exists, show “Not available yet” to viewers.

**Acceptance criteria**
- Scheduled versions remain hidden to viewers until publishAt.
- Expired versions show an expired badge and block downloads by default.

---

### 9.3 Expiration experience and notifications
**Pre-expiry**
- Notify subscribers and recent downloaders at configurable intervals (default 30/7/1 days).
- Notify owner when an asset with active share links is expiring soon.

**On expiry**
- Mark version Expired.
- Notify subscribers and downloaders within a configurable lookback window (default 180 days).

**Expired access**
- Default: download disabled; show expired banner with:
  - reason (optional)
  - owner contact or “request update” action

**Acceptance criteria**
- A downloader receives an expired notification when the version they downloaded expires.
- Expired version download is blocked unless a future setting allows acknowledged downloads (Phase 2).

---

### 9.4 New version publish experience and notifications
**Triggers**
- When a new version is Published, notify:
  - Asset subscribers
  - Auto-subscribed downloaders (if enabled)
  - Email-verified external recipients for canonical share links (if enabled)

**Old version guardrails**
- Banner on non-latest version: “Viewing v2. Latest is v3.” with “Go to latest”.
- Optional: block downloads of deprecated versions (Phase 2).

**Acceptance criteria**
- Publishing v3 triggers notifications to subscribers.
- Viewing v2 shows a clear path to v3.

---

### 9.5 Pinning and featured discovery
**Scopes**
- Global pinned (Content Hub landing)
- Context pinned (within taxonomy node or collection)

**Rules**
- Only Published, non-expired assets can be pinned.
- Expired pinned assets are automatically unpinned or flagged and removed (recommended: auto-unpin + notify owner).

**Acceptance criteria**
- Pinned assets display above non-pinned assets in relevant views.

---

### 9.6 Taxonomy and metadata governance
**Requirements**
- Publishing requires taxonomy assignment and required metadata.
- Admin manages taxonomy nodes (controlled vocabulary).
- Search and filters use taxonomy facets.

**Minimum required metadata (recommended MVP)**
- Title
- Asset type (deck, doc, image, video, logo, worksheet, link)
- Owner
- Metadata node(s)

**Acceptance criteria**
- Publish is blocked if required metadata fields are missing.
- Search supports filtering by metadata.

---

### 9.7 Comments and feedback
**Comments**
- All authenticated users can comment.
- Threaded replies
- @mentions
- Owners can mark threads resolved

**Structured feedback actions**
- Mark as outdated
- Request update

**Acceptance criteria**
- Anyone authenticated can comment on an asset.
- Owner is notified on new comments, mentions, and outdated flags.

---

### 9.8 Subscriptions and notification preferences
**Subscribe targets**
- Asset
- Taxonomy node
- Collection (optional)
- Saved search (Phase 2)

**Auto-subscribe options**
- Auto-subscribe on download (recommended)
- Auto-subscribe on comment (optional)

**Delivery**
- MVP: in-app notifications
- Recommended: email notifications with preferences:
  - immediate vs daily digest vs weekly digest
  - opt-in per trigger type

**Acceptance criteria**
- Users can subscribe/unsubscribe and receive relevant notifications.

---

### 9.9 External sharing via Share Links (canonical and version)
**Share Link types**
- Canonical share link: resolves to latest Published version at time of access.
- Version share link: resolves to the pinned version.

**Controls**
- Unique, unguessable token URL
- Expires at date/time
- Revoke anytime (immediate)
- Access mode:
  - Open link (MVP)
  - Email-verified (MVP)
  - Password-protected (Phase 2)
- Permissions:
  - View only
  - Download allowed
  - Comments allowed (optional)

**Tracking**
- Views and downloads per link
- Resolved version id (for canonical links)
- Last access timestamp

**Acceptance criteria**
- Canonical share link resolves to the latest published version and logs resolvedVersionId.
- Version share link always resolves to the same version.
- Expired or revoked share links stop working immediately.

---

### 9.10 Link assets (URL content)
**Requirements**
- Create Asset with sourceType LINK and a URL.
- Supports metadata, pinning, comments, subscriptions, publishAt/expireAt.
- Optional Open Graph preview.

**Lifecycle**
- Expired link assets are treated like expired files (blocked by default).

**Acceptance criteria**
- Link assets behave like file assets in discovery, commenting, subscriptions, and expiration.

---

### 9.11 Google Drive connector and sync
**Admin**
- Connect Google Drive via OAuth.
- Optional restrictions:
  - allowed folder ids
  - allowed shared drives

**Import**
- Users can browse Drive and import a file into Content Hub as an Asset with sourceType GOOGLE_DRIVE.
- Store Drive identifiers to enable sync.

**Sync modes**
- Manual “Sync now” (MVP)
- Scheduled sync (MVP if feasible)
- Change notification based sync (Phase 2)

**Versioning rule**
- When Drive content changes:
  - Create a new Asset Version (Draft by default)
  - Notify owner to review and publish
- Optional setting: auto-publish Drive updates (off by default)

**Failure handling**
- If access revoked or file deleted:
  - Mark asset as “Source unavailable”
  - Preserve history
  - Stop sync and surface error with guidance

**Acceptance criteria**
- Import creates asset once and can be attached to courses without duplication.
- Drive change produces a new version in Content Hub version history.
- Sync errors are visible and actionable.

---

### 9.12 Course attachments (no duplicate uploads)
**Requirements**
- Course editor can search Content Hub and attach assets.
- Attachment can point to canonical asset or specific version.
- Course UI displays version and expiration badges.

**Acceptance criteria**
- One asset can be attached to many courses without re-uploading.
- Canonical attachment updates to latest published version automatically.

---

## 10) UX requirements

### 10.1 Content Hub landing
- Pinned section
- Recently updated section
- Expiring soon section
- Search bar and taxonomy filters

### 10.2 Asset Library
- Default filter: Published and non-expired
- Filters: taxonomy, type, owner, status (authorized), expiring soon, pinned
- Sorting: relevance, recently updated, most downloaded

### 10.3 Asset detail page
- Header: title, status badge, version badge, publish/expire dates
- Primary actions: View/Download, Share, Subscribe, Comment
- Banner when not latest: “Viewing v2. Latest is v3.” + CTA
- Tabs:
  - Overview (metadata fields)
  - Versions (timeline)
  - Comments
  - Shares (authorized)
  - Usage (where used in courses)

### 10.4 Course editor integration
- “Add from Content Hub” picker:
  - search and filter
  - choose canonical vs pinned version
  - optional display label
- Attached assets list shows badges (expiring soon, expired, latest, pinned version).

### 10.5 External share landing
- Branded lightweight page:
  - preview (where possible)
  - metadata and version
  - lifecycle badges
  - download/view actions
  - “Newer version available” CTA when applicable and allowed
- For revoked/expired links: clear message and optional “request access” (Phase 2).

---

## 11) Permissions (MVP)

| Action | Viewer | Contributor | Owner/Approver | Admin |
|---|---:|---:|---:|---:|
| View published assets | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | Yes | Yes |
| Create asset version (draft) | No | Yes | Yes | Yes |
| Schedule publish | No | Yes (optional) | Yes | Yes |
| Approve publish | No | No | Yes | Yes |
| Pin/unpin | No | No | Yes | Yes |
| Deprecate/expire/archive | No | No | Yes | Yes |
| Manage metadata | No | No | No | Yes |
| Create share link | Yes (optional) | Yes | Yes | Yes |
| Revoke share link | Own only | Own only | Yes | Yes |
| View analytics | Limited | Limited | Yes | Yes |
| Manage Drive integration | No | No | No | Yes |

---

## 12) Data model (MVP)

### 12.1 Core entities

**Asset**
- id
- title
- description
- assetType
- ownerId
- metadataNodeIds[]
- sourceType: UPLOAD | LINK | GOOGLE_DRIVE
- sourceRef (json):
  - LINK: { url, preview? }
  - GOOGLE_DRIVE: { driveFileId, driveMimeType, driveWebViewLink?, connectorId }
- currentPublishedVersionId (optional)
- createdBy, createdAt, updatedAt

**AssetVersion**
- id
- assetId
- versionNumber
- status: draft | scheduled | published | deprecated | expired | archived
- publishAt (nullable)
- expireAt (nullable)
- publishedBy, publishedAt (nullable)
- changeLog (required on publish)
- storageKey (for UPLOAD or cached copy)
- checksum, mimeType, sizeBytes
- rendition metadata (thumbnails/previews)
- sourceVersionRef (json, optional):
  - GOOGLE_DRIVE: { driveRevisionId?, modifiedTime?, checksum? }

**CourseAsset** (join)
- id
- courseId
- assetId
- versionId (nullable, null means canonical)
- displayLabel (nullable)
- moduleId or lessonId (nullable, depending on course structure)
- sortOrder
- createdBy, createdAt

**Subscription**
- id
- targetType: asset | metadata | collection | savedSearch
- targetId
- userId
- triggers (json): newVersion, expiringSoon, expired, comments, mentions
- createdAt

**DownloadEvent**
- id
- assetId, versionId
- userId (nullable for external)
- occurredAt
- source: internal | externalShare | course
- shareLinkId (nullable)
- courseId (nullable)

**Comment**
- id
- assetId
- versionId (nullable)
- userId
- body
- createdAt
- parentCommentId (nullable)
- resolvedAt, resolvedBy (nullable)

**ShareLink**
- id
- token
- createdBy, createdAt
- targetType: canonicalAsset | version
- assetId
- versionId (nullable)
- status: active | expired | revoked
- expiresAt (nullable)
- expireWithAsset (bool)
- accessMode: open | emailVerify | password
- allowDownload (bool)
- allowComments (bool)
- notifyOnNewVersion (bool)
- lastAccessAt (nullable)

**ShareRecipient** (for email verification)
- id
- shareLinkId
- email
- verifiedAt
- lastAccessAt

**ShareEvent**
- id
- shareLinkId
- eventType: view | download | verify | comment
- occurredAt
- resolvedVersionId
- anonSessionId (nullable)
- recipientId (nullable)

**Notification**
- id
- userId (nullable for external)
- channel: inApp | email
- type: newVersion | expiringSoon | expired | comment | mention | outdated | shareLinkExpiring
- payload (json)
- createdAt
- deliveredAt, readAt (nullable)

### 12.2 Google Drive integration entities

**DriveConnector**
- id
- orgId
- connectedBy
- createdAt
- status: active | disconnected | error
- scopesGranted
- tokenRef (secure storage pointer)
- restrictions (json): allowedFolderIds, allowedDriveIds

**DriveSyncStatus** (optional table)
- assetId
- syncMode: manual | scheduled | webhook
- lastSyncAt
- lastSyncStatus: success | error
- lastError
- nextSyncAt (nullable)

---

## 13) API surface (suggested)

### Assets
- POST /assets
- GET /assets (filters: metadata, type, status, pinned)
- GET /assets/:id
- PATCH /assets/:id (metadata fields, owner, metadata nodes)
- POST /assets/:id/pin
- DELETE /assets/:id/pin

### Versions
- POST /assets/:id/versions (upload or create from source)
- GET /assets/:id/versions
- POST /versions/:id/schedule
- POST /versions/:id/publish
- POST /versions/:id/deprecate
- POST /versions/:id/expire
- POST /versions/:id/archive

### Subscriptions
- POST /subscriptions
- GET /subscriptions
- DELETE /subscriptions/:id

### Comments
- POST /comments
- GET /assets/:id/comments
- PATCH /comments/:id/resolve

### Courses (attachments)
- POST /courses/:id/assets
- PATCH /courses/:id/assets/:courseAssetId
- DELETE /courses/:id/assets/:courseAssetId

### Share links (external)
- POST /share-links
- GET /share-links
- GET /share-links/:id
- POST /share-links/:id/revoke
- GET /s/:token (external landing data)
- POST /s/:token/verify (email verify)
- POST /s/:token/events (view/download events)

### Google Drive integration
- POST /integrations/google-drive/connect
- POST /integrations/google-drive/callback
- GET /integrations/google-drive/browse
- POST /assets/import/google-drive
- POST /assets/:id/sync
- GET /assets/:id/sync-status

---

## 14) Notification rules (MVP defaults)

### Internal
- New version Published: asset subscribers
- Expiring soon: subscribers + recent downloaders (30/7/1 days)
- Expired: subscribers + recent downloaders
- Comments: owner + mentions
- Outdated / request update: owner and approver group

### External (email-verified share links)
- Link created: optional
- Link expiring soon / expired: optional
- New version published: canonical share links where notifyOnNewVersion is enabled

User preferences:
- in-app always on
- email optional, with immediate or digest

---

## 15) Analytics and reporting (MVP)
- Top assets by views/downloads (7/30/90 days)
- Assets expiring soon
- Assets with missing owner or metadata
- Search zero-result queries
- External share performance:
  - views/downloads by share link
  - active links expiring soon
  - resolvedVersionId distribution for canonical share links

---

## 16) Security and privacy
- Share tokens must be high entropy and unguessable.
- Public share endpoints rate-limited.
- Public pages noindex.
- Signed file URLs with short TTL so revoked or expired links cannot fetch directly.
- Audit log for publish, expire, deprecate, pin, share create, share revoke, Drive connect/disconnect.

---

## 17) Edge cases
- Multiple scheduled versions: define rule (recommended: only one scheduled publish per asset at a time).
- Asset expires but canonical link should resolve to latest published non-expired version, otherwise show expired state.
- Drive file deleted or permissions revoked: mark “Source unavailable” and stop sync, preserve history.
- Viewer bookmarks old version: show “not latest” banner and CTA to latest.
- Metadata node changes: soft-deprecate metadata nodes rather than hard delete.

---

## 18) MVP vs Phase 2

### MVP
- Asset library, asset detail, versions, lifecycle states, scheduling, expiration
- Metadata filtering + required metadata fields on publish
- Pinning (global and contextual)
- Comments for all authenticated users + mentions
- Subscriptions (asset and metadata) + in-app notifications
- Share links (canonical and version) with open and email-verified modes + tracking + expire/revoke
- Link assets
- Course attachments referencing assets (no duplication)
- Google Drive connector: connect + import + manual sync + version creation

### Phase 2
- Password share links, one-time links, max downloads/views
- Saved searches and subscriptions to saved views
- Download expired assets with acknowledgement (admin-controlled)
- Change-notification based Drive sync (webhooks)
- Collections and group-scoped pinning
- Slack/Teams notification delivery
- “Where used” tracking outside courses (CMS embeds) if needed

---

## 19) Success metrics
- % downloads that are latest published version (target > 95%)
- Reduction in outdated asset usage incidents
- Notification engagement (in-app read rate, email open rate if enabled)
- Search success (reduced zero-result searches)
- Feedback volume and resolution time (comments, outdated flags)
- External share conversion (views to downloads) and link governance usage (revokes, expirations)

---

## 20) Cursor implementation order (recommended)

1. UI rename Resources -> Content Hub (nav label, page titles, breadcrumbs)
2. Asset Library + Asset Detail using existing placeholder routes
3. Asset model and versioning end-to-end (upload, view, version history)
4. Course attachments (CourseAsset join + AssetPicker component)
5. Link assets (create, view, lifecycle)
6. Lifecycle scheduler (publishAt/expireAt) + state transitions
7. Subscriptions + in-app notifications
8. Share links + external landing + tracking events
9. Pinning + metadata enforcement on publish
10. Google Drive connector + import + sync + version creation
11. Usage tab (where used in courses) + admin dashboards

---

## 21) Acceptance test checklist (MVP)

### Lifecycle
- Scheduled publish hides version until publishAt.
- Expiration blocks downloads and shows expired badge.

### Always-latest
- Canonical asset view resolves to latest published version.
- Old version view shows banner and links to latest.

### Notifications
- New publish notifies subscribers.
- Expiry notifies subscribers and recent downloaders.
- Comment and mention notifications reach owners and mentioned users.

### External sharing
- Canonical share logs resolvedVersionId.
- Version share stays pinned to version.
- Expire and revoke immediately block access.

### Courses
- Attaching asset does not duplicate storage.
- Canonical course attachment updates to new published version.

### Drive
- Import from Drive creates asset with sourceType GOOGLE_DRIVE.
- Drive change creates a new draft version on sync and notifies owner.
- Permission revoke triggers “Source unavailable” state.
