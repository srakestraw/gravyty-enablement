# Security Documentation

## Overview

This directory contains security-related documentation for the Gravyty Enablement Portal.

## Documents

- **[Security Assessment](./security-assessment.md)** - Comprehensive security review and recommendations

## Quick Security Checklist

Before deploying to production:

- [ ] Remove any exposed credentials from code/docs
- [ ] Rotate AWS access keys
- [ ] Implement real authentication (Cognito JWT)
- [ ] Add rate limiting to API
- [ ] Enable DynamoDB encryption at rest
- [ ] Configure CloudTrail for audit logging
- [ ] Review IAM policies for least privilege
- [ ] Add input validation and sanitization
- [ ] Enable AWS Config for compliance
- [ ] Set up security monitoring/alerting

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT** create a public GitHub issue
2. Contact the security team directly
3. Provide details of the vulnerability
4. Allow time for remediation before disclosure

## Security Best Practices

- ✅ Use IAM roles instead of access keys when possible
- ✅ Rotate credentials regularly (every 90 days)
- ✅ Enable MFA for IAM users
- ✅ Use least privilege principle
- ✅ Enable encryption at rest and in transit
- ✅ Monitor access via CloudTrail
- ✅ Keep dependencies up to date
- ✅ Regular security audits






