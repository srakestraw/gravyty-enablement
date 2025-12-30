# AWS Setup Guide

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install AWS CLI v2
3. **AWS Credentials**: Configure credentials for programmatic access

## Step 1: Install AWS CLI

### macOS
```bash
# Using Homebrew
brew install awscli

# Or download from AWS
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Linux
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Windows
Download and run the MSI installer from: https://aws.amazon.com/cli/

## Step 2: Configure AWS Credentials

### Option A: AWS Configure (Interactive)
```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Your access key
- **AWS Secret Access Key**: Your secret key
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### Option C: IAM Role (for EC2/Lambda)
If running on AWS infrastructure, use IAM roles instead of access keys.

## Step 3: Verify AWS Connection

```bash
aws sts get-caller-identity
```

Should return your AWS account ID and user ARN.

## Step 4: Set Up AWS Resources

### Using the Setup Script

```bash
# Make script executable
chmod +x infra/scripts/setup-aws.sh

# Run setup script
./infra/scripts/setup-aws.sh
```

The script will:
1. ✅ Verify AWS CLI and credentials
2. ✅ Create 4 DynamoDB tables (content_registry, notifications, subscriptions, events)
3. ✅ Create S3 bucket (enablement-content)
4. ✅ Enable versioning and encryption on S3 bucket

### Using Node.js Script (Alternative)

```bash
cd apps/api
tsx ../../infra/scripts/create-tables.ts
```

Then manually create S3 bucket:
```bash
aws s3 mb s3://enablement-content --region us-east-1
aws s3api put-bucket-versioning \
  --bucket enablement-content \
  --versioning-configuration Status=Enabled
```

## Step 5: Configure Environment Variables

Create `apps/api/.env`:

```bash
STORAGE_BACKEND=aws
AWS_REGION=us-east-1
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
ENABLEMENT_CONTENT_BUCKET=enablement-content
PORT=4000
```

## Step 6: Verify Setup

### Check DynamoDB Tables
```bash
aws dynamodb list-tables --region us-east-1
```

Should show:
- content_registry
- notifications
- subscriptions
- events

### Check S3 Bucket
```bash
aws s3 ls s3://enablement-content
```

### Test API Connection
```bash
# Start API server
cd apps/api
npm run dev

# In another terminal, test health endpoint
curl http://localhost:4000/health
```

## Required IAM Permissions

Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/content_registry",
        "arn:aws:dynamodb:*:*:table/content_registry/index/*",
        "arn:aws:dynamodb:*:*:table/notifications",
        "arn:aws:dynamodb:*:*:table/subscriptions",
        "arn:aws:dynamodb:*:*:table/events"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutBucketVersioning",
        "s3:PutBucketEncryption"
      ],
      "Resource": [
        "arn:aws:s3:::enablement-content",
        "arn:aws:s3:::enablement-content/*"
      ]
    }
  ]
}
```

## Troubleshooting

### "AWS CLI not found"
- Install AWS CLI (see Step 1)
- Verify installation: `aws --version`

### "Unable to locate credentials"
- Run `aws configure`
- Or set environment variables (see Step 2)

### "Access Denied"
- Check IAM permissions
- Verify your AWS account has DynamoDB and S3 access

### "Bucket already exists"
- Bucket names are globally unique
- Choose a different name or use existing bucket
- Update `ENABLEMENT_CONTENT_BUCKET` in `.env`

### "Table already exists"
- Tables may have been created previously
- This is OK - the script will skip creation
- Verify tables exist: `aws dynamodb list-tables`

## Next Steps

After AWS setup:
1. ✅ Start API server: `npm run dev --workspace=apps/api`
2. ✅ Start web app: `npm run dev --workspace=apps/web`
3. ✅ Test file upload/download flow
4. ✅ Verify DynamoDB data persistence





