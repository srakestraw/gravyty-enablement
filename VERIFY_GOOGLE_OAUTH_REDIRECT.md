# Google OAuth Redirect URI Verification

## Required Configuration

For OAuth to work, Google Cloud Console **must** have this exact redirect URI:

```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

## Quick Verification Steps

### Step 1: Open Google Cloud Console

**Direct Link to Your OAuth Client:**
```
https://console.cloud.google.com/apis/credentials/oauthclient/680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com?project=680059166048
```

Or navigate manually:
1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048
2. Find OAuth 2.0 Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
3. Click **Edit** (pencil icon)

### Step 2: Check "Authorized redirect URIs"

Look for this exact URI in the list:
```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**Important Details:**
- ✅ Must use **HTTPS** (not HTTP)
- ✅ Must include `/oauth2/idpresponse` path
- ✅ Must **NOT** have trailing slash
- ✅ Must match **EXACTLY** (case-sensitive, no typos)

### Step 3: If Missing, Add It

1. Click **"+ ADD URI"** button
2. Paste this exact URI:
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
3. Click **"SAVE"**
4. Wait 1-2 minutes for changes to propagate

## Current Cognito Configuration

**Pool:** `us-east-1_xBNZh7TaB`  
**Domain:** `enablement-portal-75874255`  
**Full Domain:** `enablement-portal-75874255.auth.us-east-1.amazoncognito.com`  
**Client ID:** `18b68j5jbm61pthstbk3ngeaa3`  
**Google Provider:** ✅ Configured

## How OAuth Flow Works

1. **User clicks "Sign In with Google"** → Your app (`localhost:5173`)
2. **App redirects to Cognito** → `enablement-portal-75874255.auth.us-east-1.amazoncognito.com`
3. **Cognito redirects to Google** → Google checks if redirect URI is authorized
4. **Google redirects back to Cognito** → `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse` ⚠️ **This must be in Google's authorized list**
5. **Cognito processes auth** → Redirects back to your app

## Common Issues

### Issue: "invalid_client" or "unauthorized_client" Error
**Cause:** Redirect URI not in Google Cloud Console  
**Fix:** Add the exact URI above to Google's authorized redirect URIs

### Issue: "redirect_uri_mismatch" Error
**Cause:** URI in Google Console doesn't match what Cognito is sending  
**Fix:** Ensure exact match (no trailing slash, correct domain, HTTPS)

### Issue: OAuth Works But User Not Created
**Cause:** Different issue (Cognito configuration)  
**Fix:** Check Cognito identity provider configuration

## Verification Checklist

- [ ] Google OAuth Client ID exists: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
- [ ] Redirect URI exists in Google Console: `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- [ ] Cognito User Pool has Google identity provider configured
- [ ] Cognito User Pool Client supports Google (`SupportedIdentityProviders` includes `Google`)
- [ ] OAuth consent screen is configured in Google Cloud Console

## Test After Configuration

1. Clear browser cache/cookies
2. Try signing in with Google
3. Check browser console for any errors
4. Verify user is created in Cognito User Pool

