# Enablement Consumption Architecture

This document describes the architecture for structured enablement consumption features: Learning Paths, Video Reels, and Progress Tracking.

## Overview

The enablement consumption system provides structured learning experiences through:
- **Learning Paths**: Ordered sequences of content items, brain documents, and video links
- **Video Reels**: Feed of video links from external providers (YouTube, Loom, Vimeo, generic)
- **Progress Tracking**: User completion tracking for learning path steps

## Data Model

### VideoLink

Represents a link to an external video (no file hosting).

```typescript
{
  id: string;
  title: string;
  description?: string;
  product_suite?: string;
  product_concept?: string;
  tags?: string[];
  persona_tags?: string[];  // "AE", "CSM", "Admin", etc.
  url: string;              // Original URL
  provider: "youtube" | "loom" | "vimeo" | "generic";
  embed_url?: string;       // Derived embed URL for known providers
  thumbnail_url?: string;  // Optional thumbnail
  duration_seconds?: number;
  status: "Draft" | "Published" | "Expired";
  published_at?: string;
  published_by?: string;
  expires_at?: string;
  expired_at?: string;
  expired_by?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}
```

**Provider Detection (Links-First Strategy):**
- Videos are **links only** - no file hosting or upload flows
- Uses shared `parseVideoUrl()` utility from `@gravyty/domain` for consistent parsing
- **YouTube**: Detects `youtube.com`, `youtu.be`, `youtube.com/shorts`, `youtube.com/embed` URLs
  - Derives embed URL: `https://www.youtube-nocookie.com/embed/{video_id}`
  - Derives thumbnail URL: `https://img.youtube.com/vi/{video_id}/hqdefault.jpg`
- **Loom**: Detects `loom.com/share/{id}` and `loom.com/embed/{id}` URLs
  - Derives embed URL: `https://www.loom.com/embed/{id}`
- **Vimeo**: Detects `vimeo.com/{id}` and `player.vimeo.com/video/{id}` URLs
  - Derives embed URL: `https://player.vimeo.com/video/{id}`
- **Generic**: All other URLs (no embed support)
  - UI shows "Open Video" button that opens link in new tab
  - Telemetry still tracks views/completions for analytics

### LearningPath

Represents a structured learning sequence.

```typescript
{
  id: string;
  title: string;
  description?: string;
  product_suite?: string;
  product_concept?: string;
  persona_tags?: string[];
  tags?: string[];
  steps: LearningPathStep[];
  status: "Draft" | "Published" | "Archived";
  published_at?: string;
  published_by?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}
```

### LearningPathStep

A single step in a learning path.

```typescript
{
  step_id: string;
  type: "content" | "brain_doc" | "video_link";
  ref_id: string;           // content_id, brain_doc_id, or video_link_id
  title_override?: string;  // Optional custom title
  required?: boolean;       // Default: true
}
```

**Step Validation:**
- On publish, all `ref_id` values are validated to ensure referenced items exist
- Validation checks:
  - `content` → `content_registry` table
  - `brain_doc` → `brain_documents` table
  - `video_link` → `video_links` table

### UserProgress

Tracks user completion of learning path steps.

```typescript
{
  user_id: string;          // PK
  path_id: string;
  step_id: string;          // SK: path_id#step_id
  completed_at: string;
  completion_source: "manual" | "video_end" | "mark_complete";
}
```

## Storage

### DynamoDB Tables

#### video_links

- **PK**: `video_id` (string)
- **GSI**: `videos_by_product`
  - PK: `product_suite#product_concept`
  - SK: `published_at#video_id`

#### learning_paths

- **PK**: `path_id` (string)
- **GSI**: `paths_by_product`
  - PK: `product_suite#product_concept`
  - SK: `updated_at#path_id`

#### user_progress

- **PK**: `user_id` (string)
- **SK**: `path_id#step_id` (string)
- **GSI**: `progress_by_path` (optional)
  - PK: `path_id`
  - SK: `user_id#step_id`

## API Endpoints

### Video Links

- `GET /v1/videos` - List videos (filters: product_suite, product_concept, persona, status)
- `GET /v1/videos/:id` - Get video link
- `POST /v1/videos` - Create video link (Contributor+)
- `PUT /v1/videos/:id` - Update video link (Contributor+)
- `POST /v1/videos/:id/publish` - Publish video (Approver+)
- `POST /v1/videos/:id/expire` - Expire video (Approver+)

**URL Validation:**
- On create/update, URL is parsed to detect provider
- Embed URL and thumbnail URL are derived automatically for known providers
- Generic URLs have no embed URL (user opens link directly)

### Learning Paths

- `GET /v1/paths` - List paths (filters: product_suite, product_concept, persona, status)
- `GET /v1/paths/:id` - Get path
- `POST /v1/paths` - Create path (Contributor+)
- `PUT /v1/paths/:id` - Update path (Contributor+)
- `POST /v1/paths/:id/publish` - Publish path (Approver+)
- `POST /v1/paths/:id/archive` - Archive path (Approver+)

**Publish Validation:**
- All step `ref_id` values are validated before publishing
- Returns 400 error if any referenced items don't exist

### Progress

- `GET /v1/progress?path_id` - Get user progress (optionally filtered by path)
- `POST /v1/progress/complete` - Mark step complete
- `POST /v1/progress/reset` - Reset progress for a path (optional)

## Notifications

### Publish Notifications

When a video or path is published:
1. Query subscriptions matching product_suite, product_concept, and tags/persona_tags
2. Create notifications for matching subscribers
3. Use deterministic IDs: `video_published:{video_id}:{user_id}` or `path_published:{path_id}:{user_id}`

### Update Notifications

When a published path is updated:
1. Query `user_progress` table for users who have started the path
2. Create notifications for those users
3. Use deterministic IDs: `path_updated:{path_id}:{user_id}`

### Expiry Notifications

When a video is expired:
1. Query events table for users who interacted with the video (`video_viewed`, `video_opened`, `video_completed`)
2. Create notifications for those users
3. Use deterministic IDs: `video_expired:{video_id}:{user_id}`

## Telemetry Events

### Video Events

- `video_viewed` - Video card enters viewport (50% threshold) or video detail page loaded
  - Also records to localStorage for "Continue" section
- `video_opened` - User clicks to watch video
- `video_completed` - User marks video as complete

### Path Events

- `path_list_viewed` - User views paths list page
- `path_viewed` - User views path detail page
- `path_started` - User completes first step in a path (tracked automatically)
- `step_completed` - User marks a step as complete
- `progress_reset` - User resets progress for a path
- `path_created` - Contributor creates path
- `path_updated` - Contributor updates path
- `path_published` - Approver publishes path
- `path_archived` - Approver archives path

### Home Page Events (Phase 5.2)

- `home_viewed` - User views home page
- `home_continue_clicked` - User clicks continue button (includes path_id or video_id)
- `home_featured_path_clicked` - User clicks featured path from home
- `home_featured_video_clicked` - User clicks featured video from home
- `home_recommended_clicked` - User clicks recommended item (includes path_id or video_id)

### Completions Analytics Events (Phase 5.2)

- `completions_viewed` - Admin views completions page
- `completions_filter_applied` - Admin applies filters (includes days, product_suite, product_concept)
- `completions_csv_exported` - Admin exports CSV (includes filter params)
- `completions_row_opened` - Admin opens drill-in modal for a path (includes path_id)

### Event Metadata

All events include:
- `user_id` (from JWT, added automatically by telemetry system)
- `timestamp` (ISO string, added automatically)
- `metadata` (object with relevant IDs and context):
  - `path_id`, `step_id`, `video_id` (when applicable)
  - `product_suite`, `product_concept` (when available)
  - `provider` (for video events)
  - `completion_source` (for step/video completion: 'manual', 'video_end', 'mark_complete')

**No PII**: Events never include email addresses, names, or other personally identifiable information beyond `user_id`.

## Curation

### Featured Content

Both `LearningPath` and `VideoLink` support a `featured?: boolean` field for curation.

**API Behavior:**
- `GET /v1/paths?featured=true` - Filter to only featured paths
- `GET /v1/paths?sort=featured_then_recent` - Default sorting: featured items first, then by recency
- Same filters available for videos: `GET /v1/videos?featured=true&sort=featured_then_recent`

**UI Behavior:**
- PathsPage shows "Featured Learning Paths" section at top
- ReelsPage defaults to `sort=featured_then_recent` (featured videos appear first)
- Contributor+ can toggle "Featured" checkbox in create/edit dialogs
- **In-place curation (Phase 5.2):**
  - PathsPage: Contributor+ can toggle Featured star icon directly on path cards
  - Optimistic UI updates with rollback on error
  - Featured status persists immediately

## UI Components

### HomePage

The home page (`/enablement`) provides a personalized entry point:

**Continue Where You Left Off:**
- Shows up to 3 in-progress Learning Paths (progress > 0% and < 100%)
- Shows up to 5 recently viewed videos (from localStorage: `enablement.recentVideos`)
- Each path card shows:
  - Progress percentage and completed/total steps
  - Next incomplete step title
  - Progress bar
  - "Continue" button
- If no progress exists, shows friendly empty state with CTAs to browse paths/reels

**Featured Section:**
- Displays up to 3 featured paths and 6 featured videos
- Uses `featured=true` filter

**Recommended for You:**
- Based on selected product suite/concept (persisted in local storage)
- Prioritizes featured content, then recent
- Product selection persists across sessions
- Clear selection button to reset filters

**Product Selection:**
- Stored in `localStorage`:
  - `enablement_selected_product_suite`
  - `enablement_selected_product_concept`
- Used for recommendations and can be cleared by user

**Recent Videos Tracking:**
- Videos viewed in ReelsPage or VideoDetailPage are recorded to localStorage
- Key: `enablement.recentVideos` (array of video IDs, max 20)
- Used in "Continue" section to show recently viewed videos
- Managed by `continue.ts` helper: `recordVideoViewed(videoId)`

### ReelsPage

- Vertical feed of published videos
- Filters: product_suite, product_concept, persona
- Video cards with:
  - Thumbnail (if available)
  - Title, description, tags
  - Provider badge
  - Duration (if available)
  - Watch button (opens embed dialog)
  - Mark Complete button
- Intersection Observer tracks `video_viewed` events

### PathsPage

- Grid/list of published paths
- **"Featured Learning Paths"** section at top (if any featured paths exist)
- "Continue Where You Left Off" section (shows paths with progress)
- Filters: product_suite, product_concept, persona, status
- Path cards with:
  - Title, description, tags
  - Step count
  - Featured chip (if featured)
  - Start/Continue button
- Default sorting: `featured_then_recent` (featured first, then by recency)

### PathDetailPage

- **Path overview** with progress bar and completion percentage
- **"Continue Where You Left Off"** section:
  - Highlights first incomplete step
  - "Go to Step" button scrolls to step
  - "Open [Content/Document/Video]" button navigates directly to referenced item
- **Steps list** with:
  - Step type icon (content/brain_doc/video_link)
  - Step number, title override or default
  - Required badge (if required)
  - Completion state (completed vs incomplete styling)
  - Click step row to navigate to referenced item:
    - `content` → `/enablement/content/:id`
    - `brain_doc` → `/enablement/brain/:id`
    - `video_link` → `/enablement/videos/:id`
  - "Mark Complete" button per step
- **Reset Progress** button (clears all step completions for path)
- **Edit/Publish/Archive** buttons (role-gated: Contributor+ for edit, Approver+ for publish/archive)

## Workflows

### Creating and Publishing a Video

1. Contributor creates video link (Draft)
   - Enters URL, title, description, tags
   - System detects provider and derives embed URL
2. Approver publishes video
   - Status → Published
   - `published_at` and `published_by` set
   - Notifications sent to matching subscribers
3. Video appears in Reels feed

### Creating and Publishing a Path

1. Contributor creates path (Draft)
   - Adds steps referencing content/brain/video items
   - Can save as Draft without validation
2. Approver publishes path
   - System validates all step `ref_id` values
   - If validation fails, returns error
   - If validation succeeds:
     - Status → Published
     - `published_at` and `published_by` set
     - Notifications sent to matching subscribers
3. Path appears in Paths feed

### User Progress Flow

1. User views PathsPage
2. User clicks "Start Path" or opens path detail
   - `path_started` event tracked (on first step completion)
3. User navigates through steps
   - Clicks step to view referenced item
   - Marks step complete
   - `step_completed` event tracked
4. Progress saved to `user_progress` table
5. Path appears in "Continue" section on PathsPage

## Security

- **RBAC**: Video/Path creation requires Contributor+ role
- **Publish/Archive**: Requires Approver+ role
- **Progress**: Users can only view/modify their own progress
- **Notifications**: Deterministic IDs prevent duplicate notifications

## Performance Considerations

- **GSIs**: Used for product-based queries (videos_by_product, paths_by_product)
- **Progress GSI**: Optional but helpful for finding users who started a path
- **Event Queries**: Used for expiry notifications (may need pagination for large datasets)
- **Intersection Observer**: Efficient viewport tracking for video views

### CompletionsPage (Admin Only)

Admin-only analytics page at `/enablement/completions` showing learning path completion statistics.

**Features:**
- **Time Period Filter**: 7, 30, 90, or 365 days (filters by `completed_at` timestamp)
- **Product Filters**: Filter by `product_suite` and/or `product_concept` with "Apply" button
- **Table Display**:
  - Path Title (clickable, opens drill-in modal)
  - Total Completions (count of completed steps)
  - Unique Users (count of distinct users)
  - Top Users (top 10 users by completion count per path)
- **CSV Export**: Exports current filtered table data as CSV file
  - Filename: `completions-{days}days-{date}.csv`
  - Includes: path_id, path_title, product_suite, product_concept, total_completions, unique_users, top_users
- **Drill-in Modal**: Click any row to see:
  - Path details (ID, title, completion stats)
  - Full list of top users with completion counts
  - "View Path" button to navigate to path detail page

**API Endpoint:**
- `GET /v1/analytics/completions?days=30&product_suite=X&product_concept=Y`
- Filters by `completed_at` timestamp (real time-based filtering)
- Server-side filtering by product scope
- Returns paths sorted by completion count (descending)

**Data Aggregation:**
- Scans `user_progress` table
- Filters by `completed_at` within date window
- Groups by `path_id`
- Fetches path titles from `learning_paths` table
- Calculates top users per path (by completion count)

## Scripts

### Seed Script (`infra/scripts/seed-phase5-content.sh`)

Idempotent script to seed initial content for go-live.

**Auth Handling:**
- If `AUTH_TOKEN` env var is set: uses `Authorization: Bearer` header (JWT)
- Else: uses dev headers:
  - `x-dev-role`: `${X_DEV_ROLE:-Approver}`
  - `x-dev-user-id`: `${X_DEV_USER_ID:-seed-bot}`

**Content Created:**
- 3 Learning Paths (initially Draft, then published)
- 12 Videos (mix of YouTube/Loom/Vimeo, initially Draft, then published)
- Paths updated to include steps referencing created videos/content/brain docs

**Idempotency:**
- Checks for existing content by title before creating
- Skips creation if title already exists (prevents duplicates)

**Usage:**
```bash
# With JWT token
export AUTH_TOKEN="eyJ..."
./infra/scripts/seed-phase5-content.sh

# With dev headers
export X_DEV_ROLE=Approver
export X_DEV_USER_ID=seed-bot
./infra/scripts/seed-phase5-content.sh
```

## Future Enhancements

- **Video Completion Detection**: YouTube API integration for automatic completion on video end
- **Recommendations**: ML-based recommendations (currently rules-based: product scope + featured)
- **Streaks**: Track consecutive days of learning activity
- **Badges**: Achievement system for completing paths
- **Social Features**: Share paths, comment on videos

