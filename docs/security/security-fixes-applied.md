# Security Fixes Applied

## Summary

This document tracks security fixes that have been implemented to address identified risks.

## Fixes Applied ✅

### 1. DynamoDB Encryption at Rest
**Status**: ✅ FIXED  
**File**: `infra/lib/enablement-portal-stack.ts`

- Added `encryption: dynamodb.TableEncryption.AWS_MANAGED` to all DynamoDB tables
- Ensures all data is encrypted at rest using AWS-managed keys

### 2. CORS Headers Fixed
**Status**: ✅ FIXED  
**File**: `infra/lib/enablement-portal-stack.ts`

- Removed wildcard `x-amz-*` header
- Replaced with specific headers: `x-amz-date`, `x-amz-content-sha256`
- Reduces risk of header injection attacks

### 3. Rate Limiting Added
**Status**: ✅ FIXED  
**Files**: 
- `apps/api/src/middleware/rateLimit.ts` (new)
- `apps/api/src/server.ts`

- Added general API rate limiter: 100 requests per 15 minutes per IP
- Added stricter write rate limiter: 20 write operations per 15 minutes per IP
- Configurable via environment variables:
  - `RATE_LIMIT_MAX_REQUESTS` (default: 100)
  - `RATE_LIMIT_WRITE_MAX` (default: 20)
- Protects against DDoS and excessive API usage

### 4. IAM Role Created in CDK Stack
**Status**: ✅ FIXED  
**File**: `infra/lib/enablement-portal-stack.ts`

- Created IAM role (`ApiRole`) that can be assumed by Lambda/EC2
- Grants DynamoDB and S3 permissions to the role
- **Explicitly denies Scan permission** on content_registry table
- Role ARN exported as CloudFormation output
- Fixes bucket name mismatch issue (role uses CDK-generated bucket name)

### 5. S3 Bucket Policy Added
**Status**: ✅ FIXED  
**File**: `infra/lib/enablement-portal-stack.ts`

- Added bucket policy to deny insecure (non-HTTPS) connections
- Ensures all S3 access uses secure transport
- Provides defense-in-depth security

### 6. Scan Permission Removed
**Status**: ✅ FIXED  
**Files**: 
- `infra/lib/enablement-portal-stack.ts` (explicit deny in IAM role)
- `infra/iam/enablement-portal-policy.json` (removed from policy)

- Removed `dynamodb:Scan` permission from content_registry table
- Prevents expensive full table scans
- Code already uses Query with GSIs instead

### 7. IAM Policy Updated
**Status**: ✅ FIXED  
**File**: `infra/iam/enablement-portal-policy.json`

- Removed `dynamodb:Scan` from content_registry permissions
- Updated S3 bucket ARN pattern to support CDK-generated names (`enablement-content*`)
- Added condition requiring secure transport for S3 operations

### 8. RBAC Middleware Enhanced
**Status**: ✅ IMPROVED  
**File**: `apps/api/src/middleware/rbac.ts`

- Added production warning if stub is used in production
- Added validation logging for invalid role headers
- Clear TODO comments for Cognito JWT implementation

## Remaining Issues ⚠️

### Critical (Must Fix Before Production)

1. **Real Authentication** - RBAC stub still in use
   - **Action**: Implement Cognito JWT validation
   - **Priority**: CRITICAL
   - **Status**: TODO

2. **Rotate AWS Access Keys** - Credentials were exposed
   - **Action**: Create new access keys and delete old ones
   - **Priority**: CRITICAL
   - **Status**: Manual action required

### Medium Priority

3. **MFA Requirement** - IAM user has no MFA
   - **Action**: Enable MFA for IAM user
   - **Status**: TODO

4. **CloudTrail Logging** - No audit trail configured
   - **Action**: Enable CloudTrail for API calls
   - **Status**: TODO

5. **Presigned URL Expiration** - Hardcoded to 1 hour
   - **Action**: Make configurable via environment variable
   - **Status**: TODO (low priority)

## Deployment Notes

### After CDK Deployment

1. **Update IAM Policy**:
   ```bash
   # Update the policy with the new version (removes Scan, fixes bucket name)
   aws iam put-user-policy \
     --user-name enablement-portal-api \
     --policy-name EnablementPortalPolicy \
     --policy-document file://infra/iam/enablement-portal-policy.json
   ```

2. **Use IAM Role Instead of User** (Recommended):
   - When deploying to Lambda, use the `ApiRole` ARN from CDK outputs
   - Remove IAM user credentials from local development
   - Use IAM role for production deployments

3. **Environment Variables**:
   ```bash
   # Add to apps/api/.env
   RATE_LIMIT_MAX_REQUESTS=100
   RATE_LIMIT_WRITE_MAX=20
   ```

## Testing

After applying fixes, verify:

1. ✅ DynamoDB tables have encryption enabled
2. ✅ Rate limiting works (test with multiple rapid requests)
3. ✅ Scan operations are denied (should fail with AccessDenied)
4. ✅ S3 operations require HTTPS
5. ✅ CORS headers are restricted

## References

- [Security Assessment](./security-assessment.md) - Full security review
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)






