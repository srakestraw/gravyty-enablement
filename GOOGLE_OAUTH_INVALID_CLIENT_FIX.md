# Google OAuth "invalid_client" Error - Fix Guide

## ✅ Configuration Fixed

The Cognito Identity Provider has been updated with the correct attribute mappings including `given_name` and `family_name`.

**Current Configuration:**
- Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
- Scopes: `openid email profile`
- Attribute Mappings: email, email_verified, name, picture, username, **given_name**, **family_name**
- Redirect URI: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## 🔍 Troubleshooting Steps

Since you're still getting `invalid_client` error, check these:

### 1. Verify Redirect URI in Google Cloud Console

**Go to:** https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048

**Check:**
- ✅ "Authorized redirect URIs" contains exactly:
  ```
  https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
  ```
- ✅ Uses HTTPS (not HTTP)
- ✅ Includes `/oauth2/idpresponse` path
- ✅ No trailing slash
- ✅ Matches exactly (case-sensitive)

### 2. Verify Client Secret Matches

The Client Secret in Cognito must match Google Cloud Console exactly.

**To verify:**
1. Go to Google Cloud Console credentials page
2. Click on your OAuth client ID
3. Check the Client Secret
4. If it doesn't match, update it using:
   ```bash
   cd infra/scripts && ./update-google-credentials.sh us-east-1_xBNZh7TaB YOUR_CLIENT_ID YOUR_CLIENT_SECRET
   ```

### 3. Check OAuth Consent Screen Configuration

**Go to:** https://console.cloud.google.com/apis/credentials/consent?project=680059166048

**Verify:**
- ✅ Consent screen is configured (not "Not configured")
- ✅ User Type is set (External or Internal)
- ✅ App name is set
- ✅ User support email is set
- ✅ Developer contact is set
- ✅ Scopes include: `email`, `profile`, `openid`

**If app is in Testing mode:**
- ✅ Your email address is in "Test users" list
- ✅ Only test users can sign in until app is published

### 4. App Verification Status

The image you shared shows "Advanced Settings" mentioning app verification. 

**Check:**
- Go to: https://console.cloud.google.com/apis/credentials/consent?project=680059166048
- Check if there are any verification warnings
- For basic OAuth with email/profile scopes, verification is typically not required
- However, if Google shows verification warnings, you may need to:
  - Complete the OAuth consent screen setup
  - Submit for verification (if required for your use case)

### 5. Client Status

**Verify the OAuth client is active:**
1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048
2. Find your OAuth client ID
3. Ensure it shows "Active" status
4. If disabled, enable it

### 6. Clear Browser Cache and Try Again

After making any changes:
1. Clear browser cache and cookies
2. Wait 1-2 minutes for Google's changes to propagate
3. Try signing in again

## 🔧 Quick Fix Script

If you need to re-run the fix:

```bash
cd infra/scripts
./fix-google-oauth-with-names.sh us-east-1_xBNZh7TaB
```

## 📋 Verification Commands

```bash
# Check Cognito Identity Provider
aws cognito-idp describe-identity-provider \
  --user-pool-id us-east-1_xBNZh7TaB \
  --provider-name Google

# Check User Pool Client supports Google
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_xBNZh7TaB \
  --client-id 18b68j5jbm61pthstbk3ngeaa3 \
  --query 'UserPoolClient.SupportedIdentityProviders'
```

## 🎯 Most Likely Causes

Based on the error and your setup:

1. **OAuth Consent Screen not fully configured** - Most common cause
2. **App in Testing mode without test users** - Your email must be in test users list
3. **Client Secret mismatch** - Secret in Cognito doesn't match Google Console
4. **Redirect URI typo** - Even a small typo will cause this error

## ✅ Next Steps

1. **Verify OAuth Consent Screen** is fully configured
2. **Add your email to test users** if app is in testing mode
3. **Double-check the redirect URI** matches exactly
4. **Wait 1-2 minutes** after any changes
5. **Clear browser cache** and try again

If the issue persists, check the browser console for the exact error message and compare the redirect URI in the error with what's configured in Google Cloud Console.

