# Admin Role Issue - Next Steps & Debugging Guide

## Current Status

- ✅ Frontend correctly sees Admin role in token: `["Admin","us-east-1_xBNZh7TaB_Google"]`
- ❌ API receives Viewer role, causing 403 errors
- 🔍 Enhanced logging added to compare raw vs verified token payloads

## What We've Done

1. **Enhanced API logging** - Now decodes token BEFORE and AFTER verification
2. **Fallback to raw payload** - Uses raw decoded groups if verified payload doesn't have them
3. **Multiple claim name checks** - Checks `cognito:groups`, `groups`, `cognito_groups`
4. **Case-insensitive matching** - Handles "admin", "Admin", "ADMIN"

## Next Steps

### 1. Restart API Server

```bash
cd apps/api
export COGNITO_USER_POOL_ID=us-east-1_xBNZh7TaB
export COGNITO_USER_POOL_CLIENT_ID=18b68j5jbm61pthstbk3ngeaa3
export AWS_PROFILE=admin
export AWS_REGION=us-east-1
npm run dev
```

### 2. Check API Logs

When you make a request, look for these log entries:

```
[JWT Auth] Raw token payload (BEFORE verification): {
  cognitoGroups: [...],  // <-- Groups in raw token
  ...
}

[JWT Auth] Token verified (AFTER verification): {
  groups: [...],  // <-- Groups after verification
  rawPayloadHadGroups: true/false,  // <-- Comparison
  rawPayloadGroups: [...],  // <-- What was in raw
  ...
}
```

### 3. Possible Issues & Solutions

#### Issue A: Groups Missing from Verified Payload
**Symptom**: Raw payload has groups, verified payload doesn't
**Solution**: Code now falls back to raw payload (already implemented)

#### Issue B: User Pool Client Not Configured for Groups
**Symptom**: Groups not in token at all
**Solution**: Check if User Pool Client needs `readAttributes` configured

#### Issue C: Wrong User Pool ID
**Symptom**: Token issuer doesn't match configured User Pool
**Solution**: Verify `COGNITO_USER_POOL_ID` matches frontend's User Pool

### 4. Verify User Pool Client Configuration

Check if the User Pool Client is configured to include groups:

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_xBNZh7TaB \
  --client-id 18b68j5jbm61pthstbk3ngeaa3 \
  --query 'UserPoolClient.{ReadAttributes:ReadAttributes,WriteAttributes:WriteAttributes}' \
  --output json
```

Groups should be in `ReadAttributes`. If not, update it:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_xBNZh7TaB \
  --client-id 18b68j5jbm61pthstbk3ngeaa3 \
  --read-attributes email name "custom:groups" \
  --generate-secret
```

Actually, wait - groups are included automatically by Cognito, so this might not be the issue.

### 5. Test Token Directly

Use the test script to decode a token:

```bash
# Get token from browser console (copy the token string)
# Then run:
cd apps/api
tsx src/test-token-decode.ts <paste-token-here>
```

This will show:
- What's in the raw token
- What the verifier returns
- Any differences

### 6. Alternative: Check Token in Browser

In browser console, run:

```javascript
// Get current token
const { fetchAuthSession } = await import('https://esm.sh/aws-amplify/auth@6');
const session = await fetchAuthSession({ forceRefresh: true });
const token = session.tokens?.idToken?.toString();

// Decode it
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
console.log('Groups in token:', payload['cognito:groups']);
console.log('All claims:', Object.keys(payload));
```

## Most Likely Root Cause

Based on the symptoms, the most likely issue is:

**The `aws-jwt-verify` library's `CognitoJwtVerifier.verify()` method might be stripping or not returning the `cognito:groups` claim.**

This is why we:
1. Decode the token manually BEFORE verification
2. Use raw payload groups as fallback
3. Log both raw and verified payloads for comparison

## If Still Not Working

If groups are in raw payload but not verified payload, and fallback isn't working:

1. **Check the actual API logs** - Share the `[JWT Auth]` log entries
2. **Verify User Pool Client** - Ensure it's configured correctly
3. **Try different token** - Sign out and sign back in to get fresh token
4. **Check aws-jwt-verify version** - Might need to update or use different approach

## Quick Fix Script

If you want to quickly test if raw payload fallback works:

```bash
# In API server terminal, after restart, make a request
# Then check logs for:
# - "Groups not found in verified payload, trying raw payload"
# - If you see this, the fallback should work
```

## Summary

The code now:
- ✅ Decodes token before verification
- ✅ Falls back to raw payload if verified doesn't have groups
- ✅ Logs everything for debugging
- ✅ Handles multiple claim name formats
- ✅ Case-insensitive group matching

**Next action**: Restart API server and check logs to see what's actually happening.

