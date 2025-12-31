# OAuth Login Debugging Guide

## Current Issue
Google OAuth login flashes a URL but shows an error. The most common cause is a **redirect URI mismatch** between what the app sends and what's configured in Cognito.

## Step 1: Check Browser Console

Open your browser's developer console (F12) and look for the detailed error message. You should see:

```
[Auth] OAuth error received: { error, errorDescription, ... }
```

**Common errors:**
- `unauthorized_client` - Redirect URI mismatch
- `access_denied` - User cancelled or Google rejected
- `invalid_request` - Malformed request

## Step 2: Verify Current Origin

The app uses `window.location.origin` as the primary redirect URL. Check what port you're running on:

- **Vite default**: `http://localhost:5173`
- **Alternative**: `http://localhost:3000`

## Step 3: Check Cognito Callback URLs

You need to verify that Cognito has your localhost URL configured. Run:

```bash
# Check current callback URLs
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_s4q1vjkgD \
  --client-id 5p932tqfp5g5jh9h02bn6hskgm \
  --query 'UserPoolClient.CallbackURLs' \
  --output json
```

**Required URLs** (must include both with and without trailing slash):
- `http://localhost:5173`
- `http://localhost:5173/`
- `http://localhost:3000`
- `http://localhost:3000/`

## Step 4: Update Cognito Callback URLs

If your localhost URL is missing, update it:

```bash
# Run the update script
cd infra/scripts
./update-cognito-callback-urls.sh
```

Or manually update:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_s4q1vjkgD \
  --client-id 5p932tqfp5g5jh9h02bn6hskgm \
  --callback-urls '["http://localhost:5173","http://localhost:5173/","http://localhost:3000","http://localhost:3000/","https://enable.gravytylabs.com","https://enable.gravytylabs.com/"]' \
  --logout-urls '["http://localhost:5173","http://localhost:5173/","http://localhost:3000","http://localhost:3000/","https://enable.gravytylabs.com","https://enable.gravytylabs.com/"]'
```

## Step 5: Verify Environment Variables

Check your `.env.local` file:

```bash
cat apps/web/.env.local
```

Should have:
```
VITE_COGNITO_DOMAIN=enablement-portal-75874255
VITE_COGNITO_USER_POOL_ID=us-east-1_s4q1vjkgD
VITE_COGNITO_USER_POOL_CLIENT_ID=5p932tqfp5g5jh9h02bn6hskgm
VITE_COGNITO_REGION=us-east-1
```

## Step 6: Restart Web App

After updating Cognito or environment variables:

```bash
# Kill and restart
pkill -f vite
npm run dev:web
```

## Step 7: Check the OAuth Flow

1. Click "Sign In with Google"
2. Check the browser console for:
   - `[Auth] Primary redirect URI:` - This is what Amplify will send to Cognito
   - `[Auth] OAuth error received:` - The actual error from Cognito
3. Check the URL in the address bar when it flashes - copy the full URL
4. Look for the `error` and `error_description` parameters in the URL

## Common Solutions

### Solution 1: Redirect URI Mismatch
**Symptom**: `unauthorized_client` error  
**Fix**: Ensure Cognito callback URLs exactly match what the app sends (including trailing slash)

### Solution 2: Wrong Cognito Domain
**Symptom**: DNS error or domain not found  
**Fix**: Use `enablement-portal-75874255` (domain prefix) not `enable.gravytylabs.com` (custom domain)

### Solution 3: Google OAuth Not Configured
**Symptom**: Google login page shows error  
**Fix**: Verify Google OAuth credentials in Cognito Identity Provider settings

## Need More Help?

Check the browser console logs and share:
1. The `[Auth] OAuth error received:` object
2. The `[Auth] Primary redirect URI:` value
3. The full URL that flashes in the address bar



