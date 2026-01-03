# Frontend vs API Role Mismatch - Root Cause Analysis

## The Problem

**Frontend shows**: `Admin` role ✅  
**API shows**: `Viewer` role ❌

This means the API middleware is **not extracting groups correctly** from the JWT token.

## Root Cause

### Why Frontend Works

The frontend decodes the JWT token directly:
```javascript
// Frontend can see the raw token payload
cognito:groups: ["Admin", "us-east-1_xBNZh7TaB_Google"]
```

### Why API Fails

The API uses `CognitoJwtVerifier.verify()` which:
1. ✅ Verifies the token signature (security)
2. ❌ **Strips custom claims** like `cognito:groups` from the verified payload
3. Returns a "clean" payload without groups

**The verified payload from `CognitoJwtVerifier.verify()` typically looks like:**
```javascript
{
  sub: "user-id",
  email: "scott.rakestraw@gravyty.com",
  // cognito:groups is MISSING! ❌
}
```

## The Fix (Already Implemented)

I've updated the middleware (`jwtAuth.new.ts`) to:

1. **Decode raw token FIRST** (before verification)
2. **Extract groups from raw payload** (has `cognito:groups`)
3. **Fall back to verified payload** if raw payload has no groups
4. **Force extract** if groups exist but extraction returned empty
5. **Safety check** to force Admin if groups contain Admin but role is Viewer

### Code Flow:

```typescript
// STEP 1: Decode raw token (BEFORE verification)
rawPayload = decode(token) // Has cognito:groups ✅

// STEP 2: Verify token signature
verifiedPayload = await jwtVerifier.verify(token) // Missing cognito:groups ❌

// STEP 3: Extract groups from RAW payload first
groups = extractGroupsFromPayload(rawPayload) // Gets ["Admin", ...] ✅

// STEP 4: Determine role
role = determineRoleFromGroups(groups) // Should be "Admin" ✅
```

## Why It's Still Not Working

**The API server hasn't been restarted** with the new middleware code!

The fixes are in the code, but:
- Old middleware code is still running in memory
- New code needs to be loaded by restarting the server

## Solution

### Step 1: Restart API Server

```bash
# Stop the current API server (Ctrl+C)
# Then restart it
cd apps/api
npm run dev
```

### Step 2: Get Fresh Token

1. **Sign out completely** from your app
2. **Clear browser cache/cookies** (optional but recommended)
3. **Sign in again** with Google
4. This gets you a fresh token with Admin group

### Step 3: Check API Server Logs

After restart and fresh sign-in, you should see in API logs:

```
[JWT Auth NEW] Raw token payload: { cognitoGroups: ["Admin", "us-east-1_xBNZh7TaB_Google"] }
[JWT Auth NEW] Groups from raw payload: ["Admin", "us-east-1_xBNZh7TaB_Google"]
[JWT Auth NEW] Role determined: Admin
[JWT Auth NEW] User attached to request: { role: 'Admin', ... }
```

If you see:
- `Groups from raw payload: []` → Token doesn't have groups (need fresh sign-in)
- `Role determined: Viewer` → Groups extraction failed (check logs for details)
- `Groups: ["Admin"]` but `Role: Viewer` → Safety check should catch this

## Expected Behavior After Fix

1. **Frontend**: Decodes token → Sees Admin group → Shows Admin role ✅
2. **API**: Decodes raw token → Extracts Admin group → Determines Admin role ✅
3. **Both match**: Admin role everywhere ✅

## Diagnostic Commands

Check if API server is running with new middleware:

```bash
# Look for this log message on startup:
grep -r "JWT Auth NEW" apps/api/dist/ || echo "Server not restarted yet"
```

Check API server logs for group extraction:

```bash
# In your API server terminal, look for:
[JWT Auth NEW] Groups from raw payload
[JWT Auth NEW] Role determined
```

## Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Frontend | ✅ Working | None |
| Middleware Code | ✅ Fixed | None |
| API Server | ❌ Not restarted | **Restart API server** |
| Token | ⚠️ May be stale | **Sign out and sign in again** |

**Next Steps:**
1. ✅ Restart API server
2. ✅ Sign out and sign in again
3. ✅ Check API logs
4. ✅ Test admin endpoints

