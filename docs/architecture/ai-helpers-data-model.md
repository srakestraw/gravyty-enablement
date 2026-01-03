# AI Helpers (Prompt Helpers) Data Model

## Overview

AI Helpers (also called Prompt Helpers) are reusable prompt templates that compose AI prompts for various contexts in the enablement portal. They support versioning, audit logging, and provider-specific overrides.

## Core Entities

### 1. PromptHelper

The main entity representing a reusable prompt template.

**Table**: `prompt_helpers`  
**Partition Key**: `helper_id` (UUID)  
**GSI**: `StatusIndex` (PK: `status`, SK: `status#updated_at`)

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `helper_id` | UUID | ✅ | Unique identifier |
| `name` | String (1-200 chars) | ✅ | Display name |
| `description` | String (1-500 chars) | ✅ | Description |
| `applies_to` | Array<AppliesTo> | ✅ | Contexts where helper can be used |
| `composition_mode` | Enum | ✅ | How prompts are composed |
| `prefix_text` | String | ❌ | Text prepended to prompt |
| `template_text` | String | ❌ | Main template text |
| `suffix_text` | String | ❌ | Text appended to prompt |
| `negative_text` | String | ❌ | Negative prompt (what to avoid) |
| `rte_action_instructions` | Object | ❌ | Per-action instructions for RTE |
| `provider_overrides` | Object | ❌ | Provider-specific additions |
| `allowed_variables` | Array<String> | ❌ | Variables allowed in template |
| `status` | Enum | ✅ | `draft`, `published`, or `archived` |
| `is_default_for` | Array<Context> | ❌ | Contexts where this is default |
| `is_system` | Boolean | ❌ | System/starter library flag |
| `created_at` | ISO String | ✅ | Creation timestamp |
| `created_by` | UUID | ✅ | Creator user ID |
| `updated_at` | ISO String | ✅ | Last update timestamp |
| `updated_by` | UUID | ✅ | Last updater user ID |

#### Enums

**AppliesTo** (`applies_to`):
- `cover_image` - For generating cover images
- `description` - For generating descriptions
- `rte` - For Rich Text Editor actions

**CompositionMode** (`composition_mode`):
- `template` - Uses template_text with variable substitution
- `style_pack` - Uses prefix/suffix for style guidance
- `hybrid` - Combines template and style pack

**Status** (`status`):
- `draft` - Work in progress, can be edited
- `published` - Live and immutable (creates version snapshot)
- `archived` - Retired, no longer used

**Context** (`is_default_for`):
- `cover_image` - Default for cover image generation
- `description` - Default for description generation
- `rte_shorten` - Default for RTE shorten action
- `rte_expand` - Default for RTE expand action
- `rte_rewrite` - Default for RTE rewrite action
- `rte_tone_shift` - Default for RTE tone shift action
- `rte_summarize` - Default for RTE summarize action

#### Example

```json
{
  "helper_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Professional Description Writer",
  "description": "Creates professional product descriptions",
  "applies_to": ["description"],
  "composition_mode": "template",
  "template_text": "Write a professional description for: {{product_name}}",
  "prefix_text": "You are an expert copywriter.",
  "suffix_text": "Keep it under 200 words.",
  "allowed_variables": ["product_name", "target_audience"],
  "status": "published",
  "is_default_for": ["description"],
  "is_system": false,
  "created_at": "2024-01-01T00:00:00Z",
  "created_by": "user-123",
  "updated_at": "2024-01-01T00:00:00Z",
  "updated_by": "user-123"
}
```

### 2. PromptHelperVersion

Immutable snapshot of a published helper.

**Table**: `prompt_helper_versions`  
**Partition Key**: `helper_id` (UUID)  
**Sort Key**: `version_number` (Number)

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `helper_id` | UUID | ✅ | Reference to PromptHelper |
| `version_number` | Integer | ✅ | Sequential version number (1, 2, 3...) |
| `snapshot_json` | String (JSON) | ✅ | Full PromptHelper JSON at publish time |
| `published_at` | ISO String | ✅ | Publication timestamp |
| `published_by` | UUID | ✅ | Publisher user ID |

#### Lifecycle

- Created automatically when a helper is published
- Version number increments sequentially (1, 2, 3...)
- Snapshot preserves the exact state at publish time
- Used for audit trail and rollback capability

#### Example

```json
{
  "helper_id": "550e8400-e29b-41d4-a716-446655440000",
  "version_number": 2,
  "snapshot_json": "{\"helper_id\":\"...\",\"name\":\"...\",...}",
  "published_at": "2024-01-15T00:00:00Z",
  "published_by": "user-123"
}
```

### 3. PromptHelperAuditLog

Audit trail of all actions performed on helpers.

**Table**: `prompt_helper_audit_log`  
**Partition Key**: `helper_id` (UUID)  
**Sort Key**: `timestamp#action_id` (String)

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `helper_id` | UUID | ✅ | Reference to PromptHelper |
| `timestamp` | ISO String | ✅ | Action timestamp |
| `action_id` | UUID | ✅ | Unique action identifier |
| `action` | Enum | ✅ | Type of action performed |
| `actor_id` | UUID | ✅ | User who performed action |
| `diff_summary_json` | String (JSON) | ❌ | Summary of changes (for updates) |

#### Actions

- `create` - Helper created
- `update` - Helper updated (draft only)
- `publish` - Helper published (creates version)
- `archive` - Helper archived
- `set_default` - Set as default for context(s)
- `unset_default` - Removed as default for context(s)
- `duplicate` - Helper duplicated

#### Example

```json
{
  "helper_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T00:00:00Z",
  "action_id": "action-123",
  "action": "publish",
  "actor_id": "user-123",
  "diff_summary_json": "{\"version_number\":2}"
}
```

## DynamoDB Schema

### prompt_helpers

```typescript
{
  TableName: 'prompt_helpers',
  KeySchema: [
    { AttributeName: 'helper_id', KeyType: 'HASH' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'StatusIndex',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'status#updated_at', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ],
  BillingMode: 'PAY_PER_REQUEST'
}
```

### prompt_helper_versions

```typescript
{
  TableName: 'prompt_helper_versions',
  KeySchema: [
    { AttributeName: 'helper_id', KeyType: 'HASH' },
    { AttributeName: 'version_number', KeyType: 'RANGE' }
  ],
  BillingMode: 'PAY_PER_REQUEST'
}
```

### prompt_helper_audit_log

```typescript
{
  TableName: 'prompt_helper_audit_log',
  KeySchema: [
    { AttributeName: 'helper_id', KeyType: 'HASH' },
    { AttributeName: 'timestamp#action_id', KeyType: 'RANGE' }
  ],
  BillingMode: 'PAY_PER_REQUEST'
}
```

## Relationships

```
PromptHelper (1) ──< (many) PromptHelperVersion
PromptHelper (1) ──< (many) PromptHelperAuditLog
```

- One PromptHelper can have many Versions (one per publish)
- One PromptHelper can have many AuditLog entries (one per action)

## Workflow States

```
┌─────────┐
│  Draft  │ ── publish ──> ┌──────────┐
└─────────┘                 │Published │ ── archive ──> ┌──────────┐
     │                      └──────────┘                │ Archived │
     │                           │                       └──────────┘
     └── update (allowed)        │
                                 │ (immutable)
                                 │
                                 └── creates Version snapshot
```

## Provider Overrides

Helpers can include provider-specific additions:

```typescript
{
  provider_overrides: {
    openai: "Use GPT-4 model",
    gemini: "Use Gemini Pro model"
  }
}
```

## RTE Action Instructions

For RTE helpers, per-action instructions:

```typescript
{
  rte_action_instructions: {
    shorten: "Make it concise",
    expand: "Add more detail",
    rewrite: "Improve clarity",
    tone_shift: "Make it more professional",
    summarize: "Create a brief summary"
  }
}
```

## Variable Substitution

Templates support variable substitution using `{{variable_name}}`:

```typescript
{
  template_text: "Write about {{product_name}} for {{target_audience}}",
  allowed_variables: ["product_name", "target_audience"]
}
```

## Default Helpers

Helpers can be set as default for specific contexts:

```typescript
{
  is_default_for: ["description", "rte_rewrite"]
}
```

When a context needs a helper and none is specified, the default helper is used.

## System Helpers

System helpers (`is_system: true`) are part of the starter library and typically cannot be deleted or modified by users.

## API Operations

### CRUD Operations

- `POST /v1/admin/prompt-helpers` - Create helper (draft)
- `GET /v1/admin/prompt-helpers/:id` - Get helper
- `PUT /v1/admin/prompt-helpers/:id` - Update helper (draft only)
- `GET /v1/admin/prompt-helpers` - List helpers (with filters)

### Lifecycle Operations

- `POST /v1/admin/prompt-helpers/:id/publish` - Publish helper (creates version)
- `POST /v1/admin/prompt-helpers/:id/archive` - Archive helper
- `POST /v1/admin/prompt-helpers/:id/set-default` - Set as default

### Version Operations

- `GET /v1/admin/prompt-helpers/:id/versions` - List versions
- `GET /v1/admin/prompt-helpers/:id/versions/:versionNumber` - Get version

### Audit Operations

- `GET /v1/admin/prompt-helpers/:id/audit-log` - Get audit log

### Consumer Operations

- `GET /v1/prompt-helpers` - Get helpers for context (published only)
- `POST /v1/prompt-helpers/compose-preview` - Preview composed prompt

## References

- Domain Types: `packages/domain/src/promptHelpers.ts`
- Repository: `apps/api/src/storage/dynamo/promptHelperRepo.ts`
- Handlers: `apps/api/src/handlers/promptHelpers.ts`
- Routes: `apps/api/src/routes/promptHelpers.ts`

