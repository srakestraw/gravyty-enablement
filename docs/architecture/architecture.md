# Enablement Portal - Detailed Architecture Document

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Architecture](#component-architecture)
5. [Data Architecture](#data-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Integration Architecture](#integration-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Monitoring & Observability](#monitoring--observability)
11. [Development Architecture](#development-architecture)
12. [Future Roadmap](#future-roadmap)

---

## Executive Summary

The Gravyty Enablement Portal is a centralized, cloud-native platform designed to provide Account Executives (AEs) and Customer Success Managers (CSMs) with intelligent access to enablement content and an AI-powered assistant. The system is built on AWS serverless infrastructure, leveraging Lambda, API Gateway, DynamoDB, S3, and Cognito for authentication.

**Key Characteristics:**
- **Serverless-First**: Built entirely on AWS serverless services for scalability and cost efficiency
- **Monorepo Structure**: TypeScript monorepo with npm workspaces for shared code
- **Role-Based Access Control**: Four-tier permission system (Viewer, Contributor, Approver, Admin)
- **Multi-Product Support**: Content organized across multiple Gravyty products and concepts
- **AI-Ready**: Architecture prepared for RAG (Retrieval-Augmented Generation) integration

---

## System Overview

### Purpose

The Enablement Portal serves as a single source of truth for enablement materials, enabling users to:
- Discover and access enablement content across multiple products
- Upload and manage content with lifecycle controls
- Search and filter content by product, concept, tags, and metadata
- Access AI-powered assistance for finding relevant information
- Track learning progress and assignments
- Manage certifications and learning paths

### Key Personas

1. **Account Executive (AE)**: Needs quick access to product information and sales materials
2. **Customer Success Manager (CSM)**: Requires detailed documentation and troubleshooting guides
3. **Content Contributor**: Creates and maintains enablement content
4. **Content Approver**: Reviews and approves content for publication
5. **System Administrator**: Manages users, roles, and system configuration

### Core Capabilities

- **Content Management**: CRUD operations for enablement content with file attachments
- **Learning Management System (LMS)**: Courses, lessons, learning paths, assignments, and certificates
- **Metadata Management**: Hierarchical metadata system for content organization
- **User & Role Management**: Admin interface for user lifecycle and role assignment
- **Analytics & Events**: Event tracking and analytics for content usage
- **Notifications**: User notification system for content updates and assignments

---

## High-Level Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   Web App (React)│         │  Mobile (Future) │            │
│  │   AWS Amplify    │         │                  │            │
│  └────────┬─────────┘         └──────────────────┘            │
└───────────┼─────────────────────────────────────────────────────┘
            │ HTTPS
            │ JWT Tokens
┌───────────▼─────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         API Gateway HTTP API (v2)                        │  │
│  │         Routes: /v1/* → Lambda                           │  │
│  │         CORS, Rate Limiting                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    Application Layer                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Lambda Function (Node.js 20.x)                   │  │
│  │         Express.js Application                           │  │
│  │         - JWT Authentication                             │  │
│  │         - RBAC Middleware                               │  │
│  │         - Request Routing                                │  │
│  │         - Error Handling                                │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│   DynamoDB   │ │     S3      │ │  Cognito   │
│   Tables     │ │   Buckets   │ │ User Pool  │
└──────────────┘ └─────────────┘ └────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite 5.0
- **UI Library**: Material-UI (MUI) 5.15
- **State Management**: React Context API + Hooks
- **Routing**: React Router DOM 6.21
- **Authentication**: AWS Amplify Auth SDK
- **Design System**: Custom Gravyty Design System package

#### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **Lambda Adapter**: @vendia/serverless-express
- **Validation**: Zod 3.22
- **AWS SDK**: AWS SDK v3 (modular)

#### Infrastructure
- **IaC**: AWS CDK (TypeScript)
- **Compute**: AWS Lambda
- **API Gateway**: API Gateway HTTP API (v2)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **Authentication**: Amazon Cognito User Pool
- **Identity Provider**: Google OAuth 2.0
- **Hosting**: AWS Amplify (web app)

#### Development Tools
- **Package Manager**: npm with workspaces
- **Monorepo**: npm workspaces
- **Type Checking**: TypeScript
- **Linting**: ESLint
- **Build**: TypeScript compiler

---

## Component Architecture

### Monorepo Structure

```
enablement/
├── apps/
│   ├── api/              # Express API server (Lambda-ready)
│   └── web/              # React web application
├── packages/
│   ├── design-system/    # Shared MUI theme and components
│   ├── domain/           # Shared domain models and validators
│   └── jobs/             # Background job functions
└── infra/                # CDK infrastructure code
```

### API Application (`apps/api`)

#### Structure
```
apps/api/src/
├── server.ts              # Express app setup
├── lambda.ts              # Lambda handler wrapper
├── middleware/            # Express middleware
│   ├── jwtAuth.ts         # JWT verification
│   ├── rbac.ts            # Role-based access control
│   ├── rateLimit.ts       # Rate limiting
│   ├── requestId.ts       # Request ID generation
│   └── errorHandler.ts    # Error handling
├── routes/                # Route definitions
│   ├── lms.ts             # LMS endpoints
│   ├── lmsAdmin.ts        # LMS admin endpoints
│   ├── adminUsers.ts      # User management
│   └── metadata.ts       # Metadata endpoints
├── handlers/              # Request handlers
│   ├── lms.ts
│   ├── lmsAdmin.ts
│   ├── adminUsers.ts
│   ├── metadata.ts
│   ├── analytics.ts
│   └── events.ts
├── storage/               # Storage abstraction layer
│   ├── factory.ts         # Storage factory
│   ├── dynamo/            # DynamoDB repositories
│   └── stub/              # In-memory stubs (dev)
├── aws/                   # AWS client wrappers
│   ├── dynamoClient.ts
│   ├── s3Client.ts
│   ├── cognitoClient.ts
│   └── transcribeClient.ts
└── types.ts               # Shared types
```

#### Key Components

**1. Express Server (`server.ts`)**
- Configures Express application
- Sets up middleware pipeline
- Registers route handlers
- Exports app for Lambda wrapper

**2. Lambda Handler (`lambda.ts`)**
- Wraps Express app with `serverless-express`
- Handles API Gateway event format
- Manages Lambda context

**3. Middleware Pipeline**
```
Request → CORS → JSON Parser → Request ID → Rate Limit → JWT Auth → Routes → Error Handler → Response
```

**4. Storage Abstraction**
- Factory pattern for storage backends
- Supports DynamoDB (production) and in-memory stubs (development)
- Repository pattern for data access

### Web Application (`apps/web`)

#### Structure
```
apps/web/src/
├── main.tsx               # Application entry point
├── App.tsx               # Root component
├── pages/                # Page components
│   ├── HomePage.tsx
│   ├── learn/            # Learning pages
│   ├── admin/            # Admin pages
│   └── ai/               # AI assistant pages
├── components/           # Reusable components
│   ├── shell/            # App shell (header, nav)
│   ├── admin/            # Admin components
│   ├── learning/         # Learning components
│   └── metadata/         # Metadata components
├── contexts/             # React contexts
│   ├── AuthContext.tsx
│   └── ShellLayoutContext.tsx
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── apiClient.ts      # API client
│   ├── auth.ts           # Auth utilities
│   └── roles.ts          # Role utilities
├── theme/                # MUI theme configuration
└── types/                # TypeScript types
```

#### Key Components

**1. Authentication Context (`AuthContext.tsx`)**
- Manages authentication state
- Handles Cognito sign-in/sign-out
- Provides auth state to components

**2. API Client (`lib/apiClient.ts`)**
- Centralized HTTP client
- Handles JWT token injection
- Error handling and retries

**3. App Shell (`components/shell/`)**
- Header with user menu
- Side navigation
- Page layout wrapper

### Domain Package (`packages/domain`)

#### Purpose
Shared domain models, validators, and business logic used by both API and web app.

#### Structure
```
packages/domain/src/
├── index.ts              # Public exports
├── types.ts              # Base types
├── metadata.ts           # Metadata models
├── lms/                  # LMS domain models
│   ├── course.ts
│   ├── lesson.ts
│   ├── path.ts
│   ├── assignment.ts
│   ├── progress.ts
│   ├── certificates.ts
│   └── media.ts
└── metadata-normalization.ts
```

#### Key Features
- **Zod Schemas**: Type-safe validation schemas
- **TypeScript Types**: Shared type definitions
- **Business Logic**: Domain-specific utilities

### Design System Package (`packages/design-system`)

#### Purpose
Centralized MUI theme and design tokens from Figma.

#### Structure
```
packages/design-system/src/
├── index.ts              # Public exports
├── theme.ts              # MUI theme configuration
├── components.ts         # Component exports
└── tokens/               # Design tokens
    ├── figma.tokens.json # Figma design tokens
    └── mapTokensToTheme.ts
```

### Infrastructure (`infra/`)

#### CDK Stack Structure
```
infra/lib/
├── enablement-portal-stack.ts  # Main stack
├── base-stack.ts               # Base resources
├── api-stack.ts                # API resources
├── cognito-auto-assign-viewer.ts
└── cognito-email-domain-validator.ts
```

#### Infrastructure Components

**1. DynamoDB Tables**
- `events`: Event tracking
- `lms_courses`: Course metadata
- `lms_lessons`: Lesson content
- `lms_paths`: Learning paths
- `lms_progress`: User progress tracking
- `lms_assignments`: Course assignments
- `lms_certificates`: Certificate records
- `lms_transcripts`: Video transcripts
- `metadata`: Metadata hierarchy

**2. S3 Buckets**
- `enablement-content`: Content files (PDFs, videos, images)
- `lms-media`: LMS media assets

**3. Cognito Resources**
- User Pool: `enablement-portal-users`
- User Pool Client: Web application client
- User Pool Domain: Hosted UI domain
- Identity Provider: Google OAuth
- Lambda Triggers: Email domain validation, auto-assign Viewer group

**4. Lambda Function**
- Runtime: Node.js 20.x
- Handler: `lambda.handler`
- Code: Bundled from `apps/api/dist-lambda`
- Environment Variables: DynamoDB table names, S3 bucket names, Cognito IDs

**5. API Gateway**
- Type: HTTP API (v2)
- Routes: `/v1/*` → Lambda function
- CORS: Configurable via `WEB_ALLOWED_ORIGINS`

---

## Data Architecture

### DynamoDB Design Principles

1. **Single Table Design**: Where possible, use single table with GSIs
2. **Access Pattern First**: Design keys based on query patterns
3. **GSI for Queries**: Use GSIs for alternative access patterns
4. **Composite Keys**: Use composite sort keys for hierarchical queries

### Table Schemas

#### Events Table (`events`)

**Purpose**: Store activity events for analytics

**Primary Key**:
- **PK**: `date_bucket` (String, format: `YYYY-MM-DD`)
- **SK**: `ts#event_id` (String, format: `{ISO8601}#{event_id}`)

**Attributes**:
- `event_id` (String)
- `event_name` (String)
- `user_id` (String, optional)
- `content_id` (String, optional)
- `metadata` (Map, optional)
- `timestamp` (String, ISO8601)
- `ttl` (Number, optional): For automatic cleanup

**Access Patterns**:
- Query events by date: Query PK with `date_bucket = YYYY-MM-DD`
- Events are append-only (no updates/deletes)

#### LMS Courses Table (`lms_courses`)

**Purpose**: Store course metadata

**Primary Key**:
- **PK**: `course_id` (String)

**GSI**: `PublishedCatalogIndex`
- **GSI PK**: `status` (String)
- **GSI SK**: `published_at` (String)

**Attributes**:
- `course_id`, `title`, `description`, `status`
- `product_suite`, `product_concept`, `tags`
- `created_at`, `updated_at`, `published_at`
- `owner_user_id`, `version`
- `estimated_duration_minutes`, `difficulty_level`
- `thumbnail_s3_bucket`, `thumbnail_s3_key`

**Access Patterns**:
- Get course by ID: GetItem on PK
- List published courses: Query GSI with `status = Published`, sorted by `published_at DESC`

#### LMS Lessons Table (`lms_lessons`)

**Purpose**: Store lesson content and metadata

**Primary Key**:
- **PK**: `course_id` (String)
- **SK**: `lesson_id` (String)

**Attributes**:
- `lesson_id`, `course_id`, `title`, `description`
- `lesson_type` (video, text, quiz, etc.)
- `order_index` (Number)
- `duration_seconds` (Number)
- `video_s3_bucket`, `video_s3_key` (for video lessons)
- `transcript_s3_bucket`, `transcript_s3_key`
- `content` (Map, for text/quiz lessons)

**Access Patterns**:
- Get lessons for course: Query PK with `course_id = X`, sorted by `order_index`
- Get specific lesson: GetItem on PK + SK

#### LMS Paths Table (`lms_paths`)

**Purpose**: Store learning path definitions

**Primary Key**:
- **PK**: `path_id` (String)

**Attributes**:
- `path_id`, `title`, `description`, `status`
- `course_ids` (List<String>)
- `estimated_duration_minutes`
- `created_at`, `updated_at`, `published_at`

**Access Patterns**:
- Get path by ID: GetItem on PK
- List all paths: Scan (consider GSI if needed)

#### LMS Progress Table (`lms_progress`)

**Purpose**: Track user progress through courses and lessons

**Primary Key**:
- **PK**: `user_id` (String)
- **SK**: `course_id#lesson_id` (String)

**Attributes**:
- `user_id`, `course_id`, `lesson_id`
- `status` (not_started, in_progress, completed)
- `progress_percentage` (Number)
- `last_accessed_at` (String, ISO8601)
- `completed_at` (String, ISO8601, optional)

**Access Patterns**:
- Get user progress for course: Query PK with `user_id = X`, filter by `course_id`
- Get specific lesson progress: GetItem on PK + SK

#### LMS Assignments Table (`lms_assignments`)

**Purpose**: Store course assignments to users

**Primary Key**:
- **PK**: `user_id` (String)
- **SK**: `assignment_id` (String)

**GSI**: `ByCourseIndex`
- **GSI PK**: `course_id` (String)
- **GSI SK**: `assigned_at` (String)

**Attributes**:
- `assignment_id`, `user_id`, `course_id`
- `assigned_by_user_id`, `assigned_at`
- `due_date` (String, ISO8601, optional)
- `status` (assigned, in_progress, completed, overdue)

**Access Patterns**:
- Get user assignments: Query PK with `user_id = X`
- Get assignments for course: Query GSI with `course_id = X`

#### LMS Certificates Table (`lms_certificates`)

**Purpose**: Store certificate records

**Primary Key**:
- **PK**: `certificate_id` (String)

**GSI**: `ByUserIndex`
- **GSI PK**: `user_id` (String)
- **GSI SK**: `issued_at` (String)

**Attributes**:
- `certificate_id`, `user_id`, `course_id`
- `template_id`, `issued_at`
- `certificate_s3_bucket`, `certificate_s3_key`
- `verification_code` (String)

**Access Patterns**:
- Get certificate by ID: GetItem on PK
- Get user certificates: Query GSI with `user_id = X`

#### Metadata Table (`metadata`)

**Purpose**: Store hierarchical metadata structure

**Primary Key**:
- **PK**: `option_id` (String)

**GSI**: `GroupKeyIndex`
- **GSI PK**: `group_key` (String)
- **GSI SK**: `sort_order_label` (String)

**Attributes**:
- `option_id`, `group_key`, `label`, `slug` (product, product_suite, topic_tag, badge)
- `parent_id` (String, optional)
- `sort_order` (Number)
- `color` (String, optional)
- `archived_at` (String, optional)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Access Patterns**:
- Get metadata option by ID: GetItem on PK
- Get options by group: Query GSI with `group_key = X`, sorted by `sort_order_label`

### S3 Bucket Structure

#### Content Bucket (`enablement-content`)

```
content/
  {content_id}/
    source/
      {filename}           # Original uploaded file
```

#### LMS Media Bucket (`lms-media`)

```
media/
  {media_id}/
    source/
      {filename}           # Original media file
  courses/
    {course_id}/
      thumbnail.{ext}      # Course thumbnail
  lessons/
    {lesson_id}/
      video.{ext}          # Lesson video
      transcript.json      # Video transcript
```

### Data Flow Patterns

#### Content Upload Flow
1. Client requests presigned upload URL from API
2. API generates presigned PUT URL for S3
3. Client uploads file directly to S3
4. Client calls API to attach file metadata to content item
5. API updates DynamoDB with file metadata

#### Content Download Flow
1. Client requests download URL from API
2. API verifies user permissions (RBAC)
3. API generates presigned GET URL for S3
4. Client downloads file directly from S3

#### Course Progress Tracking
1. User accesses lesson
2. Frontend sends progress event to API
3. API updates `lms_progress` table
4. API calculates course completion percentage
5. If course completed, trigger certificate generation (future)

---

## Security Architecture

### Authentication

#### Cognito User Pool
- **User Pool Name**: `enablement-portal-users`
- **Sign-In Method**: Google OAuth 2.0 (federated identity)
- **Email Domain Restriction**: `@gravyty.com` only (enforced via Lambda trigger)
- **Auto-Assignment**: New users automatically assigned to `Viewer` group

#### Google Identity Provider
- **Provider Type**: Google OAuth 2.0
- **Credentials**: Stored in SSM Parameter Store
  - `/enablement-portal/google/client-id`
  - `/enablement-portal/google/client-secret`
- **Attribute Mapping**:
  - `email` → Cognito email attribute
  - `name` → Cognito name attribute

#### JWT Token Flow
1. User authenticates via Google OAuth
2. Cognito issues ID token, access token, refresh token
3. Web app stores tokens in memory (not localStorage)
4. API requests include ID token in `Authorization: Bearer <token>` header
5. API middleware validates JWT signature, expiration, issuer, audience
6. User context extracted from JWT claims

### Authorization

#### Role-Based Access Control (RBAC)

**Role Hierarchy**:
1. **Viewer** (lowest precedence)
   - Read-only access to published content
   - Can view courses and lessons
   - Can download approved content files

2. **Contributor** (precedence: 2)
   - All Viewer permissions
   - Can create and edit content
   - Can upload files to draft content
   - Can attach files to own content

3. **Approver** (precedence: 3)
   - All Contributor permissions
   - Can approve, deprecate, and expire content
   - Can publish courses

4. **Admin** (highest precedence)
   - All Approver permissions
   - Can access all content regardless of status
   - Can attach files to any content
   - Can manage users and roles
   - Can access admin analytics

#### Cognito Groups
- Groups: `Viewer`, `Contributor`, `Approver`, `Admin`
- Role extracted from `cognito:groups` claim in JWT
- Precedence: Admin > Approver > Contributor > Viewer
- Default: Viewer if no groups assigned

#### Permission Enforcement
- **API Middleware**: `requireRole()` middleware checks role before route handler
- **Route-Level**: Routes specify required role (e.g., `requireRole('Admin')`)
- **Resource-Level**: Handlers check permissions for specific resources
- **File Access**: S3 presigned URLs generated only after permission check

### IAM Permissions

#### Lambda Execution Role
- **DynamoDB**: Read/write on all tables (explicitly denied: Scan on `content_registry`)
- **S3**: Read/write on `content/*` and `media/*` prefixes only
- **CloudWatch Logs**: Write permissions
- **SSM**: Read permissions for Google OAuth credentials
- **Cognito**: Read user attributes and groups

#### Least Privilege Principle
- Lambda role scoped to specific table names and S3 prefixes
- No wildcard permissions
- Explicit deny for Scan operations on large tables

### Data Security

#### Encryption
- **DynamoDB**: AWS-managed encryption at rest
- **S3**: AWS-managed encryption at rest (SSE-S3)
- **In Transit**: HTTPS/TLS for all API and S3 communication

#### Data Isolation
- User data isolated by `user_id` partition key
- Content access controlled by status and role
- S3 objects scoped to content/media IDs

### Security Best Practices

1. **No PII Storage**: System designed to avoid storing personally identifiable information
2. **Token Storage**: JWT tokens stored in memory, not localStorage (prevents XSS)
3. **HTTPS Required**: All OAuth redirects use HTTPS in production
4. **CORS**: Configured at API Gateway level with specific allowed origins
5. **Rate Limiting**: Applied at API level to prevent abuse
6. **Input Validation**: Zod schemas validate all API inputs
7. **Error Handling**: Generic error messages prevent information leakage

---

## Deployment Architecture

### Deployment Model

#### API Deployment
- **Platform**: AWS Lambda + API Gateway HTTP API
- **Build**: TypeScript compilation → Lambda bundle
- **Deployment**: CDK stack deployment
- **CI/CD**: Manual (future: GitHub Actions / Amplify)

#### Web App Deployment
- **Platform**: AWS Amplify (planned)
- **Build**: Vite production build
- **Deployment**: Amplify console or CLI
- **CDN**: CloudFront (via Amplify)

### Build Process

#### API Build
```bash
# 1. Build domain package
npm run build --workspace=packages/domain

# 2. Compile TypeScript
npm run build --workspace=apps/api

# 3. Bundle for Lambda
npm run build:api:lambda
# Creates apps/api/dist-lambda with:
# - Compiled JavaScript
# - package.json with production dependencies only
```

#### Web Build
```bash
# Build web app
npm run build --workspace=apps/web
# Creates apps/web/dist with:
# - Optimized JavaScript bundles
# - Static assets
# - index.html
```

### Infrastructure Deployment

#### CDK Deployment
```bash
# 1. Bootstrap CDK (first time only)
npm run cdk:bootstrap

# 2. Deploy stack
npm run cdk:deploy
# Or: cd infra && npm run deploy
```

#### Environment Configuration
- **CORS Origins**: Set via `WEB_ALLOWED_ORIGINS` environment variable
- **Table Names**: Defined in CDK stack
- **Bucket Names**: Generated by CDK with unique suffix

### Environment Variables

#### Lambda Environment Variables
```bash
AWS_REGION=us-east-1
STORAGE_BACKEND=aws
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
DDB_TABLE_LMS_COURSES=lms_courses
DDB_TABLE_LMS_LESSONS=lms_lessons
DDB_TABLE_LMS_PATHS=lms_paths
DDB_TABLE_LMS_PROGRESS=lms_progress
DDB_TABLE_LMS_ASSIGNMENTS=lms_assignments
DDB_TABLE_LMS_CERTIFICATES=lms_certificates
DDB_TABLE_LMS_TRANSCRIPTS=lms_transcripts
METADATA_TABLE=metadata
ENABLEMENT_CONTENT_BUCKET=<bucket-name>
LMS_MEDIA_BUCKET=<bucket-name>
PRESIGNED_UPLOAD_EXPIRY_SECONDS=300
PRESIGNED_DOWNLOAD_EXPIRY_SECONDS=3600
COGNITO_USER_POOL_ID=<user-pool-id>
COGNITO_USER_POOL_CLIENT_ID=<client-id>
```

#### Web App Environment Variables
```bash
VITE_API_BASE_URL=https://<api-gateway-url>
VITE_COGNITO_USER_POOL_ID=<user-pool-id>
VITE_COGNITO_USER_POOL_CLIENT_ID=<client-id>
VITE_COGNITO_USER_POOL_DOMAIN=<cognito-domain>
```

### Deployment Steps

1. **Build API for Lambda**
   ```bash
   ./infra/scripts/build-api-for-lambda.sh
   ```

2. **Deploy Infrastructure**
   ```bash
   export WEB_ALLOWED_ORIGINS="https://main.xxxxx.amplifyapp.com"
   npm run cdk:deploy
   ```

3. **Get API URL**
   ```bash
   ./infra/scripts/get-api-url.sh
   ```

4. **Configure Web App**
   - Set `VITE_API_BASE_URL` in Amplify environment variables
   - Set Cognito environment variables

5. **Deploy Web App**
   - Push to Git branch connected to Amplify
   - Or use Amplify CLI: `amplify publish`

### Rollback Strategy

- **API**: CDK supports rollback via CloudFormation
- **Web App**: Amplify supports automatic rollback on build failure
- **Database**: DynamoDB tables have `RemovalPolicy.RETAIN` to prevent accidental deletion

---

## Integration Architecture

### External Services

#### Google OAuth
- **Purpose**: User authentication
- **Integration**: Cognito Identity Provider
- **Flow**: OAuth 2.0 Authorization Code Grant
- **Credentials**: Stored in SSM Parameter Store

#### AWS Services

**Cognito**
- User Pool for identity management
- User Pool Client for web app
- User Pool Domain for hosted UI
- Lambda triggers for custom logic

**DynamoDB**
- Primary data store for all metadata
- Point-in-time recovery enabled
- Auto-scaling via PAY_PER_REQUEST billing

**S3**
- Object storage for files and media
- Versioning enabled
- CORS configured for web app access
- Presigned URLs for secure access

**API Gateway**
- HTTP API (v2) for REST endpoints
- CORS configuration
- Lambda integration

**Lambda**
- Serverless compute for API
- Event-driven triggers (Cognito, EventBridge)

**SSM Parameter Store**
- Secure storage for Google OAuth credentials
- Lambda reads credentials at runtime

### Future Integrations

#### OpenAI API (Planned)
- **Purpose**: RAG (Retrieval-Augmented Generation) for AI assistant
- **Integration**: Lambda function calls OpenAI API
- **Use Cases**: Document embeddings, chat responses

#### Amazon OpenSearch (Planned)
- **Purpose**: Vector store for semantic search
- **Integration**: Lambda functions index and query OpenSearch
- **Use Cases**: Content search, RAG retrieval

#### Amazon EventBridge (Planned)
- **Purpose**: Event-driven architecture
- **Integration**: Lambda functions publish events
- **Use Cases**: Content lifecycle events, notifications

#### Amazon SES (Planned)
- **Purpose**: Email notifications
- **Integration**: Lambda functions send emails via SES
- **Use Cases**: User invitations, content notifications

#### AWS Transcribe (Partial)
- **Purpose**: Video transcription
- **Integration**: Lambda functions call Transcribe API
- **Status**: Client configured, integration pending

---

## Scalability & Performance

### Scalability

#### Serverless Architecture
- **Lambda**: Auto-scales based on concurrent requests (up to account limit)
- **API Gateway**: Handles millions of requests
- **DynamoDB**: PAY_PER_REQUEST scales automatically
- **S3**: Unlimited scale

#### DynamoDB Scaling
- **On-Demand Billing**: No capacity planning required
- **Partition Key Design**: Ensures even distribution
- **GSI Scaling**: GSIs scale independently
- **Throttling**: DynamoDB handles throttling automatically

#### S3 Scaling
- **Unlimited Storage**: No capacity limits
- **Request Rate**: Handles high request rates
- **CDN**: CloudFront (via Amplify) caches static assets

### Performance

#### API Performance
- **Cold Start**: First request may take 1-3 seconds
- **Warm Requests**: Subsequent requests <100ms
- **Provisioned Concurrency**: Can be enabled for production (costs extra)

#### Database Performance
- **Single-Digit Latency**: DynamoDB queries typically <10ms
- **Consistent Performance**: Predictable performance at scale
- **Query Optimization**: GSIs enable efficient queries

#### Caching Strategy
- **API Gateway**: No caching currently (can add response caching)
- **S3**: CloudFront CDN caches static assets
- **Frontend**: Browser caching for static assets

### Cost Optimization

#### Serverless Cost Model
- **Lambda**: Pay per request + compute time
- **API Gateway**: Pay per request
- **DynamoDB**: Pay per read/write unit
- **S3**: Pay per storage + request

#### Cost Estimates (Low Traffic)
- **10K requests/month**: ~$0.01
- **100K requests/month**: ~$0.10
- **1M requests/month**: ~$1.20

#### Optimization Strategies
- **Lambda**: Right-size memory allocation
- **DynamoDB**: Use on-demand billing for variable workloads
- **S3**: Lifecycle policies for old content (future)
- **CloudFront**: Cache static assets to reduce origin requests

---

## Monitoring & Observability

### Logging

#### CloudWatch Logs
- **Lambda Logs**: Automatically sent to CloudWatch
- **Log Group**: `/aws/lambda/<function-name>`
- **Log Retention**: 30 days (default, configurable)

#### Application Logging
- **Request ID**: Every request has unique ID for tracing
- **Structured Logging**: JSON format for easy parsing
- **Error Logging**: Errors logged with stack traces

### Metrics

#### API Gateway Metrics
- Request count
- Latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Available in CloudWatch

#### Lambda Metrics
- Invocations
- Duration
- Errors
- Throttles
- Available in CloudWatch

#### DynamoDB Metrics
- Read/write capacity units
- Throttled requests
- Available in CloudWatch

### Tracing

#### Request Tracing
- **Request ID**: Generated for every request
- **Propagation**: Request ID included in responses
- **Correlation**: Request ID used to correlate logs

#### Future: AWS X-Ray
- Can be enabled for distributed tracing
- Provides end-to-end request tracing
- Helps identify performance bottlenecks

### Alerts

#### CloudWatch Alarms (Future)
- High error rate
- High latency
- Lambda throttles
- DynamoDB throttles

### Health Checks

#### API Health Endpoint
- **Endpoint**: `GET /health`
- **Response**: `{ status: 'ok', timestamp: '...' }`
- **Use Case**: Load balancer health checks, monitoring

---

## Development Architecture

### Local Development

#### Development Setup
1. **Prerequisites**: Node.js 20+, npm, AWS CLI configured
2. **Install Dependencies**: `npm install`
3. **Start API**: `npm run dev:api` (runs on port 4000)
4. **Start Web**: `npm run dev:web` (runs on port 5173)

#### Development Mode Features
- **Hot Reload**: Both API and web app support hot reload
- **Dev Headers**: API accepts `x-dev-role` and `x-dev-user-id` headers
- **Stub Storage**: API can use in-memory storage instead of DynamoDB
- **CORS**: CORS enabled for localhost origins

#### Environment Variables
- **API**: `.env` file in `apps/api/`
- **Web**: `.env.local` file in `apps/web/`
- **Infrastructure**: Set via `process.env` before CDK deploy

#### Environment Isolation
**Current Setup**: Development and production environments share the same DynamoDB tables and S3 buckets. This is intentional for early-stage development to simplify setup and reduce infrastructure costs.

**Shared Resources**:
- **LMS Tables**: `lms_courses`, `lms_lessons`, `lms_paths`, `lms_progress`, `lms_assignments`, `lms_certificates`, `lms_transcripts`
- **Metadata Table**: `metadata`
- **Content Tables**: `content_registry`, `notifications`, `subscriptions`, `events`
- **S3 Buckets**: `enablement-content`, `lms-media`

**Implications**:
- Courses created locally (with `STORAGE_BACKEND=aws`) will appear in production
- Metadata options created/updated locally will appear in production
- Data created in production will be visible in local development
- Exercise caution when testing destructive operations locally

**Future: Separate Dev Environment**
To create a separate dev environment later:
1. Deploy a separate CDK stack with environment-specific table names (e.g., `lms_courses_dev`, `taxonomy_dev`)
2. Set environment variables in `apps/api/.env` to point to dev tables:
   ```
   LMS_COURSES_TABLE=lms_courses_dev
   LMS_LESSONS_TABLE=lms_lessons_dev
   METADATA_TABLE=metadata_dev
   DDB_TABLE_CONTENT=content_registry_dev
   # ... etc
   ```
3. Use separate AWS profiles or accounts for complete isolation

### Code Organization

#### Monorepo Benefits
- **Shared Code**: Domain models and design system shared
- **Type Safety**: TypeScript types shared across packages
- **Consistent Versions**: Single source of truth for dependencies
- **Atomic Changes**: Can update API and web app together

#### Package Dependencies
```
apps/api → packages/domain
apps/web → packages/domain, packages/design-system
packages/jobs → packages/domain
```

### Testing Strategy

#### Current State
- **Unit Tests**: Some domain package tests
- **Integration Tests**: Manual testing via scripts
- **E2E Tests**: Not yet implemented

#### Future Testing
- **Unit Tests**: Jest for domain logic
- **Integration Tests**: Test API endpoints with DynamoDB Local
- **E2E Tests**: Playwright or Cypress for web app

### Code Quality

#### TypeScript
- **Strict Mode**: Enabled in all packages
- **Type Checking**: `npm run typecheck` validates all packages
- **Shared Config**: `tsconfig.base.json` for shared settings

#### Linting
- **ESLint**: Configured for web app
- **Type Checking**: TypeScript compiler checks types

### Git Workflow

#### Branch Strategy
- **Main Branch**: Production-ready code
- **Feature Branches**: New features and fixes
- **CDK Deploy**: Deploy from main branch

#### Commit Conventions
- Conventional commits (recommended)
- Clear commit messages

---

## Future Roadmap

### Phase 1: Foundation ✅
- [x] Monorepo structure
- [x] Design system package
- [x] Domain package
- [x] Web app shell
- [x] API skeleton
- [x] DynamoDB persistence
- [x] S3 file storage
- [x] Cognito authentication

### Phase 2: LMS Core ✅
- [x] Course management
- [x] Lesson management
- [x] Learning paths
- [x] Progress tracking
- [x] Assignments
- [x] Certificates
- [x] Metadata system

### Phase 3: AI & Search (In Progress)
- [ ] OpenAI integration for RAG
- [ ] OpenSearch vector store
- [ ] Document embedding pipeline
- [ ] AI assistant with citations
- [ ] Semantic search

### Phase 4: Analytics & Events
- [ ] EventBridge integration
- [ ] Analytics dashboard
- [ ] Content usage metrics
- [ ] User engagement tracking

### Phase 5: Notifications
- [ ] SES email integration
- [ ] In-app notifications
- [ ] Content update notifications
- [ ] Assignment notifications

### Phase 6: Advanced Features
- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Advanced search filters
- [ ] Content recommendations
- [ ] Social features (comments, likes)

### Phase 7: Enterprise Features
- [ ] Multi-tenancy support
- [ ] SSO integration (beyond Google)
- [ ] Advanced RBAC (custom roles)
- [ ] Audit logging
- [ ] Compliance features

---

## Appendix

### Acronyms

- **AE**: Account Executive
- **CSM**: Customer Success Manager
- **RBAC**: Role-Based Access Control
- **RAG**: Retrieval-Augmented Generation
- **LMS**: Learning Management System
- **GSI**: Global Secondary Index
- **PK**: Partition Key
- **SK**: Sort Key
- **JWT**: JSON Web Token
- **OAuth**: Open Authorization
- **IdP**: Identity Provider
- **SSO**: Single Sign-On
- **CDK**: Cloud Development Kit
- **IaC**: Infrastructure as Code
- **CORS**: Cross-Origin Resource Sharing
- **PII**: Personally Identifiable Information
- **XSS**: Cross-Site Scripting

### Related Documentation

- [Product Requirements Document](../prd/enablement-portal-prd.md)
- [AWS Architecture](./aws-architecture.md)
- [Data Model](./data-model.md)
- [API Contract](./api-contract.md)
- [Authentication Architecture](./auth.md)
- [Deployment Architecture](./deployment.md)
- [LMS Architecture](./lms-v2.md)
- [RAG Architecture](./rag.md)

### Contact & Support

For questions or issues:
- **Architecture Questions**: See related architecture documents
- **Development Issues**: Check runbooks in `docs/runbooks/`
- **Infrastructure Issues**: See CDK documentation in `infra/docs/`

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Enablement Portal Team

