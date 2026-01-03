# Step-by-Step: Create IAM User Using Access Keys

This guide walks you through creating an IAM user with limited permissions for the enablement portal.

## Prerequisites

- Admin AWS access keys (Access Key ID + Secret Access Key)
- AWS CLI installed (`aws --version`)

## Step 1: Configure Your Admin Credentials

First, configure your admin AWS credentials:

```bash
aws configure
```

You'll be prompted for:
1. **AWS Access Key ID**: Your admin access key
2. **AWS Secret Access Key**: Your admin secret key
3. **Default region name**: `us-east-1`
4. **Default output format**: `json`

**Example:**
```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

## Step 2: Verify Admin Credentials Work

```bash
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/admin-user"
}
```

✅ If you see this, your credentials are working!

## Step 3: Run the IAM User Creation Script

The script will create a new IAM user with limited permissions:

```bash
./infra/scripts/create-iam-user.sh
```

**What the script does:**
1. ✅ Creates IAM user: `enablement-portal-api`
2. ✅ Creates/updates IAM policy with limited permissions
3. ✅ Attaches policy to the user
4. ✅ Creates new access keys for the IAM user
5. ✅ Optionally updates your AWS credentials file

## Step 4: Save the New Access Keys

The script will output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT: Save these credentials securely!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Access Key ID:     AKIA...
Secret Access Key: wJalr...
```

**⚠️ CRITICAL:** Save these credentials now! The secret key is shown only once.

## Step 5: Update Your Credentials (Optional)

The script will ask if you want to update your credentials file:

```
Do you want to update your AWS credentials file with these keys? (y/N):
```

- **Yes (y)**: Updates `~/.aws/credentials` with the new IAM user's keys
- **No (N)**: You'll configure manually later

## Step 6: Verify the New IAM User

After the script completes, verify it works:

```bash
aws sts get-caller-identity
```

You should see the new IAM user:
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/enablement-portal-api"
}
```

## What Permissions Does the IAM User Have?

The IAM user (`enablement-portal-api`) has **limited permissions**:

✅ **DynamoDB:**
- Tables: `content_registry`, `notifications`, `subscriptions`, `events`
- Actions: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem

✅ **S3:**
- Bucket: `enablement-content` only
- Actions: PutObject, GetObject, DeleteObject, ListBucket

✅ **STS:**
- GetCallerIdentity (for verification)

❌ **NOT Granted:**
- Access to other DynamoDB tables
- Access to other S3 buckets
- IAM management
- Billing/account management
- Other AWS services

## Alternative: Create User for Local Development

If you need a user specifically for local development:

```bash
CREATE_ACCESS_KEY=true ./infra/scripts/create-iam-user-enablement-local-dev.sh
```

This creates user `enablement-local-dev` with similar permissions but optimized for local dev.

## Troubleshooting

### Error: "Access Denied"

**Solution:** Your admin credentials don't have IAM permissions. You need:
- `iam:CreateUser`
- `iam:CreatePolicy`
- `iam:AttachUserPolicy`
- `iam:CreateAccessKey`

### Error: "User already exists"

**Solution:** The user `enablement-portal-api` already exists. The script will ask if you want to create new access keys.

### Error: "Policy file not found"

**Solution:** Ensure you're running from the project root:
```bash
cd /path/to/enablement
./infra/scripts/create-iam-user.sh
```

## Next Steps

After creating the IAM user:

1. **Get environment variable values:**
   ```bash
   ./infra/scripts/update-web-env-from-cdk.sh --amplify-format
   ```

2. **Deploy CDK stack (if not deployed):**
   ```bash
   npm run cdk:deploy
   ```

3. **Use the new credentials:**
   - The script may have updated your credentials file automatically
   - Or configure manually: `aws configure`
   - Or use a profile: `aws configure --profile enablement-portal-api`

## Security Best Practices

✅ **Do:**
- Use IAM users instead of root credentials
- Rotate access keys every 90 days
- Store credentials securely (`~/.aws/credentials` with 600 permissions)
- Never commit credentials to git

❌ **Don't:**
- Share credentials between team members
- Use overly permissive IAM policies
- Store credentials in code or config files
- Use root user access keys for daily work




