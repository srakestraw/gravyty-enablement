# Testing Admin Access After Refactoring

## API Server Status
✅ API server has been restarted with refactored code

## What to Test

### 1. Check API Server Console Logs
When you click "Users and Roles" in the frontend, check your API server console for these logs:

```
[JWT Auth] 🔍 NEW REQUEST - Starting JWT verification
[JWT Auth] 📋 Raw token payload (BEFORE verification): {...}
[JWT Auth] 🔍 STEP 1: Extracting groups from token...
[JWT Auth] 📊 Final groups extracted: {...}
[extractRoleFromGroups] {...}
[JWT Auth] 🎯 STEP 2: Extracting role from groups...
[JWT Auth] 🎯 STEP 3: Final role determination: {...}
[RBAC] 🔐 Role check: {...}
```

**Look for:**
- `cognitoGroups` in raw payload - Should show `["Admin", "us-east-1_xBNZh7TaB_Google"]`
- `Final groups extracted` - Should show `["Admin", "us-east-1_xBNZh7TaB_Google"]`
- `hasAdmin: true` - Should be true
- `Extracted Role: Admin` - Should be Admin
- `RBAC Role check` - Should show `hasAccess: true`

### 2. Test Debug Endpoint
Visit: `http://localhost:4000/debug/auth-info`

This shows what the API sees in your token. Check:
- `tokenGroups` - Should show `["Admin", "us-east-1_xBNZh7TaB_Google"]`
- `user.role` - Should be `"Admin"`

### 3. Test Admin Endpoint
Try accessing: `GET http://localhost:4000/v1/admin/users?limit=50`

**Expected Result:**
- ✅ Should return 200 OK with user list
- ❌ If still 403, check API server logs for the detailed debugging output

### 4. Check Browser Console
After clicking "Users and Roles", check browser console for:
- `[API Client] ❌ Auth error response:` - Shows full API error with debug info
- `[AdminUsersRolesPage] ❌ 403 Forbidden error:` - Shows detailed error info

## What the Refactoring Fixed

1. **Robust Group Extraction**
   - Multiple fallback mechanisms
   - Handles different claim name formats
   - Always tries raw payload first (most reliable)

2. **Simplified Role Extraction**
   - Uses centralized `normalizeGroups()` function
   - Case-insensitive matching
   - Clear precedence order

3. **Safety Checks**
   - Forces Admin role if groups contain Admin but extraction returned something else
   - Prevents false negatives

4. **Better Logging**
   - Detailed logs at every step
   - Shows exactly what's happening

## If Issue Persists

If you still get 403 errors, check:

1. **API Server Logs** - Look for `[JWT Auth]` entries
   - What groups are in raw payload?
   - What groups are extracted?
   - What role is determined?
   - Why is RBAC denying access?

2. **Token Refresh** - The error message suggests signing out and back in
   - This refreshes the JWT token
   - Ensures latest groups are included

3. **Debug Endpoint** - Check `/debug/auth-info`
   - What does the API see in the token?
   - Are groups present?
   - What role is determined?

## Expected Flow

```
Token Received
  ↓
Decode Raw Payload → cognito:groups: ["Admin", "us-east-1_xBNZh7TaB_Google"]
  ↓
Extract Groups → ["Admin", "us-east-1_xBNZh7TaB_Google"]
  ↓
Normalize Groups → ["Admin", "us-east-1_xBNZh7TaB_Google"]
  ↓
Extract Role → "Admin" (found "admin" in lowercase groups)
  ↓
Safety Check → Confirms Admin is present
  ↓
RBAC Check → userLevel: 3 >= requiredLevel: 3 → ✅ Access Granted
```

## Next Steps

1. **Try accessing Users and Roles page**
2. **Check API server console logs** - Look for the detailed debugging output
3. **Share the logs** if issue persists - The logs will show exactly where the problem is

