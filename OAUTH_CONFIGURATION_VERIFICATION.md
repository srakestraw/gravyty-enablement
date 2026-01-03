# OAuth Configuration Verification Report

## ✅ AWS Cognito Configuration - VERIFIED

### 1. User Pool
- **Pool ID**: `us-east-1_xBNZh7TaB` ✅
- **Pool Name**: `enablement-portal-users` ✅
- **Status**: Active ✅

### 2. User Pool Client
- **Client ID**: `18b68j5jbm61pthstbk3ngeaa3` ✅
- **Client Name**: `enablement-portal-client` ✅
- **Supported Identity Providers**: `["COGNITO", "Google"]` ✅
- **OAuth Flows**: `["code"]` ✅
- **OAuth Scopes**: `["email", "openid", "profile"]` ✅

### 3. Callback URLs
Current callback URLs configured:
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3000/`
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://localhost:3000/`
- `http://localhost:5173`
- `http://localhost:5173/`
- `https://enable.gravytylabs.com`
- `https://enable.gravytylabs.com/`
- `https://main.d1cf513hn1tkd1.amplifyapp.com`
- `https://main.d1cf513hn1tkd1.amplifyapp.com/`

**Note**: These are the URLs Cognito will redirect TO after authentication. They look correct.

### 4. Cognito Domain
- **Domain**: `enablement-portal-75874255` ✅
- **Full Domain**: `enablement-portal-75874255.auth.us-east-1.amazoncognito.com` ✅
- **Status**: ACTIVE ✅
- **Associated Pool**: `us-east-1_xBNZh7TaB` ✅

### 5. Google Identity Provider
- **Provider Name**: `Google` ✅
- **Provider Type**: `Google` ✅
- **Client ID**: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com` ✅
- **Client Secret**: Configured ✅
- **Scopes**: `openid email profile` ✅

### 6. User Configuration
- **User**: `scott.rakestraw@gravyty.com`
- **Username**: `Google_116634829206759161721`
- **Groups**: `["Admin", "us-east-1_xBNZh7TaB_Google"]` ✅
- **Admin Group**: ✅ Confirmed

### 7. SSM Parameters
- **Google Client ID**: Stored in SSM ✅
- **Google Client Secret**: Stored in SSM ✅
- **Matches Cognito Config**: ✅

## ⚠️ Google Cloud OAuth Configuration - REQUIRES MANUAL VERIFICATION

### Critical Configuration Needed:

**OAuth Client ID**: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`

**Required Redirect URI** (MUST be configured in Google Cloud Console):
```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Verification Steps:

1. **Open Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048
   ```

2. **Check "Authorized redirect URIs"**:
   - Must include: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - Must use HTTPS (not HTTP)
   - Must include `/oauth2/idpresponse` path
   - Must NOT have trailing slash

3. **Check OAuth Consent Screen**:
   ```
   https://console.cloud.google.com/apis/credentials/consent?project=680059166048
   ```
   - Must be configured
   - Must have scopes: `openid`, `email`, `profile`
   - If External app, test users must include your email

## 🔍 Potential Issues Found

### Issue 1: Callback URLs May Be Missing Localhost:5173
The frontend is running on `localhost:5173` (Vite default), but I only see `http://127.0.0.1:5173` in the callback URLs. This might cause redirect issues.

**Fix**: Add `http://localhost:5173` to Cognito callback URLs if not already present.

### Issue 2: Google Redirect URI Not Verifiable via CLI
Cannot verify if Google Cloud Console has the correct redirect URI configured. This is the most likely cause of OAuth failures.

**Fix**: Manually verify and add the redirect URI in Google Cloud Console.

### Issue 3: Token Groups Extraction
The frontend shows groups `["Admin", "us-east-1_xBNZh7TaB_Google"]`, but API is seeing Viewer. This suggests:
- Token is being issued correctly (has Admin group)
- But API middleware isn't extracting it correctly

**Possible Causes**:
- `CognitoJwtVerifier.verify()` may strip `cognito:groups` from verified payload
- Middleware needs to use raw payload for groups extraction (already fixed in code)

## ✅ Configuration Summary

| Component | Status | Notes |
|-----------|--------|-------|
| AWS Cognito User Pool | ✅ Correct | `us-east-1_xBNZh7TaB` |
| Cognito User Pool Client | ✅ Correct | OAuth flows enabled |
| Cognito Domain | ✅ Correct | Active and associated |
| Google Identity Provider | ✅ Correct | Configured in Cognito |
| User Group Membership | ✅ Correct | User is in Admin group |
| Google Client ID Match | ✅ Correct | SSM matches Cognito |
| Google Redirect URI | ⚠️ Unknown | Must verify manually |
| OAuth Consent Screen | ⚠️ Unknown | Must verify manually |

## 🎯 Next Steps

1. **Verify Google Redirect URI** (CRITICAL):
   - Open: https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048
   - Ensure redirect URI exists: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

2. **Verify OAuth Consent Screen**:
   - Open: https://console.cloud.google.com/apis/credentials/consent?project=680059166048
   - Ensure it's configured and has correct scopes

3. **Test OAuth Flow**:
   - Sign out completely
   - Sign in again with Google
   - Check API server logs for group extraction
   - Verify Admin access works

4. **Check API Server Logs**:
   - Look for `[JWT Auth NEW]` logs
   - Verify groups are extracted correctly
   - Check if Admin role is determined

