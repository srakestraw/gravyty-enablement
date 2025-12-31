# Security Assessment

## Critical Issues 🔴

### 1. **Exposed AWS Credentials in Documentation**
**Risk**: HIGH  
**Location**: `infra/iam/README.md` lines 44-46

**Issue**: Actual AWS access keys are visible in the repository documentation.

**Impact**: 
- Anyone with repository access can use these credentials
- Credentials could be exposed if repository is public or shared

**Fix**:
```bash
# Remove credentials from README immediately
# Rotate the access keys
aws iam create-access-key --user-name enablement-portal-api
# Delete old keys
aws iam delete-access-key --user-name enablement-portal-api --access-key-id AKIA3BKEUSARECWGRKW5
```

**Action Required**: ⚠️ **IMMEDIATE** - Remove credentials and rotate keys

---

### 2. **IAM Policy Hardcodes Bucket Name**
**Risk**: MEDIUM  
**Location**: `infra/iam/enablement-portal-policy.json` line 70

**Issue**: Policy hardcodes `enablement-content` bucket name, but CDK generates unique bucket names.

**Impact**: 
- Policy won't work with CDK-generated bucket names
- API will fail with permission denied errors

**Fix**: Update policy to use CDK output or parameter:
```json
{
  "Resource": [
    "arn:aws:s3:::${BucketName}",
    "arn:aws:s3:::${BucketName}/*"
  ]
}
```

Or use CDK to create IAM role with proper permissions.

---

### 3. **No Real Authentication (RBAC Stub)**
**Risk**: HIGH  
**Location**: `apps/api/src/middleware/rbac.ts`

**Issue**: RBAC reads role from `x-dev-role` header with no validation.

**Impact**:
- Anyone can set `x-dev-role: Admin` and gain full access
- No user identity verification
- No audit trail of who performed actions

**Fix**: 
- Implement Cognito JWT validation (planned for Phase 4)
- Add request logging with user identity
- Add rate limiting per user/IP

**Action Required**: ⚠️ **Before production deployment**

---

## High Priority Issues 🟠

### 4. **No DynamoDB Encryption at Rest**
**Risk**: MEDIUM  
**Location**: `infra/lib/enablement-portal-stack.ts`

**Issue**: DynamoDB tables don't explicitly enable encryption at rest.

**Impact**: 
- Data stored unencrypted (though AWS may encrypt by default in some regions)
- Compliance issues for sensitive data

**Fix**: Add encryption configuration:
```typescript
encryption: dynamodb.TableEncryption.AWS_MANAGED,
```

---

### 5. **Scan Operations Allowed**
**Risk**: MEDIUM  
**Location**: `infra/iam/enablement-portal-policy.json` line 13

**Issue**: IAM policy allows `dynamodb:Scan` on content_registry table.

**Impact**:
- Expensive operations (charged per item scanned)
- Potential for full table scans
- Performance degradation

**Fix**: 
- Remove Scan permission if not needed
- Or restrict to specific use cases with conditions
- Use Query with GSIs instead

---

### 6. **No Rate Limiting**
**Risk**: MEDIUM  
**Location**: API server

**Issue**: No rate limiting on API endpoints.

**Impact**:
- DDoS vulnerability
- Cost escalation from excessive API calls
- Resource exhaustion

**Fix**: Add rate limiting middleware:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

---

### 7. **CORS Wildcard Headers**
**Risk**: LOW-MEDIUM  
**Location**: `infra/lib/enablement-portal-stack.ts` line 39

**Issue**: CORS allows `x-amz-*` wildcard headers.

**Impact**:
- Potential for header injection attacks
- Less restrictive than necessary

**Fix**: Specify exact headers needed:
```typescript
allowedHeaders: [
  'Content-Type',
  'x-amz-date',
  'x-amz-content-sha256',
  'Authorization',
  // Remove wildcard
],
```

---

## Medium Priority Issues 🟡

### 8. **No IAM Role in CDK Stack**
**Risk**: LOW-MEDIUM  
**Location**: `infra/lib/enablement-portal-stack.ts`

**Issue**: CDK stack doesn't create IAM roles for Lambda/API Gateway.

**Impact**: 
- Relies on external IAM user configuration
- Not infrastructure-as-code for IAM
- Harder to manage permissions

**Fix**: Create IAM role in CDK and grant permissions to tables/bucket:
```typescript
const apiRole = new iam.Role(this, 'ApiRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});
this.contentTable.grantReadWriteData(apiRole);
this.contentBucket.grantReadWrite(apiRole);
```

---

### 9. **No Bucket Policy**
**Risk**: LOW  
**Location**: `infra/lib/enablement-portal-stack.ts`

**Issue**: S3 bucket has no resource-based policy.

**Impact**: 
- Relies solely on IAM user permissions
- No additional defense-in-depth

**Fix**: Add bucket policy to restrict access:
```typescript
this.contentBucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [this.contentBucket.arnForObjects('*')],
  conditions: {
    StringNotEquals: {
      'aws:PrincipalArn': apiRole.roleArn,
    },
  },
}));
```

---

### 10. **No MFA Requirement**
**Risk**: LOW-MEDIUM  
**Location**: IAM user configuration

**Issue**: IAM user has no MFA requirement.

**Impact**: 
- Single-factor authentication only
- If credentials are compromised, full access granted

**Fix**: Require MFA for IAM user:
```bash
aws iam create-virtual-mfa-device --virtual-mfa-device-name enablement-portal-api-mfa
aws iam enable-mfa-device --user-name enablement-portal-api --serial-number <mfa-serial> --authentication-code-1 <code1> --authentication-code-2 <code2>
```

Add MFA condition to policy.

---

### 11. **No CloudTrail Logging**
**Risk**: LOW  
**Location**: Infrastructure

**Issue**: No CloudTrail configured for audit logging.

**Impact**: 
- No audit trail of API calls
- Harder to detect unauthorized access
- Compliance issues

**Fix**: Enable CloudTrail:
```typescript
new cloudtrail.Trail(this, 'EnablementTrail', {
  bucket: trailBucket,
  includeGlobalServiceEvents: true,
});
```

---

### 12. **Presigned URL Expiration**
**Risk**: LOW  
**Location**: `apps/api/src/handlers/uploads.ts` line 11

**Issue**: Presigned URLs expire in 1 hour (hardcoded).

**Impact**: 
- May be too long for sensitive operations
- Not configurable per use case

**Fix**: Make configurable via environment variable:
```typescript
const PRESIGNED_URL_EXPIRES_IN = parseInt(
  process.env.PRESIGNED_URL_EXPIRY_SECONDS || '3600',
  10
);
```

---

## Recommendations

### Immediate Actions (Before Production)

1. ✅ **Remove exposed credentials** from `infra/iam/README.md`
2. ✅ **Rotate AWS access keys**
3. ✅ **Implement real authentication** (Cognito JWT)
4. ✅ **Add rate limiting** to API
5. ✅ **Fix IAM policy** to use CDK-generated bucket name

### Short-term Improvements

1. Add DynamoDB encryption at rest
2. Remove or restrict Scan permissions
3. Add CloudTrail logging
4. Create IAM role in CDK stack
5. Add bucket policy for defense-in-depth

### Long-term Enhancements

1. Implement MFA requirement
2. Add WAF rules for API Gateway
3. Enable GuardDuty for threat detection
4. Add security monitoring/alerting
5. Regular security audits

---

## Security Checklist

- [ ] Remove exposed credentials from documentation
- [ ] Rotate AWS access keys
- [ ] Fix IAM policy bucket name mismatch
- [ ] Implement Cognito JWT authentication
- [ ] Add rate limiting
- [ ] Enable DynamoDB encryption at rest
- [ ] Restrict Scan permissions
- [ ] Add CloudTrail logging
- [ ] Create IAM role in CDK
- [ ] Add S3 bucket policy
- [ ] Require MFA for IAM user
- [ ] Add input validation/sanitization
- [ ] Enable AWS Config for compliance
- [ ] Set up security monitoring

---

## References

- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)






