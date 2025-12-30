# LMS v2 Architecture

## Overview

The LMS (Learning Management System) v2 module provides structured learning experiences through courses, learning paths, assignments, and certificates. This document defines the domain model, state machines, invariants, and API contracts for the LMS module.

## Module Boundaries

### Learn Module (Learner-Facing)
- **My Learning**: Personalized dashboard showing required, in-progress, and completed learning
- **Courses**: Browse and access courses
- **Learning Paths**: Structured learning journeys
- **Role Playing**: Practice scenarios and coaching workflows
- **My Certificates**: View earned certificates

### Learning Admin Module (Admin-Facing)
- **Courses**: Create and manage courses
- **Learning Paths**: Create and manage learning paths
- **Assignments**: Assign courses/paths to learners
- **Certificate Templates**: Design and manage certificate templates
- **Media Library**: Manage media assets for courses and learning content

## Domain Entities

### MediaRef

LMS-managed media references (images, videos, documents, audio).

**Key Fields:**
- `media_id`: Unique identifier
- `type`: Media type (image, video, document, audio, other)
- `url`: S3 URL or external URL
- `s3_bucket`, `s3_key`: S3 storage location (optional)
- `filename`, `content_type`, `size_bytes`: File metadata
- `width`, `height`: Dimensions (for images/videos)
- `duration_ms`: Duration (for videos/audio)
- `thumbnail_url`: Thumbnail URL (for videos)

**Notes:**
- MediaRef is used to reference media in courses, lessons, and other LMS entities
- The LMS manages these references but does not own the storage layer
- Media can be stored in S3 or external storage

### Course

A structured learning experience with sections and lessons.

**Key Fields:**
- `course_id`: Unique identifier
- `title`, `description`, `short_description`: Course metadata
- `product_suite`, `product_concept`: Categorization
- `topic_tags`: Array of topic tags
- `related_course_ids`: Manual list of related course IDs
- `cover_image`: MediaRef for cover image
- `badges`: Array of CourseBadge objects
- `sections`: Array of CourseSection objects
- `status`: Publishing status (draft, published, archived)
- `version`: Version number (increments on publish)
- `published_version`: Latest published version
- `published_at`, `published_by`: Publishing metadata
- `estimated_duration_minutes`, `difficulty_level`: Course metadata

**State Machine:**
- `draft` → `published` (creates immutable snapshot, version increment)
- `published` → `archived` (can archive published courses)
- Published snapshots are immutable for learners

**Invariants:**
- Published courses must have `published_at` and `published_by`
- Published courses must have at least one section
- All sections in published courses must have at least one lesson

### CourseSection

A section within a course containing lessons.

**Key Fields:**
- `section_id`: Unique identifier
- `title`, `description`: Section metadata
- `order`: Display order within course
- `lesson_ids`: Ordered list of lesson IDs

### Lesson

A single learning unit within a course section.

**Key Fields:**
- `lesson_id`: Unique identifier
- `course_id`, `section_id`: Parent references
- `title`, `description`: Lesson metadata
- `type`: Lesson type (video, reading, quiz, assignment, interactive)
- `order`: Display order within section
- `video_media`: MediaRef for video content
- `transcript_ref`: Reference to transcript_id
- `transcript`: Embedded transcript (for detail views)
- `resource_refs`: Array of media_id references
- `estimated_duration_minutes`: Estimated duration
- `required`: Whether lesson is required for completion

**Notes:**
- Lessons can contain video content, transcripts, and resource references
- Transcripts are stored for later RAG ingestion (Phase 7+)
- Transcripts include segments with timing information and optional full text cache

### Transcript

Full transcript with optional segments and cached full text.

**Key Fields:**
- `transcript_id`: Unique identifier
- `lesson_id`: Reference to lesson
- `video_media_id`: Reference to video media
- `segments`: Array of transcript segments with timing
- `full_text`: Cached full text (for search)
- `language`: Language code (default: 'en')

**Notes:**
- Transcripts are stored for later RAG ingestion (Phase 7+)
- Segments provide interactive transcript functionality
- Full text cache enables search functionality

### LearningPath

A structured sequence of courses that guide learners through a learning journey.

**Key Fields:**
- `path_id`: Unique identifier
- `title`, `description`, `short_description`: Path metadata
- `product_suite`, `product_concept`: Categorization
- `topic_tags`: Array of topic tags
- `badges`: Array of badge IDs that can be earned
- `courses`: Ordered list of LearningPathCourseRef objects
- `status`: Publishing status (draft, published, archived)
- `version`: Version number (increments on publish)
- `published_version`: Latest published version
- `published_at`, `published_by`: Publishing metadata
- `estimated_duration_minutes`: Estimated duration

**State Machine:**
- `draft` → `published` (creates immutable snapshot, version increment)
- `published` → `archived` (can archive published paths)
- Published snapshots are immutable for learners

**Invariants:**
- Published paths must have `published_at` and `published_by`
- Published paths must have at least one course

### Progress

Tracks learner progress through courses and paths.

**CourseProgress:**
- `user_id`, `course_id`: Composite key
- `enrollment_origin`: How learner was enrolled (self_enrolled, assigned, required, recommended)
- `enrolled_at`: Enrollment timestamp
- `percent_complete`: Progress percentage (0-100)
- `completed`: Completion flag
- `completed_at`: Completion timestamp
- `lesson_progress`: Map of lesson_id → LessonProgress
- `current_section_id`, `current_lesson_id`: Resume pointers
- `last_position_ms`: Resume position for video lessons

**PathProgress:**
- `user_id`, `path_id`: Composite key
- `enrollment_origin`: How learner was enrolled
- `enrolled_at`: Enrollment timestamp
- `percent_complete`: Progress percentage (0-100)
- `completed`: Completion flag
- `completed_at`: Completion timestamp
- `course_progress`: Map of course_id → percent_complete
- `current_course_id`: Resume pointer

**Invariants:**
- `percent_complete` must be 0-100
- Completion sets `completed_at` and `percent=100`
- Resume pointers (`current_lesson_id`, `last_position_ms`) track where learner left off

### Assignment

Assigns a course or learning path to a learner with a due date.

**Key Fields:**
- `assignment_id`: Unique identifier
- `user_id`: Learner user ID
- `assignment_type`: Type (course or path)
- `course_id`: Course ID (if assignment_type is 'course')
- `path_id`: Path ID (if assignment_type is 'path')
- `status`: Assignment status (assigned, started, completed, waived)
- `due_at`: Due date (ISO datetime)
- `assigned_by`, `assigned_at`: Assignment metadata
- `waived_by`, `waived_at`: Waiver metadata (if waived)
- `started_at`, `completed_at`: Status timestamps

**State Machine:**
- `assigned` → `started` (learner starts)
- `started` → `completed` (learner completes)
- `assigned` → `waived` (admin action)
- `started` → `waived` (admin action)
- `completed` and `waived` are terminal states

**Invariants:**
- Must have either `course_id` or `path_id` (not both)
- Terminal states (`completed`, `waived`) cannot transition back
- Overdue is computed: `due_at < now && status not in [completed, waived]`

### CertificateTemplate

Admin-managed template for certificates that can be issued to learners.

**Key Fields:**
- `template_id`: Unique identifier
- `name`, `description`: Template metadata
- `design_json`: Template design data (JSON)
- `background_image`: MediaRef for background image
- `issuance_rules`: Rules for when certificates are issued
  - `course_ids`: Courses that trigger issuance
  - `path_ids`: Paths that trigger issuance
  - `require_all_courses`: If true, all courses must be completed
  - `require_all_paths`: If true, all paths must be completed
- `status`: Template status (draft, active, archived)

**Notes:**
- Templates define the design, content, and issuance rules
- Active templates should have at least one issuance rule

### IssuedCertificate

A certificate that has been issued to a learner (learner-facing "My Certificates").

**Key Fields:**
- `certificate_id`: Unique identifier
- `user_id`: Learner user ID
- `template_id`: Reference to certificate template
- `issued_at`, `issued_by`: Issuance metadata
- `completion_type`: Type (course or path)
- `course_id`: Course ID (if completion_type is 'course')
- `path_id`: Path ID (if completion_type is 'path')
- `certificate_data`: Snapshot at issuance
  - `recipient_name`: Recipient name
  - `course_title`, `path_title`: Completion context
  - `completion_date`: Completion date
  - `certificate_number`: Optional certificate number
- `certificate_pdf_url`, `certificate_image_url`: Generated certificate URLs

## API Contracts

### CourseSummary

Lightweight course representation for catalog and related courses.

**Fields:**
- `course_id`, `title`, `short_description`
- `cover_image_url`: Cover image URL
- `product_suite`, `product_concept`, `topic_tags`
- `estimated_duration_minutes`, `difficulty_level`
- `status`, `published_at`

### CourseDetail

Full course metadata with outline (sections and lessons).

**Extends:** Course with hydrated sections containing lesson summaries.

### LessonDetail

Full lesson content including video media, transcript segments, and resources.

**Extends:** Lesson with hydrated media, transcript, and resources.

### LearningPathSummary

Lightweight path representation for catalog.

**Fields:**
- `path_id`, `title`, `short_description`
- `product_suite`, `product_concept`, `topic_tags`
- `estimated_duration_minutes`, `course_count`
- `status`, `published_at`

### LearningPathDetail

Full path metadata with hydrated course summaries.

**Extends:** LearningPath with hydrated course summaries.

### MyLearning

Learner's personalized learning dashboard.

**Fields:**
- `required`: Array of required/assigned items with due dates
- `in_progress`: Array of in-progress items with progress
- `completed`: Array of completed items

### AssignmentSummary

Assignment representation for lists and detail views.

**Fields:**
- `assignment_id`, `assignment_type`, `course_id`, `path_id`
- `title`: Course or path title
- `status`, `due_at`, `assigned_at`
- `progress_percent`, `is_overdue`

### CertificateSummary

Learner-facing certificate representation for "My Certificates".

**Fields:**
- `certificate_id`, `template_id`, `template_name`
- `recipient_name`, `course_title`, `path_title`
- `completion_date`, `issued_at`
- `certificate_pdf_url`, `certificate_image_url`

### CertificateTemplateSummary

Admin-facing certificate template representation.

**Fields:**
- `template_id`, `name`, `description`, `status`
- `issuance_count`: Number of certificates issued
- `created_at`, `updated_at`

## State Machines and Invariants

### Publishing Model

**Courses and Learning Paths:**
- `draft` → `published` (version increment, creates immutable snapshot)
- `published` → `archived` (can archive published items)
- Published snapshots are immutable for learners
- Draft items can be edited freely

**Invariants:**
- Published items must have `published_at` and `published_by`
- Published courses must have at least one section with lessons
- Published paths must have at least one course

### Assignment Status

**State Machine:**
- `assigned` → `started` (learner starts)
- `started` → `completed` (learner completes)
- `assigned` → `waived` (admin action)
- `started` → `waived` (admin action)
- `completed` and `waived` are terminal states

**Overdue Computation:**
- Overdue if `due_at < now && status not in [completed, waived]`
- Store status or compute consistently

**Invariants:**
- Must have either `course_id` or `path_id` (not both)
- Terminal states cannot transition back
- Completed assignments must have `completed_at`
- Waived assignments must have `waived_at` and `waived_by`

### Progress Rules

**Invariants:**
- `percent_complete` must be 0-100
- Completion sets `completed_at` and `percent=100`
- Resume pointers (`current_lesson_id`, `last_position_ms`) track where learner left off
- Progress with 100% completion must be marked as completed

### Related Courses

**Manual List:**
- Optional `related_course_ids` array on Course
- API supports hydrated `related` CourseSummary list

**Future Enhancement:**
- Fallback algorithm for automatic related course suggestions (Phase 7+)

## Telemetry

### Event Taxonomy

LMS events follow a canonical naming convention (snake_case) and flow through the existing `/v1/events` pipeline:

**Catalog / Navigation:**
- `lms_courses_listed` - Courses catalog viewed
- `lms_paths_listed` - Learning paths catalog viewed

**Detail Views:**
- `lms_course_viewed` - Course detail page viewed
- `lms_lesson_viewed` - Lesson player page viewed
- `lms_path_viewed` - Learning path detail page viewed

**Enrollment and Progress:**
- `lms_enrolled` - User enrolled in a course
- `lms_progress_updated` - Lesson progress updated (rate-limited)
- `lms_lesson_completed` - Lesson marked as complete
- `lms_course_completed` - Course completed

**Assignments and Certificates:**
- `lms_assignments_listed` - Assignments page viewed
- `lms_certificates_listed` - Certificates page viewed

**Optional Events:**
- `lms_search_performed` - Search query executed
- `lms_filter_applied` - Filter applied to catalog
- `lms_resume_clicked` - Resume button clicked
- `lms_start_clicked` - Start button clicked

### Standard Payload Fields

All LMS events include:

**Required:**
- `event_name`: Event identifier (from taxonomy above)
- `occurred_at`: ISO datetime (set server-side)
- `user_id`: Cognito sub (resolved from auth principal)
- `source.source_app`: Always "web"
- `source.source_route`: Full request path and method (e.g., "GET /v1/lms/courses/course_123")
- `source.source_api_route`: Normalized route with parameter placeholders (e.g., "/v1/lms/courses/:courseId")
- `source.source_method`: HTTP method (e.g., "GET", "POST")

**Optional (context-dependent):**
- `source.source_page`: Stable page identifier (e.g., "courses_catalog", "course_detail", "lesson_player", "my_learning", "paths_catalog", "path_detail", "certificates")
- `source.source_component`: Component identifier (e.g., "CourseCard", "StartButton")
- `course_id`, `lesson_id`, `path_id`, `assignment_id`, `certificate_id`: Entity identifiers
- `enrollment_origin`: How user was enrolled ("self_enrolled", "assigned", etc.)
- `progress_percent`: Progress percentage (0-100)
- `position_ms`: Video position in milliseconds
- `completed`: Boolean completion flag
- `q`: Search query text
- `badge_filters`, `topic_filters`: Filter arrays
- `product_suite`, `product_concept`: Product filters
- `ui_action`: UI action type ("click", "view", "submit", "auto")

### Deduplication Strategy

**Progress Events (`lms_progress_updated`):**
- Rate-limited to **once per 30 seconds** per user+course+lesson combination
- Server tracks `last_progress_event_at` timestamp in lesson progress metadata
- Completion events (`lms_lesson_completed`, `lms_course_completed`) are always emitted (not rate-limited)
- Progress state is still updated in DynamoDB on every request; only telemetry emission is rate-limited

**View Events:**
- Emitted server-side on GET requests (not duplicated in client)
- One event per API call (no client-side duplication)

### Client-to-Server Context Propagation

The web client can optionally pass telemetry context to enrich server-side events:

**For GET requests:** Context passed via HTTP headers:
- `x-telemetry-source-page`: Page identifier
- `x-telemetry-source-component`: Component identifier
- `x-telemetry-ui-action`: UI action type

**For POST requests:** Context included in request body under `telemetry` field:
```json
{
  "course_id": "...",
  "telemetry": {
    "source_page": "course_detail",
    "source_component": "StartButton",
    "ui_action": "click"
  }
}
```

Server merges client-provided context with server-derived context (route, timestamp, user_id).

### Implementation

- **Server Helper:** `apps/api/src/telemetry/lmsTelemetry.ts` - `emitLmsEvent()` function
- **Client Support:** `apps/web/src/api/lmsClient.ts` - Optional `telemetry` context parameter
- **Event Storage:** Events flow into existing `/v1/events` endpoint and `events` DynamoDB table
- **No PII:** Events only include `user_id` (Cognito sub), not email addresses

## Future Integration Points

### DAM (Digital Asset Management)

**Current State:**
- LMS uses MediaRef to reference media assets
- Media can be stored in S3 or external storage
- LMS manages references but does not own storage layer

**Future Integration:**
- DAM module will provide centralized media management
- LMS will integrate with DAM for media asset operations
- MediaRef will reference DAM assets

### RAG (Retrieval-Augmented Generation)

**Current State:**
- Transcripts are stored with segments and full text
- Transcripts are linked to lessons via `transcript_ref` or embedded `transcript`

**Future Integration:**
- Transcripts will be ingested into RAG system (Phase 7+)
- Full text cache enables search functionality
- RAG will enable AI-powered course recommendations and search

### AI Assistant/Brain

**Current State:**
- No AI Assistant/Brain integration in LMS v2

**Future Integration:**
- AI Assistant will use LMS data for context
- Brain will ingest course content and transcripts
- AI-powered learning recommendations (Phase 7+)

## Implementation Notes

### Type Safety

- All types are defined using Zod schemas in `packages/domain/src/lms/`
- Types are exported from `packages/domain` and can be imported by both API and web
- API contracts ensure type safety between API and UI

### Validation

- Zod schemas provide runtime validation
- Validator functions enforce business rules and invariants
- State machine transitions are validated

### Fixtures

- Minimal typed mock objects in `packages/domain/src/lms/fixtures.ts`
- Fixtures match API contracts and can be used in placeholder pages
- Fixtures enable UI development without live API endpoints

### Date/Time Conventions

- All timestamps use ISO 8601 datetime strings
- Examples: `'2024-01-15T10:00:00Z'`
- Duration stored as milliseconds (`duration_ms`) or minutes (`estimated_duration_minutes`)

## Storage Infrastructure

### DynamoDB Tables

#### lms_courses

**Primary Key:**
- PK: `course_id` (String)

**Global Secondary Indexes:**
- **PublishedCatalogIndex**: Query published courses
  - Partition: `status` (String)
  - Sort: `published_at` (String)
- **ProductIndex**: Query courses by product suite
  - Partition: `product_suite` (String)
  - Sort: `updated_at` (String)

**Key Attributes:**
- `course_id`, `title`, `description`, `status`, `version`
- `product_suite`, `product_concept`, `topic_tags`
- `published_at`, `published_by`, `created_at`, `updated_at`

**Notes:**
- Stores both draft and published course snapshots
- Published courses are immutable (version increment creates new snapshot)

#### lms_lessons

**Primary Key:**
- PK: `course_id` (String)
- SK: `lesson_id` (String)

**Global Secondary Indexes:**
- **LessonByIdIndex**: Direct lookup by lesson_id
  - Partition: `lesson_id` (String)

**Key Attributes:**
- `course_id`, `lesson_id`, `section_id`, `title`, `type`
- `video_media`, `transcript_ref`, `resource_refs`
- `created_at`, `updated_at`

**Notes:**
- Lessons are scoped to courses
- Transcripts stored inline or referenced for future RAG ingestion

#### lms_paths

**Primary Key:**
- PK: `path_id` (String)

**Global Secondary Indexes:**
- **PublishedPathsIndex**: Query published paths
  - Partition: `status` (String)
  - Sort: `published_at` (String)

**Key Attributes:**
- `path_id`, `title`, `description`, `status`, `version`
- `product_suite`, `product_concept`, `topic_tags`
- `courses` (array of course references)
- `published_at`, `published_by`, `created_at`, `updated_at`

**Notes:**
- Stores both draft and published path snapshots
- Published paths are immutable (version increment creates new snapshot)

#### lms_progress

**Primary Key:**
- PK: `user_id` (String)
- SK: `SK` (String) - Format: `COURSE#course_id` or `PATH#path_id`

**Global Secondary Indexes:**
- **CourseProgressByCourseIndex**: Query all users' progress for a course
  - Partition: `course_id` (String)
  - Sort: `last_activity_at` (String)

**Key Attributes:**
- `user_id`, `SK`, `course_id` (for course progress), `path_id` (for path progress)
- `enrollment_origin`, `enrolled_at`
- `percent_complete`, `completed`, `completed_at`
- `lesson_progress` (map), `current_lesson_id`, `last_position_ms`
- `last_activity_at`, `updated_at`

**Notes:**
- Composite SK pattern allows both course and path progress in same table
- Resume pointers (`current_lesson_id`, `last_position_ms`) track learner position

#### lms_assignments

**Primary Key:**
- PK: `assignee_user_id` (String)
- SK: `SK` (String) - Format: `ASSIGNMENT#assigned_at#assignment_id`

**Global Secondary Indexes:**
- **AssignmentsByTargetIndex**: Query assignments for a course/path
  - Partition: `target_key` (String) - Format: `TARGET#target_type#target_id`
  - Sort: `due_at` (String)
- **AssignmentsByStatusIndex**: Query assignments by status (for overdue dashboards)
  - Partition: `status` (String)
  - Sort: `due_at` (String)

**Key Attributes:**
- `assignee_user_id`, `SK`, `assignment_id`
- `assignment_type` (course or path), `course_id`, `path_id`
- `status`, `due_at`, `assigned_at`, `assigned_by`
- `started_at`, `completed_at`, `waived_at`, `waived_by`
- `target_key` (computed: `TARGET#target_type#target_id`)

**Notes:**
- Composite SK includes timestamp for chronological ordering
- Overdue computed: `due_at < now && status not in [completed, waived]`

#### lms_certificates

**Primary Key:**
- PK: `entity_type` (String) - Format: `TEMPLATE` or `ISSUED#user_id`
- SK: `SK` (String) - Format: `template_id` or `issued_at#certificate_id`

**Global Secondary Indexes:**
- **TemplatesByUpdatedIndex**: Query certificate templates
  - Partition: `entity_type` (String) - Value: `TEMPLATE`
  - Sort: `updated_at` (String)
- **IssuedCertificatesByUserIndex**: Query issued certificates for a user
  - Partition: `user_id` (String)
  - Sort: `issued_at` (String)

**Key Attributes:**
- `entity_type`, `SK`
- For templates: `template_id`, `name`, `description`, `status`, `applies_to`, `applies_to_id`, `badge_text`, `signatory_name`, `signatory_title`, `issued_copy`, `created_at`, `updated_at`, `published_at`
- For issued: `certificate_id`, `user_id`, `template_id`, `issued_at`, `completion_type`, `course_id`, `path_id`, `certificate_data` (snapshot)
- `created_at`, `updated_at` (templates), `user_id`, `issued_at` (for GSI)

**Notes:**
- Single table stores both templates and issued certificates
- Entity type prefix enables efficient querying
- Templates use `TEMPLATE` as entity_type, issued certificates use `ISSUED#user_id`
- Certificate issuance is idempotent (deterministic certificate_id prevents duplicates)
- Templates queried via `TemplatesByUpdatedIndex` GSI (limit 200 for MVP)
- Issued certificates queried via `IssuedCertificatesByUserIndex` GSI (limit 200 for MVP)

### S3 Bucket: LMS Media Storage

**Bucket Name:** `lms-media-{account}-{region}` (configured via `LMS_MEDIA_BUCKET` env var)

**Key Prefixes:**
- `covers/{course_id}/{filename}` - Course cover images
- `videos/{course_id}/{lesson_id}/{filename}` - Video files
- `posters/{course_id}/{lesson_id}/{filename}` - Video poster images
- `attachments/{course_id}/{lesson_id}/{filename}` - Lesson attachments

**Storage Configuration:**
- Versioning: Enabled
- Encryption: S3-managed encryption (SSE-S3)
- Public Access: Blocked (all access via presigned URLs or IAM)
- CORS: Configured for web app origins

**MediaRef Mapping:**
- `MediaRef.s3_bucket` → LMS media bucket name
- `MediaRef.s3_key` → Full S3 object key (includes prefix)
- `MediaRef.url` → Presigned URL or public URL (if configured)

**Notes:**
- MediaRef objects reference S3 objects but don't own storage layer
- Upload endpoints will be implemented in Phase 4+
- Transcripts stored in DynamoDB (lessons table) for future RAG ingestion

### Environment Variables

**API Runtime (Lambda):**
- `LMS_COURSES_TABLE` - DynamoDB table name for courses
- `LMS_LESSONS_TABLE` - DynamoDB table name for lessons
- `LMS_PATHS_TABLE` - DynamoDB table name for learning paths
- `LMS_PROGRESS_TABLE` - DynamoDB table name for progress
- `LMS_ASSIGNMENTS_TABLE` - DynamoDB table name for assignments
- `LMS_CERTIFICATES_TABLE` - DynamoDB table name for certificates
- `LMS_MEDIA_BUCKET` - S3 bucket name for LMS media

**Local Development:**
- All LMS env vars have fallback defaults (table/bucket names without prefix)
- Missing env vars won't crash runtime (defensive configuration)
- Tables can be created manually or via `infra/scripts/create-tables.ts`

### IAM Permissions

**Lambda Execution Role:**
- DynamoDB: Read/write on all LMS tables (including GSIs)
- S3: Read/write on LMS media bucket objects
- CloudWatch Logs: Write permissions (via AWSLambdaBasicExecutionRole)

**Table Permissions:**
- `dynamodb:PutItem`, `GetItem`, `UpdateItem`, `DeleteItem`
- `dynamodb:Query`, `BatchGetItem`, `BatchWriteItem`
- GSI query permissions included

**S3 Permissions:**
- `s3:GetObject`, `PutObject`, `DeleteObject` on bucket objects
- `s3:ListBucket` on bucket (for listing operations)

## Certificates v1 (Phase 9)

### Overview

Phase 9 implements a minimal end-to-end certificates experience:
- Admin can create and manage Certificate Templates
- System issues certificates automatically when a learner completes a Course or Learning Path
- Learner can view and download their issued certificates in "My Certificates"
- Telemetry emitted for template actions, issuance, and downloads

### Data Model

#### Certificate Template Storage

**Table:** `lms_certificates`
- **PK:** `entity_type` = `"TEMPLATE"`
- **SK:** `template_id`
- **GSI:** `TemplatesByUpdatedIndex`
  - Partition: `entity_type` = `"TEMPLATE"`
  - Sort: `updated_at`

**Key Attributes:**
- `template_id`, `name`, `description`, `status`
- `applies_to` (enum: `course` | `path`)
- `applies_to_id` (Course ID or Path ID)
- `badge_text`, `signatory_name`, `signatory_title`, `issued_copy`
- `created_at`, `updated_at`, `published_at`

**Query Patterns:**
- List templates: Query `TemplatesByUpdatedIndex` GSI with `entity_type = "TEMPLATE"`, sorted by `updated_at` DESC
- Get template: GetItem by `entity_type` + `template_id`
- Limit guard: All list operations enforce `limit <= 200`

#### Issued Certificate Storage

**Table:** `lms_certificates`
- **PK:** `entity_type` = `"ISSUED#{user_id}"`
- **SK:** `issued_at#certificate_id` (ISO datetime + certificate ID)
- **GSI:** `IssuedCertificatesByUserIndex`
  - Partition: `user_id`
  - Sort: `issued_at` DESC

**Key Attributes:**
- `certificate_id` (deterministic: `cert_{SHA256(user_id|template_id|completion_type|target_id)}`)
- `user_id`, `template_id`, `issued_at`
- `completion_type` (enum: `course` | `path`)
- `course_id` (if `completion_type = "course"`)
- `path_id` (if `completion_type = "path"`)
- `certificate_data` (snapshot object)

**Query Patterns:**
- List user certificates: Query `IssuedCertificatesByUserIndex` GSI with `user_id`, sorted by `issued_at` DESC
- Get certificate: GetItem by `entity_type` + `SK`
- Limit guard: All list operations enforce `limit <= 200`

**Idempotency:**
- Certificate ID is deterministic: `cert_{SHA256(user_id|template_id|completion_type|target_id)}`
- Conditional put: `attribute_not_exists(entity_type) AND attribute_not_exists(SK)`
- Prevents duplicate issuance for same user+template+target combination
- Telemetry `lms_certificate_issued` emitted only on new certificate creation (not duplicates)

### Entities

#### CertificateTemplate

Admin-managed template for certificates that can be issued to learners.

**Fields:**
- `template_id` (string) - Unique identifier
- `name` (string) - Template name
- `description` (string, optional) - Template description
- `status` (enum: `draft` | `published` | `archived`) - Template status
- `applies_to` (enum: `course` | `path`) - What triggers issuance
- `applies_to_id` (string) - Course ID or Path ID
- `badge_text` (string) - Text displayed on certificate badge
- `signatory_name` (string) - Name of signatory
- `signatory_title` (string) - Title of signatory
- `issued_copy` (string) - Short learner-facing text
- `created_at`, `updated_at`, `published_at` (ISO datetime strings)

**Status Flow:**
- `draft` → `published` (via publish endpoint, requires Approver+ role)
- `published` → `archived` (via archive endpoint)
- Only `published` templates trigger automatic issuance

#### IssuedCertificate

A certificate that has been issued to a learner.

**Fields:**
- `certificate_id` (string) - Unique identifier (deterministic: `cert_{SHA256(user_id|template_id|completion_type|target_id)}`)
- `user_id` (string) - Learner user ID
- `template_id` (string) - Template reference
- `issued_at` (ISO datetime) - When certificate was issued
- `completion_type` (enum: `course` | `path`) - What was completed
- `course_id` (string, optional) - Course ID if completion_type is 'course'
- `path_id` (string, optional) - Path ID if completion_type is 'path'
- `certificate_data` (object) - Snapshot of template data at issuance:
  - `recipient_name`, `course_title`, `path_title`, `completion_date`
  - `badge_text`, `signatory_name`, `signatory_title`, `issued_copy`

**Idempotency:**
- Certificate ID is deterministic using SHA-256 hash: `cert_{hash(user_id|template_id|completion_type|target_id)}`
- Hash ensures consistent length and avoids special characters
- Prevents duplicate issuance for same user+template+target combination
- Uses DynamoDB conditional put (`attribute_not_exists(entity_type) AND attribute_not_exists(SK)`) for safety
- Telemetry `lms_certificate_issued` is emitted only when a new certificate is created (not on duplicates)

### Issuance Rules

**Automatic Issuance:**
- When a course is completed: System checks for published templates where `applies_to=course` and `applies_to_id=course_id`
- Multiple templates can match (all are issued)
- Issuance happens synchronously during completion event (non-blocking, errors logged but don't fail completion)
- Issuance is idempotent: retries and concurrent requests do not create duplicates

**Path Completion (Phase 10):**
- Path completion tracking is implemented in Phase 10
- Path certificates are issued automatically when a path is completed
- See Phase 10 section below for details

### API Endpoints

#### Admin Endpoints

**RBAC Matrix:**
- **Contributor+**: List, create, update templates
- **Approver+**: Publish and archive templates

**Endpoints:**
- `GET /v1/lms/admin/certificates/templates` - List templates (Contributor+)
- `POST /v1/lms/admin/certificates/templates` - Create template (Contributor+)
- `GET /v1/lms/admin/certificates/templates/:templateId` - Get template (Contributor+)
- `PUT /v1/lms/admin/certificates/templates/:templateId` - Update template (Contributor+)
- `POST /v1/lms/admin/certificates/templates/:templateId/publish` - Publish template (Approver+)
- `POST /v1/lms/admin/certificates/templates/:templateId/archive` - Archive template (Approver+)

#### Learner Endpoints (RBAC: Viewer+)

- `GET /v1/lms/certificates` - List my issued certificates
- `GET /v1/lms/certificates/:certificateId` - Get certificate details
- `GET /v1/lms/certificates/:certificateId/download` - Download PDF (generates on demand)

### PDF Generation

**Approach:** Generate PDF on demand using `pdfkit` library
- PDF is generated when download endpoint is called
- Includes: certificate title (from `issued_copy.title`), learner name, completion date, course/path title, badge text, signatory info (if provided)
- Response headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="certificate-{certificateId}.pdf"`
  - `Cache-Control: private, no-store`
- IDOR protection: Certificate must belong to requesting user (verified via `user_id`)
- No S3 storage required for MVP

### Telemetry Events

- `lms_admin_certificate_template_created` - Template created
- `lms_admin_certificate_template_updated` - Template updated
- `lms_admin_certificate_template_published` - Template published
- `lms_admin_certificate_template_archived` - Template archived
- `lms_certificate_issued` - Certificate issued (automatic)
- `lms_certificates_listed` - Certificates list viewed
- `lms_certificate_downloaded` - Certificate PDF downloaded

All events include normalized source fields (`source_route`, `source_api_route`, `source_method`, `source_page` when available).

**Event Payload Fields:**
- Template events: `template_id`, `applies_to`, `applies_to_id`
- Certificate issuance: `certificate_id`, `template_id`, `completion_type`, `course_id` or `path_id`
- Certificate download: `certificate_id`, `template_id`

### Troubleshooting and Local Testing

**Local Testing with Dynalite:**

1. **Start Dynalite:**
   ```bash
   tsx scripts/lms/start_local_dynamo.ts
   ```

2. **Create tables:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
   ```

3. **Seed test data:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
   ```

4. **Start API:**
   ```bash
   cd apps/api
   DYNAMODB_ENDPOINT=http://localhost:8000 \
   STORAGE_BACKEND=aws \
   AWS_ACCESS_KEY_ID=dummy \
   AWS_SECRET_ACCESS_KEY=dummy \
   AWS_REGION=us-east-1 \
   npm run dev
   ```

**Verify Certificate Issuance:**
- Complete a course that has a matching certificate template
- Query `lms_certificates` table for `entity_type = "ISSUED#{user_id}"`
- Verify `certificate_id` matches deterministic hash pattern
- Verify telemetry event `lms_certificate_issued` in `events` table

**Common Issues:**
- **Certificate not issued:** Check template `status = "published"` and `applies_to_id` matches course/path ID
- **Duplicate certificates:** Should not occur due to idempotent conditional put
- **PDF generation fails:** Check API logs for pdfkit errors

## Learning Paths and Rollups (Phase 10)

### Overview

Phase 10 implements learner-ready Learning Paths with progress rollups:
- Learners can browse paths, view path details, start/resume paths, and see rollup progress
- Progress is computed deterministically from course completion and rolled up to path-level progress
- Path completion is derived from course completion (no background workers required)
- Rollups update synchronously on relevant progress writes

### Entities

#### PathProgress

Tracks learner progress through a learning path with rollup from course completion.

**Fields:**
- `user_id` (string) - PK
- `path_id` (string) - SK
- `enrollment_origin` (enum) - How learner was enrolled
- `enrolled_at` (ISO datetime) - Enrollment timestamp
- `total_courses` (int) - Total courses in path
- `completed_courses` (int) - Number of completed courses
- `percent_complete` (int, 0-100) - Progress percentage
- `status` (enum: `not_started` | `in_progress` | `completed`) - Path status
- `completed` (boolean) - Completion flag
- `completed_at` (ISO datetime, optional) - Completion timestamp
- `next_course_id` (string, optional) - First incomplete course in order
- `started_at` (ISO datetime, optional) - When path was started
- `last_activity_at` (ISO datetime, optional) - Last activity timestamp
- `updated_at` (ISO datetime) - Last update timestamp

**Rollup Algorithm:**
1. Fetch path's ordered course_ids
2. For each course, check user's course completion status
3. Compute:
   - `completed_courses`: Count of courses where `completed = true`
   - `percent_complete`: `(completed_courses / total_courses) * 100`
   - `status`: `completed` if all courses done, `in_progress` if any started, else `not_started`
   - `next_course_id`: First course in order that is not completed
4. Set `completed_at` when path becomes completed (idempotent)

**Idempotency:**
- Rollup computation is deterministic and idempotent
- Re-computing rollup with same course completion state produces same result
- `completed_at` is set once when path becomes completed (never overwritten)

**Timestamp Semantics:**
- `started_at`: Set once on first transition out of `not_started` (when any course progress exists), preserved across recomputations
- `completed_at`: Set once when `status` transitions to `completed`, never overwritten
- `last_activity_at`: Updated on every rollup recomputation triggered by a progress write (indicates recent activity)
- `updated_at`: Updated on every DynamoDB write

**Idempotency Rules:**
- Re-computing rollup with same course completion state yields identical rollup fields (except `last_activity_at` which updates)
- Re-completing a course that's already completed does not increment `completed_courses` again
- `completed_at` timestamp is preserved if already set (never overwritten)

### Data Model

#### Path Progress Storage

**Table:** `lms_progress`
- **PK:** `user_id`
- **SK:** `PATH#{path_id}`
- **GSI:** None (query by user_id with SK prefix filter)

**Key Attributes:**
- `user_id`, `SK` (format: `PATH#{path_id}`)
- `path_id`, `enrollment_origin`, `enrolled_at`
- `total_courses`, `completed_courses`, `percent_complete`
- `status` (enum: `not_started` | `in_progress` | `completed`)
- `completed` (boolean), `completed_at` (ISO datetime, optional)
- `next_course_id` (string, optional)
- `started_at` (ISO datetime, optional)
- `last_activity_at` (ISO datetime, optional)
- `updated_at` (ISO datetime)

**Query Patterns:**
- Get user path progress: GetItem by `user_id` + `SK = "PATH#{path_id}"`
- List user paths: Query by `user_id` with `begins_with(SK, "PATH#")` filter
- No GSI needed (user-scoped queries use PK)

#### Reverse Index: Course → Paths

**Implementation:**
- Mapping items stored in `lms_progress` table (reusing existing `CourseProgressByCourseIndex` GSI):
  - **PK (user_id):** `__SYSTEM__` (special system user ID)
  - **SK:** `COURSEPATH#COURSE#{course_id}#PATH#{path_id}`
  - **Attributes:** 
    - `entity_type: "lms_course_paths"` (for filtering)
    - `course_id` (GSI partition key)
    - `last_activity_at` (GSI sort key, required)
    - `path_id`, `path_status: "published"` (for filtering)
    - `updated_at`
- Mappings are created/updated when a path is published via `syncCoursePathMappingsForPublishedPath()`
- Mappings are deleted when a path's course_refs change (diff old vs new course_ids)
- Query by course_id using `CourseProgressByCourseIndex` GSI to get affected path_ids (no scan, efficient lookup)
- Method: `listPublishedPathIdsForCourse(courseId)` - queries GSI by `course_id`, filters by `entity_type` and `path_status`

**Query Pattern:**
```typescript
QueryCommand {
  TableName: 'lms_progress',
  IndexName: 'CourseProgressByCourseIndex',
  KeyConditionExpression: 'course_id = :courseId',
  FilterExpression: 'entity_type = :entityType AND #pathStatus = :pathStatus',
  ExpressionAttributeNames: { '#pathStatus': 'path_status' },
  ExpressionAttributeValues: {
    ':courseId': courseId,
    ':entityType': 'lms_course_paths',
    ':pathStatus': 'published'
  },
  Limit: Math.min(limit, 200) // Pagination guard
}
```

**Reserved Keywords:**
- `path_status` is a reserved keyword in DynamoDB, so `ExpressionAttributeNames` must be used: `#pathStatus`
- All DynamoDB expressions use `ExpressionAttributeNames` where needed to avoid reserved keyword conflicts

### API Endpoints

#### Learner Endpoints (RBAC: Viewer+)

**GET /v1/lms/paths**
- List published paths with rollup progress for current user
- Response includes `PathSummary[]` with `progress` field
- Telemetry: `lms_paths_listed`

**GET /v1/lms/paths/:pathId**
- Get path detail with ordered course summaries and user rollup
- Response includes `PathDetail` with `progress` and `course_completion` fields
- Telemetry: `lms_path_viewed`

**POST /v1/lms/paths/:pathId/start**
- Start a path (creates progress row if not exists, sets `started_at`)
- Returns `PathProgress`
- Telemetry: `lms_path_started`

#### Rollup Update Flow

**Trigger:** Course completion via `POST /v1/lms/progress` with `completed: true`

**Process:**
1. After persisting course progress, if course is completed:
   - Find published paths containing this course (using reverse index)
   - For each affected path:
     - Recompute user's path rollup deterministically
     - Update PathProgress in DynamoDB
     - Emit `lms_path_progress_updated` telemetry
   - If path becomes completed:
     - Set `completed_at` (idempotent)
     - Emit `lms_path_completed` telemetry
     - Issue path certificate if template exists

**Performance:**
- Rollup updates happen synchronously but are non-blocking (errors logged, don't fail request)
- Reverse lookup uses QueryCommand on `CourseProgressByCourseIndex` GSI with `course_id` as partition key - no scan, efficient
- Telemetry events emitted only when state changes (avoid noisy telemetry)
- All queries use bounded limits (`limit <= 200`) to prevent unbounded operations
- No pagination loops: single query per course completion (bounded by number of paths containing course)

**Concurrency:**
- Rollup updates are deterministic: same course completion state always produces same rollup
- Multiple concurrent progress writes for same course will trigger multiple rollup recomputations
- Each recomputation reads current course completion state, so final state is correct regardless of order
- `completed_at` is set idempotently (conditional: only if not already set)
- DynamoDB conditional writes ensure no race conditions on timestamp fields

### Telemetry Events

**lms_paths_listed**
- Emitted when learner lists paths
- Metadata: `result_count`

**lms_path_viewed**
- Emitted when learner views path detail
- Metadata: `path_id`

**lms_path_started**
- Emitted when learner starts a path
- Metadata: `path_id`

**lms_path_progress_updated**
- Emitted when path rollup is updated
- Metadata: `path_id`, `percent_complete`, `completed_courses`, `total_courses`

**lms_path_completed**
- Emitted when path becomes completed
- Metadata: `path_id`, `completed_at`

All events include required source fields: `source_app`, `source_api_route`, `source_route`, `source_method`

### Troubleshooting and Local Testing

**Local Testing with Dynalite:**

1. **Start Dynalite:**
   ```bash
   tsx scripts/lms/start_local_dynamo.ts
   ```

2. **Create tables:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
   ```

3. **Seed Phase 10 test data:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase10_paths.ts
   ```

4. **Start API:**
   ```bash
   cd apps/api
   DYNAMODB_ENDPOINT=http://localhost:8000 \
   STORAGE_BACKEND=aws \
   AWS_ACCESS_KEY_ID=dummy \
   AWS_SECRET_ACCESS_KEY=dummy \
   AWS_REGION=us-east-1 \
   npm run dev
   ```

**Verify Path Rollups:**
- Complete a course that's part of a path
- Query `lms_progress` table for `user_id` + `SK = "PATH#{path_id}"`
- Verify `completed_courses` and `percent_complete` updated correctly
- Verify `completed_at` set when path becomes completed
- Verify telemetry events in `events` table:
  - `lms_path_progress_updated` (when progress changes)
  - `lms_path_completed` (when path becomes completed)

**Verify Reverse Index:**
- Query `lms_progress` table using `CourseProgressByCourseIndex` GSI:
  ```bash
  aws dynamodb query \
    --table-name lms_progress \
    --index-name CourseProgressByCourseIndex \
    --key-condition-expression "course_id = :courseId" \
    --filter-expression "entity_type = :entityType AND #pathStatus = :pathStatus" \
    --expression-attribute-names '{"#pathStatus": "path_status"}' \
    --expression-attribute-values '{
      ":courseId": {"S": "test_course_phase10_1"},
      ":entityType": {"S": "lms_course_paths"},
      ":pathStatus": {"S": "published"}
    }' \
    --endpoint-url http://localhost:8000 \
    --region us-east-1
  ```
- Should return mapping items with `path_id` for paths containing the course

**Common Issues:**
- **Rollup not updating:** Check course completion status, verify path contains course, check API logs for rollup errors
- **Telemetry events missing:** Verify `STORAGE_BACKEND=aws` is set, check `events` table exists
- **Path status incorrect:** Verify all courses in path are published, check course completion status
- **Duplicate rollup updates:** Should not occur due to idempotent computation (same state = same result)

**Verify Telemetry Events:**
```bash
# Query Phase 10 events from events table
TODAY=$(date +%Y-%m-%d)
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=us-east-1 \
aws dynamodb query \
  --table-name events \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name IN (:listed, :viewed, :started, :progress, :completed)" \
  --expression-attribute-values "{
    \":date\": {\"S\": \"$TODAY\"},
    \":listed\": {\"S\": \"lms_paths_listed\"},
    \":viewed\": {\"S\": \"lms_path_viewed\"},
    \":started\": {\"S\": \"lms_path_started\"},
    \":progress\": {\"S\": \"lms_path_progress_updated\"},
    \":completed\": {\"S\": \"lms_path_completed\"}
  }" \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

**Expected Event Counts (after full smoke test):**
- `lms_paths_listed`: ≥1
- `lms_path_viewed`: ≥2
- `lms_path_started`: 1
- `lms_path_progress_updated`: ≥1 (only on meaningful changes)
- `lms_path_completed`: 1 (only on completion transition)

## Related Documentation

- [API Contract](./api-contract.md) - General API patterns
- [Data Model](./data-model.md) - Overall data model
- [Courses v2](./courses-v2.md) - Legacy courses documentation (superseded by this doc)
- [Deployment](./deployment.md) - Infrastructure deployment guide

