# Debugging 403 Forbidden Error

## Current Situation
- ✅ Frontend correctly identifies Admin role
- ✅ Token contains `["Admin","us-east-1_xBNZh7TaB_Google"]`
- ❌ API returns 403 Forbidden

## What to Check

### 1. API Server Console Logs
**CRITICAL**: Check your API server console output. You should see detailed logs like:

```
[JWT Auth] 🔍 NEW REQUEST - Starting JWT verification
[JWT Auth] 📋 Raw token payload (BEFORE verification): {...}
[JWT Auth] 🔍 STEP 1: Extracting groups from token...
[JWT Auth] 📊 Groups before role extraction: {...}
[extractRoleFromGroups] Input: {...}
[JWT Auth] 🎯 STEP 2: Extracting role from groups...
[JWT Auth] 🎯 STEP 3: Final role determination: {...}
[RBAC] 🔐 Role check: {...}
[RBAC] ❌ Access denied: {...}
```

**Look for:**
- What groups are in the raw token?
- What groups are extracted?
- What role is determined?
- Why is RBAC denying access?

### 2. Browser Console
After the error, check the browser console for:
- `[API Client] ❌ Auth error response:` - Shows full API error
- `[AdminUsersRolesPage] ❌ 403 Forbidden error:` - Shows debug info from API

The error message should now include debug info showing:
- Groups from token
- Groups from payload  
- User object

### 3. Debug Endpoints

#### Test Admin Access
Visit: `http://localhost:4000/debug/test-admin`

This endpoint requires Admin role. If it works, the issue is specific to the `/admin/users` route. If it fails, check the API logs to see why.

#### Check Auth Info
Visit: `http://localhost:4000/debug/auth-info`

This shows what the API sees in your token without requiring Admin role.

### 4. Verify API Server is Running Latest Code

Make sure:
1. API server was restarted after code changes
2. No TypeScript compilation errors
3. Server is running on port 4000

### 5. Common Issues

#### Issue: Groups Not Extracted
**Symptom**: Raw token has groups but extracted groups is empty
**Check**: API logs for `[JWT Auth] 🔍 STEP 1: Extracting groups`
**Solution**: Check if groups are in `cognito:groups` claim

#### Issue: Role Extraction Fails
**Symptom**: Groups extracted but role is Viewer
**Check**: API logs for `[extractRoleFromGroups]` entries
**Solution**: Check if "Admin" is being normalized correctly

#### Issue: RBAC Check Fails
**Symptom**: Role is Admin but RBAC denies
**Check**: API logs for `[RBAC] 🔐 Role check`
**Solution**: Check userLevel vs requiredLevel comparison

## Next Steps

1. **Check API Server Console** - Look for `[JWT Auth]` and `[RBAC]` logs
2. **Check Browser Console** - Look for error details with debug info
3. **Visit Debug Endpoints** - Test admin access
4. **Share Logs** - Copy the relevant API server console logs

The enhanced debugging should show exactly where the Admin group is being lost or not recognized.

