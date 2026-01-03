# Google Auth Platform - OAuth Consent Screen Configuration

## New Interface Location

Google has updated their interface. The OAuth Consent Screen is now under **"Google Auth Platform"** instead of the old "APIs & Services" path.

## Steps to Configure Consent Screen

1. **You're currently on**: OAuth Overview page ✅

2. **Click on "Audience"** in the left navigation pane
   - This is where the OAuth consent screen configuration is located
   - You'll see settings for:
     - User type (External/Internal)
     - App information (name, logo, support email)
     - Scopes
     - Test users (if in Testing mode)

3. **Configure the settings**:
   - **User Type**: Select "External" (unless using Google Workspace)
   - **App Name**: "Enablement Portal"
   - **Support Email**: Your email
   - **Developer Contact**: Your email
   - **Scopes**: Ensure `email`, `profile`, `openid` are included
   - **Test Users**: If in Testing mode, add your email here

4. **Save and Publish**:
   - If in Testing mode, add your email to Test users
   - Or publish the app to make it available to all users

## Direct Link to Audience Settings

```
https://console.cloud.google.com/google-auth-platform/audience?project=680059166048
```

## Alternative: Old Interface

If you prefer the old interface, you can still access it at:
```
https://console.cloud.google.com/apis/credentials/consent?project=680059166048
```

## What to Check in Audience Settings

1. **Publishing Status**:
   - If "Testing" → Add your email to Test users
   - If "In production" → Should work for all users

2. **Scopes**:
   - Must include: `email`, `profile`, `openid`
   - These are the scopes Cognito requests

3. **App Information**:
   - App name should be set
   - Support email should be set
   - Developer contact should be set

## Common Issue: "invalid_client" Error

If you're still getting "invalid_client" error after configuring:

1. **Check Test Users** (if in Testing mode):
   - Go to Audience → Test users section
   - Add your Google email address
   - Save

2. **Check Scopes**:
   - Ensure `email`, `profile`, `openid` are in the scopes list
   - These match what Cognito requests

3. **Wait for Propagation**:
   - Changes can take 1-2 minutes to propagate
   - Clear browser cache and try again


