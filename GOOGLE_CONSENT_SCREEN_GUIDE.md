# Google OAuth Consent Screen Configuration Guide

## If You Don't See "Configure Consent Screen" Button

This usually means one of these scenarios:

### Scenario 1: Consent Screen Already Configured ✅

If the consent screen is already configured, you'll see:
- **"Publish App"** button (if in Testing mode)
- **"Add Users"** button (if in Testing mode)
- **Published** status
- App information displayed

**Action**: If it's in Testing mode, add your email to "Test users" section.

### Scenario 2: Need to Enable APIs First 🔧

The OAuth Consent Screen requires certain APIs to be enabled.

**Enable required APIs:**
```bash
gcloud services enable oauth2.googleapis.com --project=680059166048
gcloud services enable cloudresourcemanager.googleapis.com --project=680059166048
```

### Scenario 3: Wrong Project or Permissions ⚠️

Make sure you're:
- Looking at the correct project: `680059166048`
- Have the right permissions (Project Owner or Editor)
- Using the correct Google account

**Check current project:**
```bash
gcloud config get-value project
```

**Set correct project:**
```bash
gcloud config set project 680059166048
```

## Direct Links to Check

1. **OAuth Consent Screen**:
   ```
   https://console.cloud.google.com/apis/credentials/consent?project=680059166048
   ```

2. **OAuth Clients**:
   ```
   https://console.cloud.google.com/apis/credentials?project=680059166048
   ```

3. **APIs & Services Dashboard**:
   ```
   https://console.cloud.google.com/apis/dashboard?project=680059166048
   ```

## What You Should See

### If Consent Screen is NOT Configured:
- Big button: **"CONFIGURE CONSENT SCREEN"**
- Text explaining what the consent screen is

### If Consent Screen IS Configured:
- App name, logo, support email displayed
- Publishing status (Testing/In production)
- "Edit App" button
- "Publish App" button (if in Testing)
- "Add Users" button (if in Testing)

## Common Issue: "invalid_client" Error

Even if the consent screen appears configured, the "invalid_client" error can occur if:

1. **App is in Testing mode** but your email isn't in Test users
   - **Fix**: Add your email to Test users section

2. **App is in Testing mode** and you're trying to use it with external users
   - **Fix**: Either add all users to Test users, or publish the app

3. **Scopes are missing**
   - **Fix**: Ensure `email`, `profile`, `openid` scopes are added

## Quick Fix Commands

```bash
# Enable OAuth2 API
gcloud services enable oauth2.googleapis.com --project=680059166048

# Check enabled APIs
gcloud services list --enabled --project=680059166048 --filter="oauth2"

# Open consent screen page
open "https://console.cloud.google.com/apis/credentials/consent?project=680059166048"
```

## Still Not Working?

If you still don't see the Configure Consent Screen button:

1. **Check project number vs project ID**:
   - Project ID: `g-talent-network` (or similar)
   - Project Number: `680059166048`
   - Make sure you're using the project that contains the OAuth client

2. **Try accessing via project selector**:
   - Click the project dropdown at the top
   - Search for project number: `680059166048`
   - Select it
   - Then go to APIs & Services > OAuth consent screen

3. **Check IAM permissions**:
   ```bash
   gcloud projects get-iam-policy 680059166048 --flatten="bindings[].members" --filter="bindings.members:user:$(gcloud config get-value account)"
   ```
   You should have `roles/owner` or `roles/editor` role.

