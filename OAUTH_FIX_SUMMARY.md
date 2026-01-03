# OAuth Login Fix Summary

## Issue Resolved ✅

Google OAuth login is now working correctly.

## What Was Fixed

### 1. Cognito Domain Configuration
- **Problem**: `.env.local` had incorrect domain (`enable.gravytylabs.com` - custom domain that doesn't exist)
- **Fix**: Updated to use Cognito domain prefix: `enablement-portal-75874255`
- **Result**: App now constructs correct domain: `enablement-portal-75874255.auth.us-east-1.amazoncognito.com`

### 2. Cognito OAuth Configuration
- **Problem**: OAuth flows were not enabled on the User Pool Client
- **Fix**: Enabled OAuth flows:
  - `AllowedOAuthFlows`: `code` (authorization code flow)
  - `AllowedOAuthScopes`: `openid`, `email`, `profile`
  - `AllowedOAuthFlowsUserPoolClient`: `true`
  - `SupportedIdentityProviders`: `Google`, `COGNITO`

### 3. Cognito Callback URLs
- **Problem**: Callback URLs needed to include localhost variants
- **Fix**: Updated callback URLs to include:
  - `http://localhost:3000` and `http://localhost:3000/`
  - `http://localhost:5173` and `http://localhost:5173/`
  - Production domain URLs

### 4. Google Cloud Console
- **Status**: Already had the correct redirect URI configured:
  - `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Key Configuration Files

### `.env.local` (apps/web/.env.local)
```
VITE_COGNITO_DOMAIN=enablement-portal-75874255
VITE_COGNITO_USER_POOL_ID=us-east-1_s4q1vjkgD
VITE_COGNITO_USER_POOL_CLIENT_ID=5p932tqfp5g5jh9h02bn6hskgm
VITE_COGNITO_REGION=us-east-1
VITE_API_BASE_URL=http://localhost:4000
```

## Commands Used

1. **Update Cognito Callback URLs**:
   ```bash
   cd infra/scripts
   export AWS_PROFILE=admin
   ./update-cognito-callback-urls.sh
   ```

2. **Enable OAuth Flows**:
   ```bash
   export AWS_PROFILE=admin
   aws cognito-idp update-user-pool-client \
     --user-pool-id us-east-1_s4q1vjkgD \
     --client-id 5p932tqfp5g5jh9h02bn6hskgm \
     --allowed-o-auth-flows code \
     --allowed-o-auth-scopes '["openid","email","profile"]' \
     --allowed-o-auth-flows-user-pool-client \
     --supported-identity-providers '["Google","COGNITO"]'
   ```

## OAuth Flow (Now Working)

1. User clicks "Sign In with Google" → App redirects to Cognito
2. Cognito redirects to Google → User authenticates
3. Google redirects back to Cognito → `https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
4. Cognito processes auth → Redirects to app (`http://localhost:3000` or `http://localhost:5173`)
5. App handles OAuth callback → User is authenticated ✅

## Future Reference

If OAuth stops working:
1. Check Cognito User Pool Client OAuth settings
2. Verify callback URLs match the app's origin
3. Ensure Google Cloud Console has Cognito redirect URI
4. Check `.env.local` has correct Cognito domain prefix (not custom domain)




