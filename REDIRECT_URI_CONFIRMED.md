# Redirect URI Configuration Confirmed

## ✅ Redirect URI Format

The redirect URI you provided is correctly formatted:

```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Format Verification:
- ✅ Uses **HTTPS** (not HTTP)
- ✅ Includes `/oauth2/idpresponse` path
- ✅ **No trailing slash**
- ✅ Correct Cognito domain format
- ✅ Domain is active and associated with User Pool `us-east-1_xBNZh7TaB`

## Configuration Status

### AWS Cognito ✅
- Domain: `enablement-portal-75874255` - ACTIVE
- User Pool: `us-east-1_xBNZh7TaB` - Verified
- Domain endpoint accessible

### Google Cloud Console ⚠️
- Cannot verify via CLI (Google API limitation)
- **Must verify manually** in Google Cloud Console
- Since OAuth sign-in works, URI is likely configured correctly

## Verification Steps

1. **Open Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048
   ```

2. **Check "Authorized redirect URIs"** section

3. **Verify this exact URI exists**:
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

4. **If missing**: Add it exactly as shown above (no trailing slash, HTTPS)

## Current Issue Analysis

Since:
- ✅ OAuth sign-in works (you can authenticate)
- ✅ Redirect URI format is correct
- ✅ Cognito domain is active
- ✅ User is in Admin group

The 403 error is likely caused by:
1. **API middleware not extracting Admin group** from token (already fixed in code)
2. **Stale token** - need to sign out and sign in again
3. **API server needs restart** - to pick up middleware fixes

## Next Steps

1. **Restart API server** (to load updated middleware)
2. **Sign out completely** from your app
3. **Sign in again** with Google (to get fresh token with Admin group)
4. **Check API server logs** for `[JWT Auth NEW]` messages showing group extraction
5. **Test admin endpoints** - should work now

## Expected API Server Logs

After restart and fresh sign-in, you should see in API logs:

```
[JWT Auth NEW] Groups from raw payload: ["Admin", "us-east-1_xBNZh7TaB_Google"]
[JWT Auth NEW] Role determined: Admin
[JWT Auth NEW] User attached to request: { role: 'Admin', ... }
```

If you see `role: 'Viewer'` instead, the middleware fix didn't work and we need to investigate further.

