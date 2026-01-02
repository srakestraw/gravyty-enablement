# Production API URL Fix

## Issue
Production app is failing with `ERR_NAME_NOT_RESOLVED` errors because `VITE_API_BASE_URL` is set to an incorrect/old API Gateway URL.

**Wrong URL (current):** `uauj5lzb7g.execute-api.us-east-1.amazonaws.com`  
**Correct URL:** `https://fjzam40ana.execute-api.us-east-1.amazonaws.com/`

## Root Cause
The Amplify environment variable `VITE_API_BASE_URL` points to a non-existent or deleted API Gateway endpoint.

## Solution

### Step 1: Update Amplify Environment Variable

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app
3. Navigate to: **App settings** → **Environment variables**
4. Click: **Manage variables**
5. Find `VITE_API_BASE_URL` and update it to:
   ```
   https://fjzam40ana.execute-api.us-east-1.amazonaws.com/
   ```
6. Click **Save** (this will trigger a new build)

### Step 2: Verify All Environment Variables

Ensure these are set correctly:

```
VITE_API_BASE_URL=https://fjzam40ana.execute-api.us-east-1.amazonaws.com/
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xBNZh7TaB
VITE_COGNITO_USER_POOL_CLIENT_ID=18b68j5jbm61pthstbk3ngeaa3
VITE_COGNITO_DOMAIN=enablement-portal-75874255
VITE_AUTH_MODE=cognito
```

### Step 3: Monitor Deployment

After saving, Amplify will automatically:
- Trigger a new build
- Deploy the updated configuration
- The app will use the correct API Gateway URL

## Verification

After deployment completes, verify:
1. No more `ERR_NAME_NOT_RESOLVED` errors in browser console
2. API requests succeed (check Network tab)
3. App functionality works as expected

## Getting Updated Values

To get the latest values from CDK stack:

```bash
./infra/scripts/update-web-env-from-cdk.sh --amplify-format
```

This will output all environment variables in Amplify format.

## Date
Created: 2025-01-27

