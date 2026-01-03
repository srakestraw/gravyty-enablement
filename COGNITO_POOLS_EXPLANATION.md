# Why Are There 4 Cognito User Pools?

## The 4 Pools You're Seeing

1. **us-east-1_PsvXOkNff** - Created 2 days ago
2. **us-east-1_hOml8KLtW** - Created 2 days ago  
3. **us-east-1_s4q1vjkgD** - Created last week (6 days ago)
4. **us-east-1_xBNZh7TaB** - Created 2 days ago ⭐ **CURRENTLY IN USE**

## Why Multiple Pools Exist

When you deploy/redeploy your CloudFormation/CDK stack:
- If the User Pool is **not retained**, it gets deleted and recreated
- Each recreation creates a **new User Pool ID**
- Old pools remain if they weren't properly cleaned up

This typically happens when:
1. Stack was destroyed and recreated
2. User Pool deletion was skipped (retention policy)
3. Multiple deployment attempts
4. Testing/development deployments

## Which Pool Is Currently Active?

Based on your codebase:

**✅ ACTIVE: `us-east-1_xBNZh7TaB`**
- Used in frontend configuration
- Used in API scripts
- This is the one your app is currently using

**❌ OLD: `us-east-1_s4q1vjkgD`**
- Referenced in some old documentation
- Likely from an earlier deployment

**❓ UNKNOWN: `us-east-1_PsvXOkNff` and `us-east-1_hOml8KLtW`**
- Created recently (2 days ago)
- May be from recent deployment attempts

## How to Verify Which Pool Is Active

### 1. Check Frontend Configuration
Your frontend is configured to use: `us-east-1_xBNZh7TaB`
- Check browser console logs - should show this User Pool ID
- Check Amplify environment variables

### 2. Check API Configuration
Your API should be using: `us-east-1_xBNZh7TaB`
- Check API server startup logs
- Look for: `[JWT Auth NEW] Configuration: { userPoolId: 'us-east-1_xBNZh7TaB', ... }`

### 3. Check CloudFormation Stack
```bash
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text
```

This will show which User Pool ID is in your current stack.

## Can You Delete the Old Pools?

**⚠️ BE CAREFUL** - Only delete pools that are NOT in use!

### Safe to Delete:
- Pools that are NOT referenced in your code
- Pools that are NOT in your CloudFormation stack
- Pools with no users (or users you don't need)

### DO NOT Delete:
- The pool currently in use (`us-east-1_xBNZh7TaB`)
- Any pool with users you need

### How to Delete (if safe):

1. **Via AWS Console:**
   - Go to Cognito → User pools
   - Click on the pool you want to delete
   - Click "Delete user pool"
   - Type the pool name to confirm

2. **Via AWS CLI:**
   ```bash
   aws cognito-idp delete-user-pool --user-pool-id us-east-1_PsvXOkNff
   ```

## Recommendation

1. **Verify active pool** - Confirm `us-east-1_xBNZh7TaB` is the one in use
2. **Check CloudFormation** - See which pool is in your stack
3. **Delete unused pools** - Only after confirming they're not needed
4. **Update infrastructure** - Consider adding retention policy to prevent accidental deletion

## To Prevent This in the Future

In your CDK/CloudFormation code, add a retention policy:

```typescript
removalPolicy: cdk.RemovalPolicy.RETAIN
```

This prevents the User Pool from being deleted when the stack is destroyed, so you can reuse it.

