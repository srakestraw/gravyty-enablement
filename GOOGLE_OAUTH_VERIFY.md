# Google OAuth Verification Checklist

## Current Configuration

✅ **Google Identity Provider in Cognito**: Configured
- Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
- Status: Active

## ⚠️ CRITICAL: Google Cloud Console Configuration

The error "invalid_client" (401) means Google doesn't recognize the redirect URI that Cognito is trying to use.

### Step 1: Verify Redirect URI in Google Cloud Console

1. **Go to Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials?project=680059166048
   ```

2. **Find your OAuth 2.0 Client ID**:
   - Client ID: `680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com`
   - Click **Edit** (pencil icon)

3. **Check "Authorized redirect URIs" section**

4. **MUST HAVE THIS EXACT URI** (case-sensitive, no typos):
   ```
   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

5. **Important Details**:
   - ✅ Must use **HTTPS** (not HTTP)
   - ✅ Must include `/oauth2/idpresponse` path
   - ✅ Must NOT have trailing slash
   - ✅ Must match EXACTLY (no extra spaces, correct domain)

6. **If missing, add it and click "Save"**

### Step 2: Wait for Propagation

After saving in Google Cloud Console:
- Wait 1-2 minutes for changes to propagate
- Clear browser cache/cookies
- Try signing in again

### Step 3: Verify Cognito User Pool Client

Check that Google is in the supported identity providers:

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_s4q1vjkgD \
  --client-id 18b68j5jbm61pthstbk3ngeaa3 \
  --query 'UserPoolClient.SupportedIdentityProviders' \
  --output json
```

Should include: `["Google", "COGNITO"]`

## Common Issues

### Issue 1: Redirect URI Not in Google Cloud Console
**Symptom**: `invalid_client` error
**Fix**: Add the exact redirect URI above to Google Cloud Console

### Issue 2: Wrong Redirect URI Format
**Symptom**: `invalid_client` or `unauthorized_client` error
**Fix**: Ensure the URI is exactly:
```
https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Issue 3: HTTP Instead of HTTPS
**Symptom**: `invalid_client` error
**Fix**: Must use HTTPS, not HTTP

### Issue 4: Missing Trailing Path
**Symptom**: `invalid_client` error
**Fix**: Must include `/oauth2/idpresponse` at the end

## Testing

1. Open browser console (F12)
2. Click "Sign In with Google"
3. Check console for error messages
4. Look for the exact redirect URI being used
5. Compare with what's configured in Google Cloud Console

## Debug Commands

```bash
# Verify Google Identity Provider
aws cognito-idp describe-identity-provider \
  --user-pool-id us-east-1_s4q1vjkgD \
  --provider-name Google

# Check User Pool Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_s4q1vjkgD \
  --client-id 18b68j5jbm61pthstbk3ngeaa3
```


