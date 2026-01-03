# Google Redirect URI Verification - CLI Limitations

## ⚠️ Important Finding

**Google Cloud Console OAuth client redirect URIs are NOT accessible via CLI or public API.**

This is a limitation of Google's API architecture. OAuth client configuration (including redirect URIs) is only accessible through the Google Cloud Console web UI.

## What We Verified via CLI

✅ **AWS Cognito Configuration**: All verified and correct
- User Pool: `us-east-1_xBNZh7TaB`
- Client ID: `18b68j5jbm61pthstbk3ngeaa3`
- Domain: `enablement-portal-75874255`
- Google Identity Provider: Configured correctly
- User Groups: Admin group confirmed

✅ **Google OAuth Client**: Client ID verified
- Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
- Exists in Google Cloud Console
- Configured in Cognito

❌ **Redirect URI**: Cannot verify via CLI (Google API limitation)

## Required Redirect URI

The redirect URI that MUST be configured in Google Cloud Console:

```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

## Verification Methods

### Method 1: Manual Verification (Most Reliable)

1. **Open Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048
   ```

2. **Check "Authorized redirect URIs" section**

3. **Verify this URI exists**:
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

4. **If missing**: Click "+ ADD URI" and add it exactly as shown above

### Method 2: Test OAuth Flow

If the redirect URI is NOT configured correctly, you'll get one of these errors when trying to sign in:

- `redirect_uri_mismatch` - Most common, means redirect URI not in Google's authorized list
- `invalid_client` - Client ID issue or redirect URI mismatch
- `unauthorized_client` - OAuth consent screen not configured or redirect URI mismatch

**To test**:
1. Sign out completely from your app
2. Try signing in with Google
3. Check the error message (if any)
4. If OAuth works without errors, redirect URI is configured correctly

### Method 3: Browser Network Inspection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try signing in with Google
4. Look for requests to `accounts.google.com`
5. Check the `redirect_uri` parameter in the OAuth request
6. Verify it matches: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Why CLI Verification Fails

We attempted these APIs:
- ❌ Identity Platform API (`identitytoolkit.googleapis.com`) - Not for OAuth clients
- ❌ OAuth2 API (`www.googleapis.com/oauth2`) - No client management endpoint
- ❌ IAM OAuth Clients API (`iam.googleapis.com`) - Only for Workforce Identity, not regular OAuth clients
- ❌ Google Cloud Console API - Internal API, not publicly accessible
- ❌ gcloud CLI - No command for OAuth client redirect URIs

## Current Status

Based on your console logs showing successful OAuth authentication, **the redirect URI is likely configured correctly**. However, we cannot verify this definitively via CLI.

## Recommendation

Since OAuth is working (you're able to sign in), the redirect URI is probably configured. The issue is more likely:

1. **Token groups extraction** - API middleware not extracting Admin group correctly (already fixed in code)
2. **Token refresh** - Old token cached, needs fresh sign-in
3. **API server configuration** - Environment variables or middleware issue

## Next Steps

1. ✅ **Restart API server** (to pick up middleware fixes)
2. ✅ **Sign out completely** and sign in again (to get fresh token)
3. ✅ **Check API server logs** for `[JWT Auth NEW]` messages
4. ⚠️ **Verify redirect URI manually** if issues persist (use Method 1 above)

