# Google OAuth Troubleshooting Guide

## Current Status ✅

- ✅ Google Identity Provider configured in Cognito
- ✅ User Pool Client supports Google
- ✅ Redirect URI exists in Google Cloud Console
- ✅ Client ID and Secret match

## If Still Getting "invalid_client" Error

Since the redirect URI is already configured, check these:

### 1. OAuth Consent Screen Configuration

The OAuth consent screen must be configured before OAuth clients work.

1. **Go to OAuth Consent Screen**:
   ```
   https://console.cloud.google.com/apis/credentials/consent?project=680059166048
   ```

2. **Verify Configuration**:
   - User Type: External (or Internal if using Google Workspace)
   - App name: Set (e.g., "Enablement Portal")
   - User support email: Your email
   - Developer contact: Your email
   - **Scopes**: Should include `email`, `profile`, `openid`

3. **If not configured, configure it**:
   - Click "Configure Consent Screen"
   - Fill in required fields
   - Add scopes: `email`, `profile`, `openid`
   - Save

### 2. Test Users (if using External app)

If your OAuth consent screen is set to "External" and in testing mode:

1. Go to OAuth Consent Screen
2. Scroll to "Test users"
3. Add your Google email address
4. Save

### 3. Client Restrictions

Check if your OAuth client has restrictions that might block Cognito:

1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048
2. Click on your OAuth client ID
3. Check "Authorized JavaScript origins" - should be empty or include Cognito domain
4. Check "Authorized redirect URIs" - should include:
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

### 4. Verify Client is Active

1. In Google Cloud Console credentials page
2. Check that your OAuth client shows "Active" status
3. If disabled, enable it

### 5. Check Browser Console for Exact Error

When you try to sign in:

1. Open browser console (F12)
2. Click "Sign In with Google"
3. Look for the exact error message
4. Check the Network tab for the OAuth request
5. Look at the `redirect_uri` parameter in the request

### 6. Verify Cognito Domain

Make sure the Cognito domain is correct:

```bash
aws cognito-idp describe-user-pool-domain \
  --domain enablement-portal-75874255
```

Should return the domain configuration.

### 7. Test OAuth Flow Manually

Try accessing the Cognito hosted UI directly:

```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/authorize?client_id=18b68j5jbm61pthstbk3ngeaa3&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:5173&identity_provider=Google
```

Replace `http://localhost:5173` with your actual localhost URL.

## Common Issues

### Issue: OAuth Consent Screen Not Configured
**Symptom**: `invalid_client` error
**Fix**: Configure OAuth consent screen (see step 1 above)

### Issue: App in Testing Mode Without Test Users
**Symptom**: `access_denied` or `invalid_client` error
**Fix**: Add your email to test users in OAuth consent screen

### Issue: Wrong Project
**Symptom**: `invalid_client` error
**Fix**: Verify you're using the correct Google Cloud project (680059166048)

### Issue: Client Secret Mismatch
**Symptom**: `invalid_client` error
**Fix**: Verify client secret matches in both Cognito and Google Cloud Console

## Verification Commands

```bash
# Check Cognito Identity Provider
aws cognito-idp describe-identity-provider \
  --user-pool-id us-east-1_xBNZh7TaB \
  --provider-name Google

# Check User Pool Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_xBNZh7TaB \
  --client-id 18b68j5jbm61pthstbk3ngeaa3

# Check Cognito Domain
aws cognito-idp describe-user-pool-domain \
  --domain enablement-portal-75874255
```

## Next Steps

1. **Verify OAuth Consent Screen is configured** (most common issue)
2. **Add test users if app is in testing mode**
3. **Check browser console for exact error**
4. **Try the manual OAuth URL test**


