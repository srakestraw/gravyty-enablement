# Google Drive OAuth Redirect URI Fix

## The Problem

You're getting `Error 400: redirect_uri_mismatch` because the redirect URI being sent to Google isn't configured in your Google Cloud Console OAuth client.

## Current Redirect URI

The app is sending this redirect URI:
```
http://localhost:5173/enablement/admin/integrations
```
(Note: Port may vary - check your browser console for the exact URL)

## Solution: Add Redirect URI to Google Cloud Console

### Step 1: Find Your OAuth Client

1. Go to Google Cloud Console:
   ```
   https://console.cloud.google.com/apis/credentials?project=680059166048
   ```

2. Find your **Google Drive OAuth client** (different from the Cognito sign-in client)
   - Look for a client with name like "Enablement Portal - Google Drive"
   - Or check the Client ID stored in AWS SSM: `/enablement-portal/google-drive/client-id`

### Step 2: Add Authorized Redirect URIs

Click **Edit** on your Google Drive OAuth client and add these redirect URIs:

**For Local Development:**
```
http://localhost:5173/enablement/admin/integrations
http://localhost:3000/enablement/admin/integrations
http://localhost:4000/enablement/admin/integrations
```

**For Production:**
```
https://your-domain.com/enablement/admin/integrations
```

### Step 3: Important Notes

- ✅ Use **HTTP** for localhost (Google allows this for localhost)
- ✅ Use **HTTPS** for production
- ✅ Include the full path `/enablement/admin/integrations`
- ✅ No trailing slash
- ✅ Add all ports you might use (5173 is Vite default, 3000 is common)

### Step 4: Save and Wait

1. Click **Save** in Google Cloud Console
2. Wait 1-2 minutes for changes to propagate
3. Try connecting Google Drive again

## Alternative: Use API Endpoint as Redirect URI

If you prefer Google to redirect directly to your API, you can:

1. Change the redirect URI in the code to use the API endpoint
2. Add the API endpoint to Google Cloud Console:
   ```
   http://localhost:4000/v1/integrations/google-drive/callback
   ```
3. Update the callback handler to accept GET requests with query parameters

However, the current implementation expects Google to redirect to the frontend, which then calls the API callback endpoint.

## Verify Configuration

After adding the redirect URIs, check:
1. Google Cloud Console shows the redirect URI in "Authorized redirect URIs"
2. The redirect URI matches exactly what's being sent (check browser console)
3. Wait 1-2 minutes after saving before retrying

