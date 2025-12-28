# Step-by-Step: Configure AWS Credentials

This guide will help you configure AWS credentials so you can run scripts to get environment variable values from your CDK stack.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed (check with `aws --version`)

## Method 1: AWS Login (Recommended - Most Secure)

This method uses browser-based authentication and doesn't require long-lived access keys.

### Step 1: Check if AWS CLI is Installed

```bash
aws --version
```

If not installed:
- **macOS**: `brew install awscli`
- **Linux**: See installation guide below
- **Windows**: Download from https://aws.amazon.com/cli/

### Step 2: Run AWS Login

```bash
aws login
```

This will:
1. Open your browser to AWS console login
2. Prompt you to authenticate with your AWS account
3. Store temporary credentials locally
4. Automatically refresh when needed

### Step 3: Verify Connection

```bash
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

✅ **If you see this, credentials are configured correctly!**

### Step 4: Test CDK Stack Access

```bash
aws cloudformation describe-stacks --stack-name EnablementPortalStack --query 'Stacks[0].StackStatus' --output text
```

If the stack exists, you'll see: `CREATE_COMPLETE` or `UPDATE_COMPLETE`
If it doesn't exist, you'll see an error (that's okay - you can deploy it later)

---

## Method 2: AWS Configure (Traditional Method)

If `aws login` doesn't work for your setup, use this method.

### Step 1: Get AWS Access Keys

**Option A: Create IAM User Access Keys (Recommended)**

1. Go to AWS Console → IAM → Users
2. Click "Create user" or select existing user
3. Attach policies:
   - `AmazonDynamoDBFullAccess` (or custom policy)
   - `AmazonS3FullAccess` (or custom policy)
   - `AmazonCognitoPowerUser` (for Cognito access)
   - `CloudFormationFullAccess` (for CDK)
4. Go to "Security credentials" tab
5. Click "Create access key"
6. Choose "Command Line Interface (CLI)"
7. **Save both values**:
   - Access Key ID
   - Secret Access Key (shown only once!)

**Option B: Use Root User (Not Recommended)**

⚠️ **Security Warning**: Only use root user keys if absolutely necessary.

1. Go to: https://console.aws.amazon.com/iam/home#/security_credentials
2. Expand "Access keys"
3. Click "Create access key"
4. Save both values

### Step 2: Run AWS Configure

```bash
aws configure
```

You'll be prompted for 4 values:

1. **AWS Access Key ID**: Paste your Access Key ID
2. **AWS Secret Access Key**: Paste your Secret Access Key
3. **Default region name**: Enter `us-east-1` (or your preferred region)
4. **Default output format**: Enter `json`

**Example:**
```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

### Step 3: Verify Connection

```bash
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

✅ **If you see this, credentials are configured correctly!**

### Step 4: Test CDK Stack Access

```bash
aws cloudformation describe-stacks --stack-name EnablementPortalStack --query 'Stacks[0].StackStatus' --output text
```

---

## Method 3: Use Configuration Script

We have a helper script that guides you through the process:

```bash
./infra/scripts/configure-aws-credentials.sh
```

This script will:
1. Check if AWS CLI is installed
2. Guide you through configuration
3. Verify credentials work
4. Test connection to AWS

---

## Troubleshooting

### Error: "Unable to locate credentials"

**Solution:**
- Run `aws configure` or `aws login`
- Check that `~/.aws/credentials` file exists
- Verify credentials are correct

### Error: "Partial credentials found"

**Solution:**
- Your credentials file is incomplete
- Run `aws configure` again to fix it
- Or manually edit `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
region = us-east-1
```

### Error: "Access Denied"

**Solution:**
- Your IAM user doesn't have the right permissions
- Add these policies to your IAM user:
  - `AmazonDynamoDBFullAccess`
  - `AmazonS3FullAccess`
  - `AmazonCognitoPowerUser`
  - `CloudFormationFullAccess`
  - `AmazonAPIGatewayFullAccess`

### Error: "Stack not found"

**Solution:**
- The CDK stack hasn't been deployed yet
- Deploy it with: `npm run cdk:deploy`
- Or check if the stack name is different

---

## Next Steps

Once credentials are configured:

1. **Get environment variable values:**
   ```bash
   ./infra/scripts/update-web-env-from-cdk.sh --amplify-format
   ```

2. **Deploy CDK stack (if not deployed):**
   ```bash
   npm run cdk:deploy
   ```

3. **Verify stack outputs:**
   ```bash
   aws cloudformation describe-stacks --stack-name EnablementPortalStack --query 'Stacks[0].Outputs' --output table
   ```

---

## Security Best Practices

✅ **Do:**
- Use `aws login` when possible (no long-lived keys)
- Create IAM users with least-privilege permissions
- Rotate access keys regularly
- Never commit credentials to git

❌ **Don't:**
- Use root user access keys for daily work
- Share credentials between team members
- Store credentials in code or config files
- Use overly permissive IAM policies

