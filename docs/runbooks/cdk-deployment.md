# CDK Deployment Runbook

## Prerequisites

- AWS CLI installed and configured
- Admin AWS credentials (for initial deployment)
- Node.js 18+ and npm installed
- CDK CLI available (via npx)

## Step-by-Step Deployment

### Step 1: Configure Admin AWS Profile

The IAM user `enablement-portal-api` is designed for runtime API access only. For CDK deployment, you need admin credentials.

```bash
# Configure admin profile
aws configure --profile admin
```

You'll be prompted for:
- **AWS Access Key ID**: Your admin access key
- **AWS Secret Access Key**: Your admin secret key
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

### Step 2: Switch to Admin Profile

```bash
# Set environment variable
export AWS_PROFILE=admin

# Verify credentials
aws sts get-caller-identity
```

You should see a different user/role (not `enablement-portal-api`).

### Step 3: Deploy CDK Stack

```bash
# From project root
# Optional: Set WEB_ALLOWED_ORIGINS for production CORS (comma-separated)
# Example: export WEB_ALLOWED_ORIGINS="https://main.xxxxx.amplifyapp.com,https://enable.gravytylabs.com"
# If not set, defaults to localhost origins for development
npm run cdk:deploy
```

**What gets deployed:**
- ✅ Cognito User Pool + Groups (Viewer, Contributor, Approver, Admin)
- ✅ Cognito Domain (hosted UI)
- ✅ DynamoDB tables: `content_registry`, `notifications`, `subscriptions`, `events`
- ✅ S3 bucket: `enablement-content`
- ✅ SSM Parameters for Google OAuth credentials
- ⚠️ Lambda + API Gateway (skipped until API is built)

**Deployment time:** ~5-10 minutes

### Step 4: Get Deployment Outputs

After successful deployment, get important values:

```bash
# Get all outputs
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs' \
  --output table

# Get specific outputs
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text
```

### Step 5: Configure Google OAuth

After deployment, configure Google OAuth credentials:

```bash
./infra/scripts/configure-google-oauth-quick.sh
```

This script:
- Gets Cognito domain from CDK stack
- Stores Google OAuth credentials in SSM Parameter Store
- Updates Cognito Identity Provider
- Shows you the redirect URI to add in Google Console

**Pre-filled credentials:**
- Client ID: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- Client Secret: `YOUR_GOOGLE_CLIENT_SECRET`

### Step 6: Add Redirect URI in Google Console

1. Go to: https://console.cloud.google.com/apis/credentials?project=YOUR_GOOGLE_PROJECT_ID
2. Click on your OAuth client ("Enablement Portal")
3. Under "Authorized redirect URIs", click "ADD URI"
4. Add: `https://<cognito-domain>/oauth2/idpresponse`
   - Example: `https://enablement-portal-12345678.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
5. Click "SAVE"

### Step 7: Update Environment Files

**Update API environment:**
```bash
./infra/scripts/update-api-env-from-cdk.sh
```

**Update web app environment:**
```bash
./infra/scripts/update-web-env-from-cdk.sh
```

### Step 8: Assign Users to Cognito Groups

After users sign in with Google, assign them to groups:

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Add user to Contributor group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --group-name Contributor
```

Available groups:
- `Viewer` - View-only access
- `Contributor` - Can create/edit content
- `Approver` - Can approve/deprecate content
- `Admin` - Full access

## Troubleshooting

### "Access Denied" Errors

**Issue:** IAM user doesn't have CDK deployment permissions

**Solution:**
- Switch to admin credentials: `export AWS_PROFILE=admin`
- Or update IAM policy to include CDK permissions (requires admin)

### "Bootstrap Stack Version" Error

**Issue:** CDK bootstrap check fails

**Solution:**
```bash
# Bootstrap CDK (requires admin credentials)
cd infra
npx cdk bootstrap aws://758742552610/us-east-1
```

### "Lambda Code Not Found" Warning

**Issue:** Lambda deployment skipped because `dist-lambda` doesn't exist

**Solution:** This is expected. Build API for Lambda first:
```bash
npm run build:api:lambda
npm run cdk:deploy
```

### "Stack Already Exists" Error

**Issue:** Stack was partially deployed

**Solution:**
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name EnablementPortalStack

# Continue deployment
npm run cdk:deploy
```

### Google OAuth "redirect_uri_mismatch"

**Issue:** Redirect URI in Google Console doesn't match Cognito domain

**Solution:**
1. Get exact Cognito domain from CDK outputs
2. Add exact URI to Google Console: `https://<domain>/oauth2/idpresponse`
3. Check for trailing slashes or typos

## Verification

### Check Stack Status

```bash
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].StackStatus' \
  --output text
```

Should show: `CREATE_COMPLETE` or `UPDATE_COMPLETE`

### Test Cognito

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# List groups
aws cognito-idp list-groups --user-pool-id $USER_POOL_ID
```

### Test DynamoDB Tables

```bash
# List tables
aws dynamodb list-tables

# Should see:
# - content_registry
# - notifications
# - subscriptions
# - events
```

### Test S3 Bucket

```bash
# Get bucket name
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ContentBucketName`].OutputValue' \
  --output text)

# Check bucket exists
aws s3 ls s3://$BUCKET
```

## Rollback

If deployment fails:

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name EnablementPortalStack \
  --max-items 20

# Delete stack (if needed)
npm run cdk:destroy
```

## Verify Expiry Lambda

After deployment, verify the content expiry Lambda function is working:

### 1. Get Lambda Function Name

```bash
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ExpiryJobLambdaFunctionName`].OutputValue' \
  --output text)

echo "Lambda function: $FUNCTION_NAME"
```

### 2. Manually Invoke Lambda

```bash
# Using the invoke script
./infra/scripts/invoke-expire-content.sh

# Or manually
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json | jq '.'
```

### 3. Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /aws/lambda/$FUNCTION_NAME --follow

# Or view in AWS Console
# CloudWatch > Log groups > /aws/lambda/<function-name>
```

### 4. Expected Log Output

Look for logs like:
```
Expiry job started { event: {...} }
Expiry job completed {
  scanned: 10,
  expired: 2,
  skipped: 8,
  errors: 0
}
```

### 5. Verify DynamoDB Changes

**Check Content Status:**
```bash
# Get content table name
CONTENT_TABLE=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ContentTableName`].OutputValue' \
  --output text)

# Scan for expired items
aws dynamodb scan \
  --table-name $CONTENT_TABLE \
  --filter-expression "#status = :status" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values '{":status":{"S":"Expired"}}' \
  --query 'Items[*].[id.S,title.S,expiry_date.S]' \
  --output table
```

**Check Notifications Created:**
```bash
# Get notifications table name
NOTIF_TABLE=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`NotificationsTableName`].OutputValue' \
  --output text)

# Query for expiry notifications (replace USER_ID with actual user)
aws dynamodb query \
  --table-name $NOTIF_TABLE \
  --key-condition-expression "user_id = :userId" \
  --filter-expression "contains(title, :title)" \
  --expression-attribute-values '{
    ":userId":{"S":"USER_ID"},
    ":title":{"S":"expired"}
  }' \
  --output table
```

### 6. Troubleshooting

**Lambda fails to start:**
- Check CloudWatch logs for import errors
- Verify `@gravyty/jobs` package is built: `npm run build --workspace=packages/jobs`
- Ensure environment variables are set correctly

**No items expired:**
- Verify content items have `expiry_date` set
- Check that `expiry_date <= now`
- Verify items are not already `Expired` status

**Notifications not created:**
- Check Lambda has write permissions on notifications table
- Verify subscriptions exist and match content criteria
- Check CloudWatch logs for notification creation errors

## Related Documentation

- [Local Development Runbook](./local-dev.md)
- [Google OAuth Setup](./google-oauth-setup.md)
- [Deployment Architecture](../architecture/deployment.md)
- [Authentication Architecture](../architecture/auth.md)



