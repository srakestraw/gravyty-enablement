# Google OAuth Configuration Fix

## The Problem

You're getting `unauthorized_client` error because **Google Cloud Console** doesn't have the Cognito redirect URI configured.

## The Solution

Google needs to know where Cognito will receive the OAuth callback. This is different from the web app callback URLs.

## Step 1: Get Your Cognito Domain

Your Cognito domain is:
```
enablement-portal-75874255.auth.us-east-1.amazoncognito.com
```

## Step 2: Configure Google Cloud Console

1. **Go to Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials?project=680059166048
   ```

2. **Find your OAuth 2.0 Client ID**:
   - Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
   - Click **Edit** (pencil icon)

3. **Add Authorized redirect URI**:
   Under "Authorized redirect URIs", add:
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

4. **Important**: 
   - Use **HTTPS** (not HTTP)
   - Include the `/oauth2/idpresponse` path
   - No trailing slash

5. **Click "Save"**

## Step 3: Verify Configuration

After saving, your Google OAuth client should have these redirect URIs:
- `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse` ✅ (Required)
- Any other redirect URIs you had before (can keep for compatibility)

## How OAuth Flow Works

1. **User clicks "Sign In with Google"** in your app (`localhost:3000`)
2. **App redirects to Cognito**: `enablement-portal-75874255.auth.us-east-1.amazoncognito.com`
3. **Cognito redirects to Google**: Google checks if redirect URI matches
4. **Google redirects back to Cognito**: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
5. **Cognito processes auth and redirects to your app**: `http://localhost:3000`

## Why This Fixes It

The `unauthorized_client` error happens at step 3 - Google doesn't recognize the redirect URI that Cognito is trying to use. Once you add the Cognito domain to Google's authorized redirect URIs, Google will accept the OAuth request from Cognito.

## After Updating

1. Wait 1-2 minutes for Google's changes to propagate
2. Try signing in again
3. The error should be resolved

## Troubleshooting

If you still get errors after updating:

1. **Check the exact redirect URI**:
   - Look at the browser console when clicking "Sign In"
   - Find the Google OAuth URL in the Network tab
   - Verify the `redirect_uri` parameter matches exactly

2. **Verify Cognito domain**:
   ```bash
   export AWS_PROFILE=admin
   aws cognito-idp describe-user-pool-domain --domain enablement-portal-75874255
   ```

3. **Check Google Cloud Console**:
   - Make sure the redirect URI is saved (no typos)
   - Verify HTTPS is used
   - Check for trailing slashes (should NOT have one)



