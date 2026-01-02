# Assignments - Detailed Functional Technical Overview

## Table of Contents
1. [Overview](#overview)
2. [Domain Model](#domain-model)
3. [Data Storage](#data-storage)
4. [Status State Machine](#status-state-machine)
5. [API Endpoints](#api-endpoints)
6. [Business Logic](#business-logic)
7. [Frontend Integration](#frontend-integration)
8. [Integration with Progress Tracking](#integration-with-progress-tracking)
9. [Telemetry & Events](#telemetry--events)

---

## Overview

The Assignments system enables administrators to assign courses or learning paths to learners with optional due dates. Assignments track learner progress through a state machine and integrate with the broader LMS progress tracking system.

**Key Capabilities:**
- Assign courses or learning paths to individual learners
- Set optional due dates
- Track assignment status (assigned → started → completed)
- Admin ability to waive assignments
- Automatic overdue detection
- Integration with learner progress tracking

---

## Domain Model

### Assignment Type

```typescript
type AssignmentType = 'course' | 'path';
```

An assignment can target either:
- **Course**: A single course assignment
- **Path**: A learning path assignment (contains multiple courses)

### Assignment Status

```typescript
type AssignmentStatus = 'assigned' | 'started' | 'completed' | 'waived';
```

**Status Definitions:**
- `assigned`: Assignment created but learner hasn't started
- `started`: Learner has begun the course/path
- `completed`: Terminal state - learner completed the assignment
- `waived`: Terminal state - admin waived the requirement

### Assignment Schema

```typescript
interface Assignment {
  assignment_id: string;           // Unique identifier
  user_id: string;                  // PK: Learner user ID
  
  // Target
  assignment_type: 'course' | 'path';
  course_id?: string;               // If assignment_type is 'course'
  path_id?: string;                 // If assignment_type is 'path'
  
  // Status
  status: AssignmentStatus;
  
  // Due date
  due_at?: string;                 // ISO datetime (optional)
  
  // Metadata
  assigned_by: string;              // Admin user ID who created assignment
  assigned_at: string;              // ISO datetime
  waived_by?: string;              // Admin user ID (if waived)
  waived_at?: string;               // ISO datetime (if waived)
  
  // Timestamps
  started_at?: string;              // ISO datetime (when learner started)
  completed_at?: string;            // ISO datetime (when completed)
  updated_at: string;                // ISO datetime
}
```

### Validation Rules

1. **Target Validation:**
   - Course assignments must have `course_id`
   - Path assignments must have `path_id`
   - Cannot have both `course_id` and `path_id`

2. **Status Validation:**
   - Waived assignments must have `waived_at` and `waived_by`
   - Completed assignments must have `completed_at`

3. **Overdue Calculation:**
   - Assignment is overdue if:
     - `due_at` exists AND
     - `due_at < now` AND
     - Status is NOT `completed` or `waived`

---

## Data Storage

### DynamoDB Table: `lms_assignments`

**Primary Key:**
- **Partition Key (PK):** `assignee_user_id` (string)
- **Sort Key (SK):** `ASSIGNMENT#{assigned_at}#{assignment_id}` (string)

**Global Secondary Indexes:**

1. **AssignmentsByTargetIndex**
   - PK: `target_key` (format: `TARGET#{target_type}#{target_id}`)
   - SK: `due_at`
   - Purpose: Query assignments by course/path

2. **AssignmentsByStatusIndex**
   - PK: `status`
   - SK: `due_at`
   - Purpose: Query assignments by status (e.g., all overdue assignments)

**Storage Pattern:**
```typescript
{
  assignee_user_id: "user_123",                    // PK
  SK: "ASSIGNMENT#2024-01-15T10:00:00Z#assignment_abc",  // SK
  assignment_id: "assignment_abc",
  user_id: "user_123",
  assignment_type: "course",
  course_id: "course_xyz",
  status: "assigned",
  due_at: "2024-02-01T23:59:59Z",
  assigned_by: "admin_user_456",
  assigned_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  // ... other fields
}
```

---

## Status State Machine

### Valid Transitions

```
assigned ──→ started ──→ completed
   │            │
   └────────────┴──→ waived
```

**Transition Rules:**

| Current Status | Allowed Next Status | Trigger |
|---------------|-------------------|---------|
| `assigned` | `started`, `waived` | Learner starts OR admin waives |
| `started` | `completed`, `waived` | Learner completes OR admin waives |
| `completed` | *(none)* | Terminal state |
| `waived` | *(none)* | Terminal state |

**Transition Logic:**
```typescript
function canTransitionAssignmentStatus(
  currentStatus: AssignmentStatus,
  newStatus: AssignmentStatus
): boolean {
  const transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
    assigned: ['started', 'waived'],
    started: ['completed', 'waived'],
    completed: [], // Terminal
    waived: [],    // Terminal
  };
  
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}
```

### Status Update Triggers

1. **assigned → started:**
   - Triggered when learner accesses the assigned course/path
   - Sets `started_at` timestamp
   - Typically happens automatically when learner opens course/path

2. **started → completed:**
   - Triggered when learner completes the course/path
   - Sets `completed_at` timestamp
   - Based on course/path completion logic

3. **assigned/started → waived:**
   - Admin action via API
   - Sets `waived_by` and `waived_at` timestamps
   - Requires Admin role

---

## API Endpoints

### Admin Endpoints

**Base Path:** `/v1/lms/admin/assignments`

#### 1. List Assignments
```
GET /v1/lms/admin/assignments
Query Params:
  - assignee_user_id (optional): Filter by learner
  - status (optional): Filter by status

Authorization: Admin role required

Response:
{
  "data": {
    "assignments": Assignment[]
  }
}
```

**Implementation:** `listAdminAssignments()` in `apps/api/src/handlers/lmsAdmin.ts`

**Query Strategy:**
- If `assignee_user_id` provided: Query by PK
- If `status` filter: Use `AssignmentsByStatusIndex` GSI
- Otherwise: Scan all (MVP approach)

#### 2. Create Assignment
```
POST /v1/lms/admin/assignments
Body:
{
  assignee_user_id: string;
  target_type: 'course' | 'path';
  target_id: string;
  due_at?: string;              // ISO datetime
  assignment_reason?: 'required' | 'recommended';
  note?: string;
}

Authorization: Admin role required

Response:
{
  "data": {
    "assignment": Assignment
  }
}
```

**Implementation:** `createAssignment()` in `apps/api/src/handlers/lmsAdmin.ts`

**Process:**
1. Validate request body
2. Generate `assignment_id` (UUID format: `assignment_{uuid}`)
3. Create assignment with status `assigned`
4. Set `assigned_by` to current admin user ID
5. Store in DynamoDB
6. Emit telemetry event: `lms_admin_assignment_created`

#### 3. Waive Assignment
```
POST /v1/lms/admin/assignments/waive
Query Params:
  - assignee_user_id: Required
  - sk: Required (Sort Key from assignment)

Authorization: Admin role required

Response:
{
  "data": {
    "assignment": Assignment
  }
}
```

**Implementation:** `waiveAssignment()` in `apps/api/src/handlers/lmsAdmin.ts`

**Process:**
1. Get assignment by PK+SK
2. Validate status transition (must be `assigned` or `started`)
3. Update status to `waived`
4. Set `waived_by` and `waived_at`
5. Update `updated_at`
6. Emit telemetry event: `lms_admin_assignment_waived`

### Learner Endpoints

**Base Path:** `/v1/lms/assignments`

#### 1. List User Assignments
```
GET /v1/lms/assignments
Query Params:
  - status (optional): Filter by status

Authorization: Authenticated user

Response:
{
  "data": {
    "assignments": AssignmentSummary[]
  }
}
```

**Implementation:** `listAssignments()` in `apps/api/src/handlers/lms.ts`

**AssignmentSummary Schema:**
```typescript
interface AssignmentSummary {
  assignment_id: string;
  assignment_type: 'course' | 'path';
  course_id?: string;
  path_id?: string;
  title: string;                    // Hydrated course/path title
  status: AssignmentStatus;
  due_at?: string;
  assigned_at: string;
  progress_percent: number;          // 0-100, hydrated from progress
  is_overdue: boolean;               // Computed
}
```

**Query Strategy:**
- Query by `assignee_user_id` (PK)
- Hydrate with course/path titles
- Hydrate with progress percentages
- Compute `is_overdue` flag

---

## Business Logic

### Assignment Creation

**Location:** `apps/api/src/handlers/lmsAdmin.ts::createAssignment()`

**Steps:**
1. Validate request schema (Zod validation)
2. Check user authentication (must be Admin)
3. Generate assignment ID: `assignment_${uuidv4()}`
4. Create assignment object:
   ```typescript
   {
     assignment_id: generatedId,
     user_id: assignee_user_id,
     assignment_type: target_type,
     course_id: target_type === 'course' ? target_id : undefined,
     path_id: target_type === 'path' ? target_id : undefined,
     status: 'assigned',
     due_at: due_at || undefined,
     assigned_by: currentUserId,
     assigned_at: now,
     updated_at: now,
   }
   ```
5. Store in DynamoDB via `lmsRepo.createAssignment()`
6. Emit telemetry event

### Assignment Status Updates

**Automatic Status Transitions:**

1. **assigned → started:**
   - Triggered when learner accesses course/path
   - Implementation: Checked in course/path detail endpoints
   - Sets `started_at` timestamp

2. **started → completed:**
   - Triggered when course/path completion is detected
   - Based on progress tracking completion logic
   - Sets `completed_at` timestamp

**Note:** Current implementation appears to rely on progress tracking system to detect completion. Assignment status updates may need explicit API calls or background jobs.

### Overdue Detection

**Location:** `packages/domain/src/lms/assignment.ts::isAssignmentOverdue()`

```typescript
function isAssignmentOverdue(assignment: Assignment): boolean {
  if (!assignment.due_at) {
    return false; // No due date = never overdue
  }
  
  const terminalStates: AssignmentStatus[] = ['completed', 'waived'];
  if (terminalStates.includes(assignment.status)) {
    return false; // Terminal states are never overdue
  }
  
  const dueDate = new Date(assignment.due_at);
  const now = new Date();
  
  return dueDate < now;
}
```

**Computed Properties:**
- `is_overdue` is computed on-the-fly when returning `AssignmentSummary`
- Not stored in database (computed field)

### Assignment Validation

**Location:** `packages/domain/src/lms/assignment.ts::validateAssignment()`

**Validation Rules:**
1. Course assignments must have `course_id`
2. Path assignments must have `path_id`
3. Cannot have both `course_id` and `path_id`
4. Waived assignments must have `waived_at` and `waived_by`
5. Completed assignments must have `completed_at`

---

## Frontend Integration

### Admin Interface

**Component:** `apps/web/src/pages/admin/learning/AdminLearningAssignmentsPage.tsx`

**Features:**
- List all assignments in table format
- Filter by assignee user ID and status
- Create new assignments via dialog
- Waive assignments (for non-terminal states)
- Display assignment details (assignee, target, type, status, due date)

**Hook:** `apps/web/src/hooks/useAdminAssignments.ts`
- Fetches assignments via `lmsAdminApi.listAssignments()`
- Supports filtering by `assignee_user_id` and `status`
- Provides refetch capability

**API Client:** `apps/web/src/api/lmsAdminClient.ts`
- `listAssignments(params?)`
- `createAssignment(data)`
- `waiveAssignment(assigneeUserId, sk)`

### Learner Interface

**Component:** `apps/web/src/pages/learn/MyLearningPage.tsx`

**Features:**
- Displays assignments in "Required" section
- Shows due dates and overdue indicators
- Displays progress percentage
- Links to course/path detail pages

**Required Item Card:**
- Shows assignment icon
- Displays due date with overdue chip
- Shows progress bar
- Clickable to navigate to course/path

**API Integration:**
- Uses `useLmsMe()` hook
- Fetches from `/v1/lms/me` endpoint
- Assignments included in `required` array of `MyLearning` response

**Note:** Learner-facing assignments page (`AssignmentsPage.tsx`) is currently a placeholder ("Coming Soon").

---

## Integration with Progress Tracking

### Relationship to Course Progress

Assignments are **separate** from course progress but **integrated** for display:

1. **Assignment Creation:**
   - Creates assignment record
   - Does NOT automatically create enrollment/progress record
   - Enrollment created when learner first accesses course/path

2. **Progress Tracking:**
   - Course progress stored in `lms_progress` table
   - Assignment status tracked separately in `lms_assignments` table
   - Progress percentage hydrated into `AssignmentSummary` for display

3. **Status Synchronization:**
   - Assignment status transitions based on progress:
     - `assigned → started`: When learner accesses course/path
     - `started → completed`: When course/path completion detected
   - Current implementation may require explicit status updates

### My Learning Integration

**Endpoint:** `GET /v1/lms/me`

**Response Structure:**
```typescript
{
  my_learning: {
    required: Array<{
      type: 'course' | 'path';
      course_id?: string;
      path_id?: string;
      title: string;
      due_at?: string;
      assignment_id?: string;
      progress_percent: number;
    }>;
    in_progress: Array<{...}>;
    completed: Array<{...}>;
  }
}
```

**Process:**
1. Fetch user assignments via `lmsRepo.listUserAssignments()`
2. Filter assignments with status `assigned` or `started`
3. Hydrate with course/path titles
4. Hydrate with progress percentages from progress table
5. Include in `required` array

**Note:** Current `getMyLearning()` implementation may not fully integrate assignments. May need enhancement to properly hydrate assignment data.

---

## Telemetry & Events

### Events Emitted

1. **lms_admin_assignment_created**
   - Triggered: When admin creates assignment
   - Payload:
     ```typescript
     {
       assignment_id: string;
       course_id?: string;
       path_id?: string;
     }
     ```

2. **lms_admin_assignment_waived**
   - Triggered: When admin waives assignment
   - Payload:
     ```typescript
     {
       assignment_id: string;
     }
     ```

3. **lms_assignments_listed**
   - Triggered: When learner lists assignments
   - Payload:
     ```typescript
     {
       status?: string;
       result_count: number;
     }
     ```

**Implementation:** `apps/api/src/telemetry/lmsTelemetry.ts`

---

## Data Access Layer

### Repository Methods

**Location:** `apps/api/src/storage/dynamo/lmsRepo.ts`

#### `createAssignment(assignment: Assignment): Promise<void>`
- Stores assignment in DynamoDB
- Uses PK: `assignee_user_id`, SK: `ASSIGNMENT#{assigned_at}#{assignment_id}`

#### `listUserAssignments(userId: string): Promise<AssignmentSummary[]>`
- Queries by `assignee_user_id` (PK)
- Returns `AssignmentSummary[]` with computed `is_overdue`
- Note: Titles and progress must be hydrated by handler

#### `listAdminAssignments(params): Promise<Assignment[]>`
- Supports filtering by `assignee_user_id` and `status`
- If `assignee_user_id` provided: Query by PK
- If `status` filter: Use `AssignmentsByStatusIndex` GSI
- Otherwise: Scan all (MVP approach)
- Returns full `Assignment[]` objects

#### `waiveAssignment(assigneeUserId, sk, userId): Promise<Assignment>`
- Gets assignment by PK+SK
- Updates status to `waived`
- Sets `waived_by` and `waived_at`
- Returns updated assignment

---

## Key Implementation Notes

### Current Limitations

1. **Status Transition Automation:**
   - Assignment status transitions may not be fully automated
   - May require explicit API calls or background jobs to sync with progress

2. **My Learning Integration:**
   - `getMyLearning()` endpoint may not fully hydrate assignment data
   - May need enhancement to properly include assignments in `required` array

3. **Learner Assignments Page:**
   - `AssignmentsPage.tsx` is currently a placeholder
   - Full learner-facing assignments UI not yet implemented

4. **Bulk Operations:**
   - No bulk assignment creation
   - No bulk status updates
   - No assignment deletion (only waiver)

### Future Enhancements

1. **Automatic Status Updates:**
   - Background job to sync assignment status with progress
   - Event-driven updates when progress changes

2. **Bulk Operations:**
   - Assign to multiple users
   - Bulk waiver
   - Assignment templates

3. **Notifications:**
   - Email notifications for new assignments
   - Reminders for upcoming due dates
   - Overdue notifications

4. **Analytics:**
   - Assignment completion rates
   - Average time to complete
   - Overdue rate tracking

---

## Related Files

### Domain Model
- `packages/domain/src/lms/assignment.ts` - Assignment types and validation
- `packages/domain/src/lms/contracts.ts` - API contract types

### API Handlers
- `apps/api/src/handlers/lmsAdmin.ts` - Admin assignment endpoints
- `apps/api/src/handlers/lms.ts` - Learner assignment endpoints

### Data Access
- `apps/api/src/storage/dynamo/lmsRepo.ts` - Assignment repository methods

### Frontend
- `apps/web/src/pages/admin/learning/AdminLearningAssignmentsPage.tsx` - Admin UI
- `apps/web/src/pages/learn/AssignmentsPage.tsx` - Learner UI (placeholder)
- `apps/web/src/pages/learn/MyLearningPage.tsx` - My Learning integration
- `apps/web/src/hooks/useAdminAssignments.ts` - Admin assignments hook
- `apps/web/src/api/lmsAdminClient.ts` - Admin API client

### Infrastructure
- `infra/scripts/create-tables.ts` - DynamoDB table definitions

