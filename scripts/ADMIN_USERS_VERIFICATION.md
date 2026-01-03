# Admin Users & Roles Verification Guide

This guide provides step-by-step instructions to verify the Admin Users & Roles module is properly configured and working.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Infrastructure deployed (CloudFormation stack)
3. API server running (or Lambda deployed)
4. Admin user account in Cognito

## Quick Verification Script

Run the comprehensive verification script:

```bash
./scripts/verify-admin-users-setup.sh
```

This script checks:
- CloudFormation stack outputs
- Lambda environment variables
- Cognito groups existence
- Lambda IAM permissions
- API endpoint availability
- DynamoDB events table

## Manual Verification Steps

### 1. Verify User Pool ID in Lambda Environment

```bash
# Get Lambda function name
LAMBDA_NAME=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' \
  --output text)

# Check environment variables
aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --query 'Environment.Variables' \
  --output json | jq '.COGNITO_USER_POOL_ID'
```

**Expected**: Should return the User Pool ID (e.g., `us-east-1_XXXXXXXXX`)

### 2. Verify Cognito Groups

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Verify groups exist
./scripts/verify-cognito-groups.sh "$USER_POOL_ID"
```

**Expected**: All four groups should exist:
- Viewer (precedence: 1)
- Contributor (precedence: 2)
- Approver (precedence: 3)
- Admin (precedence: 4)

### 3. Test Admin Access (Web UI)

1. Log in to the web application as an Admin user
2. Navigate to `/enablement/admin/users`
3. Verify the page loads without errors
4. Verify you can see the users table

**Expected**: Page should load and display users (or empty state if no users)

### 4. Test API Endpoints

#### Option A: Using the test script

```bash
# For local development (uses dev headers)
export VITE_DEV_ROLE=Admin
export VITE_DEV_USER_ID=admin-user
export API_URL=http://localhost:4000
./scripts/test-admin-users-api.sh

# For production (requires JWT token)
export ADMIN_JWT_TOKEN="your-jwt-token-here"
export API_URL="https://your-api-gateway-url"
./scripts/test-admin-users-api.sh
```

#### Option B: Manual curl commands

```bash
# Set variables
API_URL="http://localhost:4000"  # or your API Gateway URL
JWT_TOKEN="your-jwt-token"  # or use dev headers

# List users
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/v1/admin/users"

# Invite user
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gravyty.com","role":"Viewer"}' \
  "$API_URL/v1/admin/users/invite"

# Change role
curl -X PATCH \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"Contributor"}' \
  "$API_URL/v1/admin/users/test@gravyty.com/role"

# Disable user
curl -X PATCH \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/v1/admin/users/test@gravyty.com/disable"

# Enable user
curl -X PATCH \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/v1/admin/users/test@gravyty.com/enable"
```

**Expected**: All endpoints should return 200/201 status codes with JSON responses

### 5. Test Invite Flow

1. In the web UI, click "Invite User"
2. Enter email: `test-verification@gravyty.com`
3. Select role: `Viewer`
4. Click "Invite"
5. Verify success message appears
6. Check Cognito console to verify user was created

**Expected**: 
- Success snackbar appears
- User appears in the table
- User exists in Cognito User Pool
- User is assigned to Viewer group

### 6. Test Role Changes

1. Find a test user in the table
2. Click the actions menu (three dots)
3. Select "Change Role"
4. Change role from Viewer to Contributor
5. Click "Update"
6. Verify success message
7. Check Cognito console to verify group membership

**Expected**:
- Success snackbar appears
- User's role updates in the table
- User is removed from old group and added to new group in Cognito
- User's role persists after page refresh

### 7. Test Enable/Disable

1. Find a test user in the table
2. Click the actions menu
3. Select "Disable"
4. Confirm the action
5. Verify success message
6. Verify user's "Enabled" status changes to "No"

**Expected**:
- Success snackbar appears
- User's enabled status updates in the table
- User is disabled in Cognito (cannot sign in)
- Status persists after page refresh

Repeat for "Enable" action.

### 8. Verify Audit Events

```bash
# Check DynamoDB events table
./scripts/check-audit-events.sh events 1

# Or manually query
TABLE_NAME="events"
DATE_BUCKET=$(date -u +%Y-%m-%d)

aws dynamodb query \
  --table-name "$TABLE_NAME" \
  --key-condition-expression "date_bucket = :date" \
  --expression-attribute-values "{\":date\": {\"S\": \"$DATE_BUCKET\"}}" \
  --filter-expression "contains(event_name, :admin)" \
  --expression-attribute-values "{\":admin\": {\"S\": \"admin_users\"}}" \
  --query 'Items[].[event_name.S, ts#event_id.S]' \
  --output table
```

**Expected**: Should see events like:
- `admin_users_invite`
- `admin_users_role_change`
- `admin_users_enable`
- `admin_users_disable`

Each event should have metadata including:
- `actor`: Admin user who performed the action
- `target_username`, `target_email`: Target user info
- `old_role`, `new_role`: Role change details (when applicable)
- `enabled_before`, `enabled_after`: Status change details (when applicable)

## Troubleshooting

### "User Pool ID not found in Lambda environment"

**Solution**: Ensure the CDK stack includes the environment variable:
```typescript
environment: {
  COGNITO_USER_POOL_ID: this.userPool.userPoolId,
  // ...
}
```

### "Group not found" errors

**Solution**: Groups are created by the CDK stack. Verify they exist:
```bash
aws cognito-idp list-groups --user-pool-id "$USER_POOL_ID"
```

If missing, redeploy the CDK stack or create manually:
```bash
aws cognito-idp create-group \
  --user-pool-id "$USER_POOL_ID" \
  --group-name "Viewer" \
  --precedence 1 \
  --description "View-only access"
```

### "Forbidden" errors when accessing endpoints

**Solution**: 
1. Verify user has Admin role in Cognito
2. Check JWT token includes `cognito:groups` claim with "Admin"
3. Verify API middleware `requireRole('Admin')` is working
4. For local dev, ensure `VITE_DEV_ROLE=Admin` is set

### "User not found" errors

**Solution**: 
1. Verify user exists in Cognito User Pool
2. Check username matches exactly (case-sensitive)
3. Ensure user hasn't been deleted

### Audit events not appearing

**Solution**:
1. Verify events table exists and is accessible
2. Check API Lambda has write permissions to DynamoDB
3. Verify events API endpoint is working: `POST /v1/events`
4. Check CloudWatch logs for errors

## Dev Fallback Testing

When `COGNITO_USER_POOL_ID` is not set, the API uses an in-memory user store:

```bash
# Unset Cognito env var to test dev fallback
unset COGNITO_USER_POOL_ID

# Start API server
cd apps/api
npm run dev

# Test endpoints (will use stub users)
curl -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin-user" \
  http://localhost:4000/v1/admin/users
```

**Expected**: Should return stub users (admin@gravyty.com, approver@gravyty.com, etc.)

## Security Verification

### Verify Admin-Only Access

1. **UI Route Protection**: 
   - Try accessing `/enablement/admin/users` as non-admin user
   - Should redirect to home page

2. **API Protection**:
   ```bash
   # Test as Viewer (should fail)
   curl -H "x-dev-role: Viewer" \
     http://localhost:4000/v1/admin/users
   ```
   **Expected**: Should return 403 Forbidden

3. **Self-Disable Protection**:
   - Try disabling your own account
   - Should require confirmation checkbox
   - Should show warning message

## Next Steps

After verification:
1. Document any issues found
2. Update user documentation if needed
3. Train admins on using the Users & Roles module
4. Set up monitoring/alerts for admin actions


