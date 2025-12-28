# AWS Login Setup Guide

## Recommended: Use `aws login` (No Access Keys Needed!)

AWS now recommends using `aws login` instead of creating root user access keys. This is more secure because:

✅ Uses your existing console credentials (no long-lived keys)
✅ Automatically refreshes credentials
✅ Better security practices
✅ No need to manage access keys

## Setup Steps

### 1. Run AWS Login

```bash
aws login
```

This will:
- Open your browser to AWS console login
- Authenticate with your AWS account credentials
- Store temporary credentials locally
- Automatically refresh when needed

### 2. Verify Connection

```bash
aws sts get-caller-identity
```

Should show your AWS account ID and user ARN.

### 3. Set Up Resources

```bash
./infra/scripts/setup-aws.sh
```

## Alternative: If You Must Use Access Keys

If `aws login` doesn't work for your setup, you can still create access keys:

1. **Don't use root user access keys** - Instead:
   - Create an IAM user
   - Attach necessary permissions
   - Create access keys for that IAM user

2. **IAM User Setup**:
   - Go to: https://console.aws.amazon.com/iam/home#/users
   - Click "Create user"
   - Attach policies:
     - `AmazonDynamoDBFullAccess` (or custom policy)
     - `AmazonS3FullAccess` (or custom policy)
   - Create access key for this user (not root)

3. **Configure**:
   ```bash
   aws configure
   ```
   Use the IAM user's access keys (not root user keys)

## Security Best Practices

- ❌ **Don't** create root user access keys
- ✅ **Do** use `aws login` when possible
- ✅ **Do** create IAM users with least-privilege permissions
- ✅ **Do** rotate access keys regularly
- ✅ **Do** never commit credentials to git




