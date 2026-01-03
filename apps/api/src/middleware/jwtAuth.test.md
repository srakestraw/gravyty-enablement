# JWT Auth Middleware Unit Tests

## Overview

Unit tests for the JWT authentication middleware, specifically testing role extraction from Cognito groups and the Admin role handling fix.

## Test Coverage

### 1. Role Extraction (`extractRoleFromGroups`)

Tests the core role extraction logic:
- ✅ Returns Admin when Admin group is present
- ✅ Handles case-insensitive group names (Admin, admin, ADMIN)
- ✅ Prioritizes Admin over other roles
- ✅ Returns correct role for Approver, Contributor, Viewer
- ✅ Handles groups with whitespace
- ✅ Returns Viewer when no groups or unknown groups

### 2. Group Extraction from Token Payload

Tests extracting groups from different token payload formats:
- ✅ Extracts from `cognito:groups` claim
- ✅ Extracts from `groups` claim (alternative format)
- ✅ Handles single group (non-array format)
- ✅ Prioritizes raw payload over verified payload

### 3. Safety Check

Tests the safety mechanism that forces Admin when groups contain Admin:
- ✅ Forces Admin when groups contain Admin but extraction returns Viewer
- ✅ Doesn't force Admin when groups don't contain Admin

### 4. Real-World Scenarios

Tests your exact use case:
- ✅ Extracts Admin from your token payload structure: `['Admin', 'us-east-1_xBNZh7TaB_Google']`
- ✅ Handles verified payload missing groups (simulates aws-jwt-verify stripping groups)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/middleware/jwtAuth.test.ts
```

## Test Results

All 18 tests pass ✅

## What These Tests Verify

1. **Role extraction works correctly** - Admin group is properly recognized
2. **Case-insensitive matching** - Handles "Admin", "admin", "ADMIN"
3. **Priority logic** - Admin takes precedence over other roles
4. **Raw payload priority** - Uses raw payload groups first (critical fix)
5. **Safety check** - Forces Admin if extraction incorrectly returns Viewer
6. **Your exact scenario** - Tests with your actual token payload structure

These tests ensure the fix for your Admin role issue works correctly and will catch any regressions in the future.

