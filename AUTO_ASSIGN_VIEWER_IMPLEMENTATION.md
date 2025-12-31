# Automatic Viewer Role Assignment Implementation

## Overview

When a user authenticates with Google OAuth and their email domain is `@gravyty.com`, they are automatically added to the Viewer group if they don't already have a role group assigned.

## Implementation Details

### Lambda Function

**Location**: `infra/lambda/auto-assign-viewer/index.ts`

**Trigger**: `postAuthentication` - Runs after successful authentication

**Functionality**:
1. Extracts email from user attributes
2. Checks if email domain is `@gravyty.com`
3. Lists user's current groups
4. If user doesn't have any role group (Admin, Approver, Contributor, Viewer), adds them to Viewer group
5. If user already has a role group, skips assignment

**Error Handling**: Errors are logged but don't block authentication (user can still sign in even if group assignment fails)

### CDK Infrastructure

**Construct**: `infra/lib/cognito-auto-assign-viewer.ts`

**Permissions**: Lambda has permissions to:
- `cognito-idp:AdminListGroupsForUser` - Check user's current groups
- `cognito-idp:AdminAddUserToGroup` - Add user to Viewer group

**Integration**: Added to User Pool as `postAuthentication` trigger in `infra/lib/enablement-portal-stack.ts`

## Flow

1. User signs in with Google OAuth
2. Cognito creates/authenticates user (federated identity)
3. `preTokenGeneration` trigger validates email domain (@gravyty.com)
4. `postAuthentication` trigger runs:
   - Checks if email is @gravyty.com
   - Checks if user has a role group
   - If no role group, adds to Viewer group
5. User receives JWT token with Viewer group claim
6. User can access the application with Viewer permissions

## Deployment

1. **Build the Lambda**:
   ```bash
   cd infra
   npm install
   ```

2. **Deploy the stack**:
   ```bash
   npm run cdk:deploy
   ```

   This will:
   - Create the Lambda function
   - Add it as a postAuthentication trigger
   - Grant necessary IAM permissions

## Testing

### Test Scenario 1: New @gravyty.com User

1. Sign in with a Google account that has `@gravyty.com` email
2. Check CloudWatch Logs for the Lambda function:
   ```bash
   aws logs tail /aws/lambda/EnablementPortalStack-AutoAssignViewerFunction-XXXXX --follow
   ```
3. Verify user was added to Viewer group:
   ```bash
   aws cognito-idp admin-list-groups-for-user \
     --user-pool-id <USER_POOL_ID> \
     --username <EMAIL>
   ```
   Should show: `Viewer` group

### Test Scenario 2: Existing User with Role

1. Sign in with a user that already has a role (e.g., Admin)
2. Check CloudWatch Logs - should see "User already has a role group, skipping auto-assignment"
3. Verify user's role wasn't changed

### Test Scenario 3: Non-@gravyty.com User

1. Sign in with a non-@gravyty.com email
2. Check CloudWatch Logs - should see "Email domain is not @gravyty.com, skipping auto-assignment"
3. User should be blocked by `preTokenGeneration` trigger (domain validation)

## CloudWatch Logs

The Lambda function logs:
- User email and username
- Current groups
- Whether user was added to Viewer group
- Any errors (non-blocking)

View logs:
```bash
aws logs tail /aws/lambda/EnablementPortalStack-AutoAssignViewerFunction-XXXXX --follow
```

## Important Notes

1. **Federated Identity**: Users are automatically created in Cognito on first Google OAuth sign-in
2. **Role Precedence**: The function only assigns Viewer if user has NO role group. It won't override existing roles.
3. **Non-Blocking**: If group assignment fails, authentication still succeeds (errors are logged but don't throw)
4. **Domain Restriction**: Only `@gravyty.com` users are auto-assigned. Other domains are skipped.

## Troubleshooting

### User Not Getting Viewer Role

1. Check CloudWatch Logs for errors
2. Verify Lambda has correct IAM permissions
3. Verify User Pool ID matches in Lambda environment
4. Check if user already has a role group (function won't override)

### Lambda Errors

1. Check IAM permissions - Lambda needs `AdminListGroupsForUser` and `AdminAddUserToGroup`
2. Verify User Pool ID is correct
3. Check CloudWatch Logs for detailed error messages

### User Still Blocked After Assignment

1. User needs to sign out and sign in again to get new token with Viewer group
2. Or wait for token refresh (tokens include groups claim)

## Related Files

- `infra/lambda/auto-assign-viewer/index.ts` - Lambda function code
- `infra/lib/cognito-auto-assign-viewer.ts` - CDK construct
- `infra/lib/enablement-portal-stack.ts` - Stack integration
- `infra/lambda/email-domain-validator/index.js` - Pre-token generation validator

