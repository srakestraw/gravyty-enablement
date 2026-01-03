# Admin Role Troubleshooting Guide

## Problem
You see "Requires Admin role or higher. Current role: Viewer" when trying to access the Users & Roles page, even though you believe you're an admin.

## Root Cause
Your JWT token doesn't include the "Admin" group claim. This typically happens when:
1. You were added to the Admin group but haven't refreshed your token
2. Your token was issued before you were added to the Admin group
3. You're not actually in the Admin group in Cognito

## Solution Steps

### Step 1: Verify You're in the Admin Group

Run the diagnostic script to check your Cognito groups:

```bash
./scripts/diagnose-admin-role.sh [USER_POOL_ID] [YOUR_EMAIL]
```

Or manually check:

```bash
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_s4q1vjkgD \
  --username your-email@example.com
```

### Step 2: Add Yourself to Admin Group (if needed)

If you're not in the Admin group:

```bash
./scripts/add-user-to-admin-group.sh [USER_POOL_ID] [YOUR_EMAIL]
```

### Step 3: Refresh Your Token

After being added to the Admin group, you **must** refresh your token:

#### Option A: Use the Refresh Button (Recommended)
1. On the Users & Roles page, click the "Refresh Auth" button in the error message
2. Wait for the refresh to complete
3. The page should reload with your updated permissions

#### Option B: Sign Out and Sign Back In
1. Sign out of the application completely
2. Clear browser cache/cookies (optional but recommended)
3. Sign back in with Google
4. This will issue a fresh JWT token with your updated groups

#### Option C: Force Token Refresh via Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
// This will force refresh your auth session
await window.location.reload();
```

### Step 4: Verify Token Contains Admin Group

After refreshing, check your token in the browser console:

1. Open DevTools (F12) → Console
2. Look for logs starting with `[Auth] ID Token claims:`
3. Verify `cognito:groups` includes `"Admin"`

Example log:
```
[Auth] ID Token claims: {
  email: "your-email@example.com",
  groups: ["Admin"],
  hasCognitoGroups: true,
  ...
}
```

## How It Works

### Token Flow
1. **Cognito Groups**: Your user account in Cognito has group memberships (Viewer, Contributor, Approver, Admin)
2. **JWT Token**: When you sign in, Cognito issues a JWT token that includes your groups in the `cognito:groups` claim
3. **Token Caching**: The browser caches your token to avoid constant refreshes
4. **Token Refresh**: When your groups change, you need a new token to reflect those changes

### Why Tokens Don't Auto-Refresh
- JWT tokens are stateless and don't automatically update when Cognito groups change
- Tokens are cached for performance (they're valid for ~1 hour)
- You must explicitly refresh to get updated group claims

## Prevention

To avoid this issue in the future:
1. **After adding a user to Admin group**: Tell them to sign out and sign back in
2. **Use the refresh button**: The UI now includes a "Refresh Auth" button for convenience
3. **Check groups before assigning**: Verify the user is actually in the Admin group in Cognito

## Debugging

### Check Current Role in UI
The error message now shows:
- Your current email/user ID
- Your current role as detected by the frontend
- Instructions on how to fix it

### Check API Response
The API returns:
- Error code: `FORBIDDEN`
- Message: `Requires Admin role or higher. Current role: Viewer`
- Your role as extracted from the JWT token

### Common Issues

1. **Token not refreshing**: 
   - Solution: Sign out completely and sign back in
   - Clear browser cache if needed

2. **Groups not in token**:
   - Verify groups in Cognito console
   - Check User Pool Client configuration (groups should be included by default)
   - Ensure you're using the correct User Pool Client ID

3. **Frontend shows different role than API**:
   - Frontend and API both extract from JWT token
   - If they differ, check browser console for token claims
   - Verify both are using the same token

## Technical Details

### Frontend Role Extraction
- Location: `apps/web/src/contexts/AuthContext.tsx`
- Extracts groups from JWT token `cognito:groups` claim
- Uses `roleFromGroups()` to determine role (Admin > Approver > Contributor > Viewer)

### API Role Extraction  
- Location: `apps/api/src/middleware/jwtAuth.ts`
- Extracts groups from JWT token `cognito:groups` claim
- Uses `extractRoleFromGroups()` to determine role
- Returns 403 if role doesn't meet requirements

### Token Refresh
- `getIdToken(true)` forces a token refresh
- `checkAuth(true)` forces auth refresh and token refresh
- Both update the cached session with latest groups

## Related Files

- `apps/web/src/pages/admin/AdminUsersRolesPage.tsx` - Users & Roles page with improved error handling
- `apps/web/src/contexts/AuthContext.tsx` - Auth context with token refresh support
- `apps/web/src/lib/auth.ts` - Auth utilities including token refresh
- `apps/api/src/middleware/jwtAuth.ts` - API JWT authentication middleware
- `scripts/diagnose-admin-role.sh` - Diagnostic script
- `scripts/add-user-to-admin-group.sh` - Script to add user to Admin group

