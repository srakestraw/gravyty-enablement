# Disable and Delete User Fixes

## Issues Found and Fixed

### 1. Missing IAM Permission for Delete User ✅ FIXED

**Problem**: The IAM policy was missing `cognito-idp:AdminDeleteUser` permission.

**Location**: `infra/lib/enablement-portal-stack.ts` line 341-355

**Fix**: Added `'cognito-idp:AdminDeleteUser'` to the IAM policy actions list.

**Before**:
```typescript
actions: [
  'cognito-idp:AdminDisableUser',
  // AdminDeleteUser was missing!
  'cognito-idp:AdminAddUserToGroup',
  ...
]
```

**After**:
```typescript
actions: [
  'cognito-idp:AdminDisableUser',
  'cognito-idp:AdminDeleteUser', // ✅ Added
  'cognito-idp:AdminAddUserToGroup',
  ...
]
```

### 2. Deployment Required

**Important**: After making this change, you need to redeploy the CDK stack for the IAM permissions to take effect:

```bash
cd infra
npm run cdk:deploy
```

## Testing the Fixes

### Option 1: Use the Test Script

```bash
# Test with dev headers (local development)
export VITE_DEV_ROLE=Admin
export API_URL=http://localhost:4000
./scripts/test-disable-delete-user.sh test@gravyty.com

# Test with JWT token (production/staging)
export ADMIN_JWT_TOKEN="your-jwt-token"
export API_URL="https://your-api-url"
./scripts/test-disable-delete-user.sh test@gravyty.com
```

### Option 2: Manual Testing via UI

1. Navigate to `/enablement/admin/users`
2. Click the three dots menu on a user
3. Try "Disable" - should work
4. Try "Delete" - should work after redeploy

### Option 3: Manual Testing via API

```bash
# Disable user
curl -X PATCH \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/v1/admin/users/user@gravyty.com/disable"

# Delete user
curl -X DELETE \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/v1/admin/users/user@gravyty.com"
```

## Common Issues and Troubleshooting

### Issue: "Access Denied" or "Forbidden" Errors

**Cause**: IAM permissions not updated or API not redeployed.

**Solution**:
1. Verify IAM policy includes `AdminDeleteUser`:
   ```bash
   aws iam get-role-policy \
     --role-name <LAMBDA_ROLE_NAME> \
     --policy-name <POLICY_NAME> \
     | jq '.PolicyDocument.Statement[].Action'
   ```
2. Redeploy CDK stack:
   ```bash
   cd infra && npm run cdk:deploy
   ```

### Issue: "User not found" Errors

**Cause**: Username encoding issue or user doesn't exist.

**Solution**:
1. Check if user exists:
   ```bash
   aws cognito-idp admin-get-user \
     --user-pool-id <USER_POOL_ID> \
     --username <EMAIL>
   ```
2. Verify username is being URL-encoded correctly in API calls

### Issue: Disable Works But User Still Shows as Enabled

**Cause**: UI not refreshing or enabled status not being read correctly.

**Solution**:
1. Refresh the page after disable/enable
2. Check API response - should show `enabled: false`
3. Verify `getUserByUsername` is reading `Enabled` field correctly

### Issue: Delete Returns 500 Error

**Cause**: Missing IAM permission or Cognito error.

**Solution**:
1. Check API logs for detailed error
2. Verify IAM permissions include `AdminDeleteUser`
3. Check CloudWatch logs for Lambda function errors

## Verification Checklist

- [ ] CDK stack redeployed with new IAM permissions
- [ ] IAM policy includes `cognito-idp:AdminDeleteUser`
- [ ] API is running and accessible
- [ ] AWS credentials are configured correctly
- [ ] `COGNITO_USER_POOL_ID` environment variable is set
- [ ] Test user exists in Cognito
- [ ] Browser console shows no errors
- [ ] API logs show successful operations

## Expected Behavior

### Disable User
- ✅ User account is disabled in Cognito
- ✅ User cannot sign in
- ✅ UI shows user as disabled (red "No" chip)
- ✅ Enable option appears in menu
- ✅ API returns user with `enabled: false`

### Delete User
- ✅ User account is permanently deleted from Cognito
- ✅ User disappears from user list
- ✅ User cannot sign in
- ✅ API returns 204 No Content
- ✅ User cannot be found via `admin-get-user`

## Related Files

- `infra/lib/enablement-portal-stack.ts` - IAM permissions
- `apps/api/src/handlers/adminUsers.ts` - API handlers
- `apps/api/src/aws/cognitoClient.ts` - Cognito client functions
- `apps/web/src/pages/admin/AdminUsersRolesPage.tsx` - UI components
- `scripts/test-disable-delete-user.sh` - Test script

