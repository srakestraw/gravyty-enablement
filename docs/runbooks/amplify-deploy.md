# AWS Amplify Deployment Runbook

## Prerequisites

- CDK stack deployed (API Gateway, Cognito, DynamoDB, S3)
- GitHub repository with the codebase
- AWS account with Amplify access
- Admin AWS credentials configured

## Step-by-Step Deployment

### Step 1: Deploy CDK Stack with CORS Configuration

Before deploying to Amplify, ensure your CDK stack allows the Amplify domain in CORS:

```bash
# Set WEB_ALLOWED_ORIGINS before deploying (you'll get the Amplify domain after first deploy)
# For now, deploy without it (defaults to localhost for dev)
export AWS_PROFILE=admin
npm run cdk:deploy
```

**Note:** After you get your Amplify domain URL (Step 4), you'll need to redeploy CDK with `WEB_ALLOWED_ORIGINS` set.

### Step 2: Get Environment Variables from CDK Stack

Get all required environment variables in Amplify format:

```bash
# From project root
./infra/scripts/update-web-env-from-cdk.sh --amplify-format
```

This outputs:
```
VITE_API_BASE_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=enablement-portal-xxxxxxx.auth.us-east-1.amazoncognito.com
VITE_AUTH_MODE=cognito
```

**Save these values** - you'll need them in Step 5.

### Step 3: Create Amplify App

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** > **"Host web app"**
3. Select **"GitHub"** as your source
4. Authorize AWS Amplify to access your GitHub account (if first time)
5. Select your repository
6. Select the branch (e.g., `main` or `master`)

### Step 4: Configure Build Settings

1. **App name**: Enter a name (e.g., `enablement-portal`)
2. **Build settings**: Amplify should auto-detect `amplify.yml` in `apps/web/`
   - If not detected, manually set:
     - **Build path**: `apps/web/amplify.yml`
     - **Base directory**: Leave empty (or set to repo root)
3. Click **"Next"**
4. Review settings and click **"Save and deploy"**

**First deployment will take 5-10 minutes.**

### Step 5: Get Amplify Domain URL

After the first deployment completes:

1. In Amplify Console, click on your app
2. Find the **App URL** (e.g., `https://main.xxxxxxxxx.amplifyapp.com`)
3. **Copy this URL** - you'll need it for CORS and Cognito configuration

### Step 6: Add Environment Variables

1. In Amplify Console, go to **App Settings** > **Environment variables**
2. Click **"Manage variables"**
3. Add each variable from Step 2:

   ```
   VITE_API_BASE_URL = https://xxxxx.execute-api.us-east-1.amazonaws.com
   VITE_COGNITO_REGION = us-east-1
   VITE_COGNITO_USER_POOL_ID = us-east-1_xxxxxxxxx
   VITE_COGNITO_USER_POOL_CLIENT_ID = xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_COGNITO_DOMAIN = enablement-portal-xxxxxxx.auth.us-east-1.amazoncognito.com
   VITE_AUTH_MODE = cognito
   ```

4. Click **"Save"**
5. Amplify will automatically trigger a new build with the environment variables

### Step 7: Update CDK Stack CORS Configuration

Update the CDK stack to allow your Amplify domain:

```bash
# Set WEB_ALLOWED_ORIGINS with your Amplify domain
# Replace with your actual Amplify URL from Step 5
export WEB_ALLOWED_ORIGINS="https://main.xxxxxxxxx.amplifyapp.com"
export AWS_PROFILE=admin

# Deploy updated CORS configuration
npm run cdk:deploy
```

This updates:
- API Gateway CORS allowed origins
- S3 bucket CORS allowed origins
- Cognito callback URLs (automatically includes Amplify domain)

**Deployment time:** ~2-3 minutes

### Step 8: Update Cognito Callback URLs

The CDK stack automatically includes your Amplify domain in Cognito callback URLs when `WEB_ALLOWED_ORIGINS` is set. However, if you need to manually verify or add additional URLs:

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Get current client config
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $(aws cloudformation describe-stacks \
    --stack-name EnablementPortalStack \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text) \
  --query 'UserPoolClient.CallbackURLs' \
  --output json
```

The Amplify domain should be included automatically after Step 7.

### Step 9: Redeploy Amplify App

After updating CORS and Cognito:

1. In Amplify Console, go to your app
2. Click **"Redeploy this version"** (or push a new commit)
3. Wait for deployment to complete (~5 minutes)

### Step 10: Verify Deployment

1. **Open Amplify App URL** in a browser
2. **Test Google Sign-In**:
   - Click "Sign In"
   - Should redirect to Cognito Hosted UI
   - Sign in with Google
   - Should redirect back to Amplify app
   - Should see authenticated state

3. **Test API Calls**:
   - Open browser DevTools > Network tab
   - Navigate to content list page
   - Check for CORS errors (should be none)
   - Verify API calls succeed with JWT token

4. **Check Console for Errors**:
   - Open browser DevTools > Console
   - Should see no CORS or authentication errors

## Troubleshooting

### Build Fails: "Cannot find module"

**Issue:** Amplify can't find workspace packages

**Solution:**
- Ensure `amplify.yml` is in `apps/web/` directory
- Verify build commands use `npm run build --workspace=...`
- Check that `package.json` has workspaces configured

### CORS Errors in Browser

**Issue:** API Gateway rejects requests from Amplify domain

**Solution:**
1. Verify `WEB_ALLOWED_ORIGINS` includes your Amplify domain
2. Redeploy CDK stack: `npm run cdk:deploy`
3. Check API Gateway CORS config in AWS Console
4. Ensure Amplify domain matches exactly (no trailing slash in CORS config)

### Google Sign-In Redirects to Wrong URL

**Issue:** Cognito callback URL doesn't match Amplify domain

**Solution:**
1. Verify Cognito callback URLs include Amplify domain:
   ```bash
   # Get callback URLs (see Step 8)
   ```
2. Ensure Amplify domain is in `WEB_ALLOWED_ORIGINS` before CDK deploy
3. Redeploy CDK stack to update Cognito config

### Environment Variables Not Available

**Issue:** `import.meta.env.VITE_*` variables are undefined

**Solution:**
1. Verify variables are set in Amplify Console (Step 6)
2. Ensure variable names start with `VITE_`
3. Redeploy Amplify app after adding variables
4. Check build logs for variable injection

### "Access Denied" Errors from API

**Issue:** JWT token not being sent or invalid

**Solution:**
1. Verify Cognito configuration in `auth.ts`
2. Check that `VITE_COGNITO_*` variables are correct
3. Verify user is signed in (check Amplify auth state)
4. Check API Gateway logs for JWT validation errors

## Verification Checklist

- [ ] Amplify app builds successfully
- [ ] Environment variables are set in Amplify Console
- [ ] CDK stack deployed with `WEB_ALLOWED_ORIGINS` set
- [ ] Cognito callback URLs include Amplify domain
- [ ] Google sign-in works end-to-end
- [ ] API calls succeed (no CORS errors)
- [ ] Content list page loads
- [ ] User can navigate authenticated pages

## Related Documentation

- [Production Smoke Test](./prod-smoke.md)
- [CDK Deployment](./cdk-deployment.md)
- [Local Development](./local-dev.md)
- [API Contract](../architecture/api-contract.md)

