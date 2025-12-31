# Fix Amplify SSM Parameter Access Issue

## Problem

Build logs show:
```
[WARNING]: !Failed to set up process.env.secrets
```

This warning occurs because Amplify automatically tries to retrieve SSM parameters from `/amplify/{app-id}/{branch}/` but the service role lacks permissions.

## Quick Fix

**Option 1: Automatic fix (recommended)**

Run the service role creation script (handles both creating role and updating app):

```bash
# Option 1: Set app ID as environment variable
export AMPLIFY_APP_ID=d1cf513hn1tkd1  # Your app ID from build logs
./scripts/create-amplify-service-role.sh

# Option 2: Enter app ID when prompted (script will prompt if not set)
./scripts/create-amplify-service-role.sh
```

**Option 2: Fix existing role**

If you already have a service role configured:

```bash
export AMPLIFY_APP_ID=d1cf513hn1tkd1
./scripts/fix-amplify-ssm-permissions.sh
```

## Finding Your Amplify App ID

1. **From build logs**: Look for the SSM path in the warning:
   ```
   SSM params {"Path":"/amplify/d1cf513hn1tkd1/main/"}
   ```
   The app ID is `d1cf513hn1tkd1` (the part after `/amplify/`)

2. **From Amplify Console**:
   - Go to AWS Amplify Console
   - Select your app
   - Go to **App settings** → **General**
   - Find **App ID** in the details

3. **From AWS CLI**:
   ```bash
   aws amplify list-apps --query 'apps[*].[name,appId]' --output table
   ```

## Manual Fix (if script doesn't work)

1. **Get your Amplify App ID** (see above)

2. **Find the Amplify service role**:
   ```bash
   aws amplify get-app --app-id YOUR_APP_ID --query 'app.serviceRoleArn' --output text
   ```

3. **Go to IAM Console**:
   - Navigate to Roles
   - Find the role from step 2
   - Click "Add permissions" → "Create inline policy"
   - Use JSON editor and paste:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "AllowSSMParameterAccess",
       "Effect": "Allow",
       "Action": [
         "ssm:GetParameter",
         "ssm:GetParameters",
         "ssm:GetParametersByPath"
       ],
       "Resource": "arn:aws:ssm:*:*:parameter/amplify/YOUR_APP_ID/*"
     }]
   }
   ```
   Replace `YOUR_APP_ID` with your actual app ID.

4. **Save the policy** and trigger a new Amplify build

## Verify Fix

After applying the fix:

1. Go to Amplify Console
2. Trigger a new build (or push a commit)
3. Check build logs - the SSM warning should be gone or the build should proceed successfully

## Notes

- **If using Amplify Console environment variables** (not SSM): The warning may still appear but won't block the build. However, fixing permissions prevents potential issues.

- **If using SSM parameters**: Make sure parameters exist at `/amplify/{app-id}/{branch}/` path in SSM Parameter Store.

- **After fixing**: Wait a few seconds for IAM changes to propagate before triggering a new build.

## Related Documentation

- [Amplify Console Setup Guide](./docs/runbooks/amplify-console-setup.md)
- [Amplify Deployment Runbook](./docs/runbooks/amplify-deploy.md)

