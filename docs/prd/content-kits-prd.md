# PRD - Content Kits (for Content Hub)

Owner: Product  
Status: Draft (for Cursor implementation)  
Last updated: 2025-12-31  
Timezone: America/New_York

---

## 1) Summary

Build **Content Kits** inside **Content Hub** as curated bundles of content for specific jobs-to-be-done (role, scenario, product launch, enablement play). Kits make it easy for users to find the right set of approved items, in the right order, with guidance - while still leveraging existing **Content Hub content items** (files, links, Google Drive-synced content) without duplicating uploads.

Kits support:
- Cover image using the shared **Cover Image** component (same component used across the app)
- Sections and ordered items
- References to Content Hub items (canonical latest vs pinned version)
- Kit-level metadata (Product Suite, Product, Tags)
- Kit-level pinning/featured discovery
- Notifications for updates, expirations, and replacements within a kit
- Comments and feedback on kits and kit items
- External sharing via unique URLs with tracking and expiration (optional in MVP)
- Course reuse: attach a kit to a course and/or attach kit items via references

Navigation and placeholder routes already exist - this PRD defines behaviors and requirements to implement within those routes.

---

## 2) Goals

1. Reduce time to find and use the right content for common scenarios (launch, renewal save, objection handling).
2. Ensure users consume the latest approved content by default.
3. Make maintenance simple for owners by surfacing kit health issues (expired items, outdated items, missing replacements).
4. Provide a feedback loop (comments, outdated flags) that reaches kit owners and content owners.
5. Enable measurement of readiness and adoption through kit usage analytics.

---

## 3) Non-goals

- Full learning path replacement (Kits are curated bundles, not graded learning modules).
- Authoring/editing content inside the app beyond metadata (no content editing).
- Advanced compliance workflows (e-sign, legal holds) in MVP.

---

## 4) Terminology

- **Content Hub item**: the underlying content record (file, link, Drive source) with versions and lifecycle.
- **Kit**: a curated bundle of items with structure and guidance.
- **Kit section**: a grouping within a kit (eg Overview, Talk track, Assets, Follow-ups).
- **Kit item**: a reference to a Content Hub item (or an external URL in Phase 2).
- **Canonical reference**: kit points to the latest published, non-expired version of a content item.
- **Pinned version reference**: kit points to a specific version for consistency/compliance.
- **Kit health**: signals whether a kit contains expired/deprecated items, missing replacements, or newer versions available.

---

## 5) Personas

- **Viewer**: uses kits, downloads items, marks complete, subscribes, comments.
- **Contributor**: creates and edits kits (structure, items), drafts kits for approval.
- **Owner/Approver**: approves kit publish, pins kits, manages kit governance.
- **Admin**: manages metadata, roles/permissions, sharing policies, integration settings.
- **External recipient**: accesses a shared kit via a unique URL (optional in MVP).

---

## 6) Navigation and routes

Your placeholder routes exist. Recommended routes if they are not already set (keep your existing paths if different):

### End-user
- Kits landing: `/enablement/content-hub/kits`
- Create kit: `/enablement/content-hub/kits/new`
- Kit detail: `/enablement/content-hub/kits/:kitId`
- Edit kit: `/enablement/content-hub/kits/:kitId/edit`
- Optional: Kit share landing (public): `/k/:token`

### Admin (optional)
- Kit templates: `/admin/content-hub/kit-templates`
- Kit governance settings: `/admin/content-hub/kits-settings`

---

## 7) Key product decisions

### 7.1 Kits reference content items - no duplication
- A kit item references a Content Hub item (asset) and optionally a version.
- Underlying content remains owned and versioned in Content Hub.
- A kit never stores its own file copy.

### 7.2 Default behavior favors “always latest”
- By default, kit items use **canonical references** to the latest published version.
- Owners can optionally pin a specific version for certain items.

### 7.3 Kit lifecycle is separate from content lifecycle
- Kits can be drafted, published, deprecated, archived.
- Content items referenced by a kit can expire independently.
- Kit health indicators reflect underlying content states.

---

## 8) User stories

1. As a contributor, I can create a kit, add sections, and add items from Content Hub.
2. As an owner, I can publish a kit now or schedule publish and set an optional kit expiration.
3. As a viewer, I can open a kit and see the recommended order and guidance.
4. As a viewer, I can download or open items and know whether I’m using the latest version.
5. As a viewer, I can subscribe to a kit and be notified when items change, expire, or are replaced.
6. As an owner, I can see kit health and quickly fix expired or outdated items.
7. As any authenticated user, I can comment on a kit and on specific kit items.
8. As an owner, I can pin a kit so it is featured for new users.
9. As a course editor, I can attach a kit to a course without duplicating content.
10. As an owner, I can share a kit externally via a unique URL, track interactions, and revoke access (optional in MVP).

---

## 9) Functional requirements

### 9.1 Kit creation and structure
**Requirements**
- Create kit with:
  - Cover image (optional) using the shared **Cover Image** component
  - Title (required)
  - Description (optional)
  - Audience (optional, eg SDR/AE/CSM)
  - Owner (default current user; editable by Admin/Approver)
  - Metadata: Product Suite, Product, Tags (same metadata system as Content Hub items)
  - Status: draft, scheduled, published, deprecated, archived
  - publishAt (optional), expireAt (optional)
- Sections:
  - Create, rename, reorder sections
  - Section description (optional)
- Items:
  - Add items to a section from Content Hub search picker
  - Reorder items within a section
  - Move items between sections

**Acceptance criteria**
- A kit can be created with an optional cover image and multiple sections and ordered items.
- A kit detail view reflects section and item ordering reliably.

---

### 9.2 Kit items: canonical vs pinned version references
**Requirements**
- Each kit item must reference:
  - contentId (required)
  - referenceMode: canonical | pinnedVersion
  - versionId (required if pinnedVersion)
  - item label override (optional)
  - item guidance (optional, eg talk track or usage notes)
  - required flag (optional) - highlights must-use items
- UI must clearly show:
  - Latest published version indicator
  - If viewing a pinned version, show “Newer version available”

**Acceptance criteria**
- Canonical kit items always resolve to the latest published, non-expired content version.
- Pinned version kit items always resolve to the specified version.

---

### 9.3 Kit lifecycle: publish, schedule, expire, archive
**Requirements**
- Approver/Admin can:
  - Publish now
  - Schedule publish
  - Deprecate
  - Archive
- Optional kit expiration:
  - When expired, kit is hidden from default discovery; direct access shows expired state.
- Publish requirements (recommended):
  - Title, at least one section, at least one item
  - Required metadata fields (Product Suite, Product) present

**Acceptance criteria**
- Scheduled kits become visible at publishAt.
- Archived kits are removed from default discovery but remain accessible to authorized users for audit.

---

### 9.4 Kit discovery: search, filters, pinning, featured
**Requirements**
- Kits landing includes:
  - Featured/Pinned kits
  - Recently updated kits
  - Recommended kits based on metadata (optional)
- Search and filters:
  - metadata filters (suite/product/tags)
  - owner
  - audience
  - status (authorized users)
- Pinning rules:
  - Only published, non-expired kits can be pinned
  - Expired kits auto-unpin

**Acceptance criteria**
- Pinned kits appear at the top of the kits landing.
- Kits can be filtered by metadata.

---

### 9.5 Kit health and maintenance signals
**Requirements**
Kit detail must compute and display:
- Expired items count
- Deprecated items count
- Items with newer published versions available (when pinned)
- Items missing a published version (if canonical points to none)
- Broken references (deleted or inaccessible content)

Provide owner actions:
- Replace item (search and swap with another content item)
- Switch reference mode (canonical vs pinned)
- Update pinned version to latest
- Remove item

**Acceptance criteria**
- Owners can fix a kit with expired items in under 2 minutes using in-context actions.
- Viewers see clear warnings when items are expired or not latest.

---

### 9.6 Subscriptions and notifications for kits
**Requirements**
- Users can subscribe to a kit.
- Notification triggers:
  - Kit updated (structure changes, items added/removed/reordered)
  - New version published for any canonical item in the kit (optional trigger, default on)
  - A pinned item has a newer version published (notify owner, optional notify subscribers)
  - Item expiring soon / expired
  - Kit expiring soon / expired (if kit has expireAt)
  - Comments and mentions
- Delivery:
  - MVP: in-app notifications
  - Optional: email digest (Phase 2)

**Acceptance criteria**
- Subscribers receive notifications when kit items expire or when the kit is materially updated.
- Owners receive alerts for kit health issues.

---

### 9.7 Comments and feedback
**Requirements**
- All authenticated users can comment on:
  - kit (general comments)
  - kit item (item-specific comments)
- Comments support:
  - threaded replies
  - @mentions
  - resolve (owner/approver)

**Acceptance criteria**
- Any authenticated user can comment on a kit and item.
- Owners are notified of new comments and mentions.

---

### 9.8 External sharing (optional MVP, recommended Phase 2)
If you already built external share links for Content Hub items, extend the same mechanism to kits.

**Requirements**
- Create share link for a kit:
  - unique token URL
  - expiresAt optional
  - revoke anytime
  - allowDownload toggle
  - access mode: open or email-verified (same as content items)
- Public kit landing displays:
  - kit title, description, sections, items
  - each item opens or downloads if allowed
  - resolved version logic:
    - canonical items resolve to latest published version at access time
    - pinned items resolve to pinned version

**Tracking**
- views, item opens, item downloads
- resolvedVersionId for canonical items

**Acceptance criteria**
- Revoked/expired kit links stop working immediately.
- Public access is rate-limited and uses noindex.

---

### 9.9 Course integration
**Requirements**
- Course editor can attach a kit (no duplication).
- Course can display:
  - kit overview
  - kit items list
- Attachment supports:
  - canonical kit attachment (always latest kit)
  - pinned kit version (Phase 2, if you version kits)
- If a kit item expires, course view shows warning and blocks download (consistent with Content Hub rules).

**Acceptance criteria**
- A course can reference the same kit as other courses without copying content.
- Course view reflects kit updates if canonical.

---

## 10) UX requirements

### 10.1 Kits landing
- Pinned kits at top
- Search bar
- Metadata filters
- “Create kit” CTA (role-gated)
- Cards show:
  - cover image (shared Cover Image component)
  - title, suite/product tags
  - last updated
  - health badge (eg “2 issues”)

### 10.1.1 Cover images (shared component)
- Kits use the app’s shared **Cover Image** component for selecting, uploading, and rendering cover images.
- The cover image is optional but strongly recommended for discoverability.
- The component must support:
  - Uploading an image (with validation for size/type)
  - Cropping/positioning behavior consistent with existing usage
  - Storing a reference (not duplicating the file if the image is already in Content Hub storage)
  - Rendering the image consistently on kit cards and kit headers
- If no cover image is provided, show a default placeholder illustration.

### 10.2 Create/Edit kit
Two-column editor (recommended):
- Left: kit metadata (title, metadata tags, audience, description)
- Right: sections and items builder
- Item picker opens a drawer/modal using existing Content Hub search UI
- Inline health preview as items are added (eg if item is expired, block add or warn)

### 10.3 Kit detail
- Header:
  - cover image (shared Cover Image component)
  - title, metadata chips, owner, last updated
  - subscribe button, share button (if enabled)
  - health summary (issues count)
- Sections list with ordered items
- Each item row shows:
  - content type icon
  - label
  - version badge (latest vs pinned)
  - status badge (published/expiring/expired)
  - quick actions: open/download, view details

### 10.4 Maintenance view (owner)
- “Fix issues” panel that lists problems with one-click actions:
  - update pinned to latest
  - replace item
  - remove item

---

## 11) Permissions (MVP)

| Action | Viewer | Contributor | Owner/Approver | Admin |
|---|---:|---:|---:|---:|
| View published kits | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | Yes | Yes |
| Create kits (draft) | No | Yes | Yes | Yes |
| Edit kits | No | Own kits | Yes | Yes |
| Publish/schedule | No | No (optional) | Yes | Yes |
| Pin/unpin | No | No | Yes | Yes |
| Archive/deprecate | No | No | Yes | Yes |
| Share externally | Optional | Optional | Yes | Yes |
| Manage metadata | No | No | No | Yes |

---

## 12) Data model (MVP)

### 12.1 Core entities

**Kit**
- id
- title
- description
- coverImageRef (nullable; points to shared Cover Image storage key or Content Hub item reference)
- audience (optional)
- ownerId
- metadataNodeIds[] (suite/product/tags)
- status: draft | scheduled | published | deprecated | archived
- publishAt (nullable)
- expireAt (nullable)
- pinned: bool
- createdBy, createdAt, updatedAt

**KitSection**
- id
- kitId
- title
- description (nullable)
- sortOrder
- createdAt, updatedAt

**KitItem**
- id
- kitId
- sectionId
- sortOrder
- contentId (references Content Hub item)
- referenceMode: canonical | pinnedVersion
- versionId (nullable, required if pinnedVersion)
- labelOverride (nullable)
- guidance (nullable)
- isRequired (bool)

**KitSubscription**
- id
- kitId
- userId
- triggers (json): kitUpdated, itemExpired, itemExpiringSoon, newVersion, comments, mentions
- createdAt

**KitShareLink** (if sharing enabled)
- id
- kitId
- token
- status: active | expired | revoked
- expiresAt (nullable)
- accessMode: open | emailVerify
- allowDownload (bool)
- createdBy, createdAt
- lastAccessAt (nullable)

**KitShareEvent**
- id
- kitShareLinkId
- eventType: view | itemOpen | itemDownload | verify
- occurredAt
- contentId (nullable)
- resolvedVersionId (nullable)
- anonSessionId (nullable)
- recipientId (nullable)

**KitComment**
- id
- kitId
- kitItemId (nullable)
- userId
- body
- parentCommentId (nullable)
- createdAt
- resolvedAt, resolvedBy (nullable)

### 12.2 Computed/derived fields (do not store unless needed)
- health counts (expired, deprecated, newer available)
- resolved current version for canonical references

---

## 13) API surface (suggested)

### Kits
- POST /kits
- GET /kits (filters: metadata, audience, pinned, status)
- GET /kits/:id
- PATCH /kits/:id (metadata)
- POST /kits/:id/pin
- DELETE /kits/:id/pin
- POST /kits/:id/publish
- POST /kits/:id/schedule
- POST /kits/:id/archive
- POST /kits/:id/deprecate

### Sections and items
- POST /kits/:id/sections
- PATCH /kits/:id/sections/:sectionId
- DELETE /kits/:id/sections/:sectionId
- POST /kits/:id/items
- PATCH /kits/:id/items/:itemId (move, reorder, change reference mode, replace contentId, update guidance)
- DELETE /kits/:id/items/:itemId

### Subscriptions and notifications
- POST /kit-subscriptions
- DELETE /kit-subscriptions/:id

### Comments
- POST /kit-comments
- GET /kits/:id/comments
- PATCH /kit-comments/:id/resolve

### Sharing (optional)
- POST /kit-share-links
- POST /kit-share-links/:id/revoke
- GET /k/:token (public landing)
- POST /k/:token/events
- POST /k/:token/verify

---

## 14) Analytics and reporting (MVP)
- Top kits by views and item opens (7/30/90 days)
- Kit health dashboard:
  - kits with expired items
  - kits with pinned items that have newer versions
- Item usage within kits (which items drive opens/downloads)
- Search performance (zero results) for kits

---

## 15) Security and privacy
- Share tokens high entropy and unguessable
- Public endpoints rate-limited and noindex
- Audit events:
  - kit created, updated, published, pinned, archived
  - item added/removed/reordered
  - share link created/revoked

---

## 16) MVP vs Phase 2

### MVP
- Create/edit kits with sections and ordered items (referencing Content Hub items)
- Canonical vs pinned version references
- Kits landing with search, metadata filters, pinned kits
- Kit detail with health badges and fix actions for owners
- Kit subscriptions and in-app notifications (kit updated, item expired/expiring)
- Comments on kits and kit items
- Course attachment (internal)

### Phase 2
- External kit sharing with unique links and tracking
- Kit templates (prebuilt structure)
- Saved-search subscriptions and recommended kits
- Kit versioning (publish v1, v2 of the kit itself)
- Role-targeted kits and auto-assignment
- Email digests and Slack/Teams delivery

---

## 17) Success metrics
- Time to find and use content for a scenario (reduce by 30%)
- Kit adoption: % of active users opening at least one kit weekly
- Health: % of kits with zero issues (expired/deprecated items)
- Reduction in outdated content usage incidents
- Feedback loop: comment volume and resolution time
- Conversion proxy: kit usage correlated with outcomes (optional later)

---

## 18) Open questions (safe defaults)
- Do we allow adding expired content to a kit?
  - Default: allow for draft with warning, block on publish.
- Do we allow kits to contain non-Content Hub URLs?
  - Default: no in MVP; Phase 2 adds external URLs as kit items.
- How strict should publish requirements be?
  - Default: suite + product required, at least one item.

---
