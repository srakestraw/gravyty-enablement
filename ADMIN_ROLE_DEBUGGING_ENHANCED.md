# Admin Role Debugging - Enhanced Implementation

## Overview
Added extensive debugging and refactored the JWT authentication middleware to resolve the 403 Forbidden error when accessing admin endpoints. The frontend correctly identifies Admin role, but the API was receiving Viewer role.

## Changes Made

### 1. Enhanced JWT Middleware (`apps/api/src/middleware/jwtAuth.ts`)

#### Improved Group Extraction Function
- Added comprehensive logging at every step of group extraction
- Handles multiple input formats:
  - Arrays: `["Admin", "Group2"]`
  - Strings: `"Admin"` or `'["Admin"]'` (JSON string)
  - Single values: `"Admin"`
- Case-insensitive matching with detailed logging
- Logs original value, normalized value, and match results

#### Enhanced Token Processing
- **Step 1: Raw Token Decoding**
  - Decodes token BEFORE verification to capture all claims
  - Logs all group-related keys and values
  - Shows full payload structure

- **Step 2: Group Extraction**
  - Priority 1: Extract from raw payload (most reliable)
  - Priority 2: Fallback to verified payload
  - Handles JSON string parsing
  - Normalizes all values to strings and trims whitespace
  - Logs every extraction attempt with results

- **Step 3: Role Extraction**
  - Detailed logging of role extraction process
  - Shows which groups were checked
  - Logs exact match results
  - Safety check: If Viewer but groups contain Admin, force Admin

#### Enhanced RBAC Middleware Logging
- Logs role check with detailed comparison
- Shows user level vs required level
- Includes groups from token and payload
- Logs access denied with full context

### 2. Enhanced Debug Endpoint (`apps/api/src/server.ts`)

The `/debug/auth-info` endpoint now shows:
- Processed user object
- Token groups (from middleware)
- Token payload groups (from verified payload)
- Decoded token with all group-related fields
- Type information for all group fields
- JSON stringified versions for easy inspection

### 3. Handler-Level Debugging (`apps/api/src/handlers/adminUsers.ts`)

Added logging at the handler level to see what role the handler receives:
- User object
- Role
- Groups from token
- Groups from payload
- Request query parameters

## Debugging Flow

When a request comes in, you'll see logs in this order:

1. **`[JWT Auth] 🔍 NEW REQUEST`** - Request starts
2. **`[JWT Auth] 📋 Raw token payload`** - Raw token decoded
3. **`[JWT Auth] 🔍 STEP 1: Extracting groups`** - Group extraction begins
4. **`[JWT Auth] 📊 Groups before role extraction`** - Final groups array
5. **`[extractRoleFromGroups]`** - Role extraction process
6. **`[JWT Auth] 🎯 STEP 2: Extracting role`** - Role extracted
7. **`[JWT Auth] 🎯 STEP 3: Final role determination`** - Final role set
8. **`[JWT Auth] ✅ Token verified`** - Complete verification summary
9. **`[RBAC] 🔐 Role check`** - RBAC middleware checks permission
10. **`[AdminUsers] 📋 GET /v1/admin/users`** - Handler receives request

## How to Use

### 1. Check API Server Logs
When you make a request to `/v1/admin/users`, check the API server console for:
- `[JWT Auth]` logs showing token processing
- `[RBAC]` logs showing permission checks
- `[AdminUsers]` logs showing handler execution

### 2. Use Debug Endpoint
Visit `http://localhost:4000/debug/auth-info` to see:
- What the API sees in the token
- What groups are extracted
- What role is determined
- Full token payload structure

### 3. Compare Frontend vs Backend
The logs will show:
- What groups are in the raw token
- What groups are extracted
- What role is determined
- Why RBAC might be denying access

## Expected Behavior

If the token contains `["Admin", "us-east-1_xBNZh7TaB_Google"]`:

1. **Raw token decode** should show `cognitoGroups: ["Admin", "us-east-1_xBNZh7TaB_Google"]`
2. **Group extraction** should extract `["Admin", "us-east-1_xBNZh7TaB_Google"]`
3. **Role extraction** should find "admin" (case-insensitive) and return `Admin`
4. **RBAC check** should see `userLevel: 3 >= requiredLevel: 3` and allow access

## Troubleshooting

If you still see 403 errors:

1. **Check raw token payload** - Does it show `cognitoGroups`?
2. **Check group extraction** - Are groups extracted correctly?
3. **Check role extraction** - Does it find "admin" in normalized groups?
4. **Check RBAC** - What user level vs required level?

The logs will show exactly where the process fails.

## Next Steps

1. Restart the API server
2. Make a request to `/v1/admin/users`
3. Check the console logs for the detailed debugging output
4. Compare with frontend logs to identify the mismatch
5. Use `/debug/auth-info` endpoint for quick inspection

