# IAM User Setup

## Overview

This directory contains IAM policies and setup scripts for the enablement portal. There are two IAM users:

1. **`enablement-portal-api`** - For runtime API access (legacy, prefer IAM roles for Lambda)
2. **`enablement-local-dev`** - For local development only (see [Local Development User](#local-development-user) section)

**⚠️ IMPORTANT**: For deployed AWS resources (Lambda/Amplify), use IAM roles, not long-lived access keys. Access keys are only for local development.

---

## Local Development User

### Purpose

The `enablement-local-dev` IAM user provides least-privilege permissions for running the enablement portal API locally against AWS resources (DynamoDB tables and S3 bucket).

**⚠️ SECURITY WARNINGS:**
- **Local development only** - Never use this user for production deployments
- **Prefer IAM roles** - For deployed Lambda functions, use execution roles, not access keys
- **Rotate keys regularly** - Rotate access keys every 90 days
- **Never commit keys** - Access keys should never be committed to git or documentation

### Permissions Granted

#### DynamoDB
- Tables: `content_registry`, `notifications`, `subscriptions`, `events`
- Actions: `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan`, `BatchGetItem`, `BatchWriteItem`, `DescribeTable`
- Includes access to all Global Secondary Indexes (GSIs) on these tables

#### S3
- Bucket: Configured via `ENABLEMENT_CONTENT_BUCKET` environment variable
- Actions: `GetObject`, `PutObject` on `content/*` prefix only
- ListBucket: Limited to `content/*` prefix via condition

### Permissions NOT Granted

- ❌ `dynamodb:ListTables` (not needed)
- ❌ Access to other DynamoDB tables
- ❌ Access to other S3 buckets or prefixes
- ❌ IAM management
- ❌ CloudWatch Logs (not needed for local dev)
- ❌ Other AWS services

### Setup

#### 1. Create the IAM User

Run the setup script (requires admin AWS credentials):

```bash
cd infra/scripts
./create-iam-user-enablement-local-dev.sh
```

The script will:
- Auto-detect AWS account ID
- Read configuration from `apps/api/.env` if available (table names, bucket name)
- Create IAM user if missing
- Create/update IAM policy with least-privilege permissions
- Attach policy to user
- Optionally create access keys (if `CREATE_ACCESS_KEY=true`)

**To create access keys during setup:**
```bash
CREATE_ACCESS_KEY=true ./create-iam-user-enablement-local-dev.sh
```

#### 2. Configure AWS Profile

After creating access keys, configure AWS CLI:

```bash
aws configure --profile enablement-local-dev
# Enter Access Key ID
# Enter Secret Access Key (save securely!)
# Enter region: us-east-1
# Enter output format: json
```

#### 3. Verify Configuration

Test the IAM user permissions:

```bash
export AWS_PROFILE=enablement-local-dev
./infra/scripts/verify-enablement-local-dev.sh
```

#### 4. Use in Local Development

```bash
export AWS_PROFILE=enablement-local-dev
STORAGE_BACKEND=aws npm run dev:api
```

### Rotating Access Keys

1. **Create new access key:**
   ```bash
   aws iam create-access-key --user-name enablement-local-dev
   ```

2. **Update credentials file** (`~/.aws/credentials`):
   ```ini
   [enablement-local-dev]
   aws_access_key_id = NEW_ACCESS_KEY_ID
   aws_secret_access_key = NEW_SECRET_ACCESS_KEY
   region = us-east-1
   output = json
   ```

3. **Test new credentials:**
   ```bash
   export AWS_PROFILE=enablement-local-dev
   aws sts get-caller-identity
   ./infra/scripts/verify-enablement-local-dev.sh
   ```

4. **Delete old access key:**
   ```bash
   aws iam delete-access-key --user-name enablement-local-dev --access-key-id OLD_KEY_ID
   ```

### Deleting the User

To completely remove the local dev user:

```bash
# 1. Delete access keys
aws iam list-access-keys --user-name enablement-local-dev --query 'AccessKeyMetadata[].AccessKeyId' --output text | \
  tr '\t' '\n' | while read key_id; do
    aws iam delete-access-key --user-name enablement-local-dev --access-key-id "$key_id"
  done

# 2. Detach policy
aws iam detach-user-policy --user-name enablement-local-dev --policy-arn arn:aws:iam::ACCOUNT_ID:policy/EnablementLocalDevPolicy

# 3. Delete user
aws iam delete-user --user-name enablement-local-dev
```

### Files

- **Policy**: `infra/iam/enablement-local-dev-policy.json`
- **Setup Script**: `infra/scripts/create-iam-user-enablement-local-dev.sh`
- **Verification Script**: `infra/scripts/verify-enablement-local-dev.sh`

---

## Production/Runtime User (Legacy)

> **Note**: For new deployments, prefer IAM roles for Lambda execution rather than IAM users with access keys.

The enablement portal uses an IAM user (`enablement-portal-api`) with limited permissions instead of root credentials for better security.

## IAM User Details

- **User Name**: `enablement-portal-api`
- **Policy**: `EnablementPortalPolicy`
- **Permissions**: Limited to enablement portal resources only

## Permissions Granted

### DynamoDB
- `content_registry` table (with indexes)
- `notifications` table
- `subscriptions` table
- `events` table

**Actions**: PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem

### S3
- `enablement-content` bucket only

**Actions**: PutObject, GetObject, DeleteObject, ListBucket

### STS
- GetCallerIdentity (for verification)

## Permissions NOT Granted

- ❌ Access to other DynamoDB tables
- ❌ Access to other S3 buckets
- ❌ IAM management
- ❌ Billing/account management
- ❌ Other AWS services

## Credentials Location

Credentials are stored in: `~/.aws/credentials`

**⚠️ SECURITY WARNING**: Never commit credentials to git or documentation.

To view your current credentials:
```bash
aws configure list
```

To update credentials:
```bash
aws configure
```

**Security**: File permissions should be set to `600` (owner read/write only):
```bash
chmod 600 ~/.aws/credentials
```

## Creating/Updating IAM User

To recreate or update the IAM user:

```bash
./infra/scripts/create-iam-user.sh
```

This script will:
1. Create IAM user (if doesn't exist)
2. Create/update policy
3. Attach policy to user
4. Generate access keys
5. Optionally update credentials file

## Policy File

The IAM policy is defined in: `infra/iam/enablement-portal-policy.json`

## Security Best Practices

- ✅ Using IAM user (not root)
- ✅ Principle of least privilege
- ✅ Credentials stored securely
- ✅ Never commit credentials to git
- ✅ Rotate keys every 90 days
- ✅ Monitor access via CloudTrail

## Rotating Access Keys

1. Create new access key:
   ```bash
   aws iam create-access-key --user-name enablement-portal-api
   ```

2. Update credentials file with new keys

3. Test new credentials:
   ```bash
   aws sts get-caller-identity
   ```

4. Delete old access key:
   ```bash
   aws iam delete-access-key --user-name enablement-portal-api --access-key-id OLD_KEY_ID
   ```

## Troubleshooting

**"Access Denied" errors:**
- Verify policy is attached: `aws iam list-attached-user-policies --user-name enablement-portal-api`
- Check policy ARN matches: `aws iam get-policy --policy-arn arn:aws:iam::ACCOUNT:policy/EnablementPortalPolicy`

**"Invalid credentials" errors:**
- Verify credentials file: `cat ~/.aws/credentials`
- Check file permissions: `ls -l ~/.aws/credentials` (should be 600)
- Test credentials: `aws sts get-caller-identity`

