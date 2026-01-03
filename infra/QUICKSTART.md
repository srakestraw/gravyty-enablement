# AWS Quick Start

## 🚀 Fastest Path to Setup

### 1. Install AWS CLI (if not installed)

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

**Windows:**
Download from: https://aws.amazon.com/cli/

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region: `us-east-1`
- Default output: `json`

### 3. Verify Connection

```bash
aws sts get-caller-identity
```

Should show your AWS account ID.

### 4. Run Setup Script

```bash
./infra/scripts/setup-aws.sh
```

This creates:
- ✅ 4 DynamoDB tables
- ✅ S3 bucket with versioning

### 5. Configure API

Create `apps/api/.env`:
```bash
STORAGE_BACKEND=aws
AWS_REGION=us-east-1
ENABLEMENT_CONTENT_BUCKET=enablement-content
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
```

### 6. Start Services

```bash
# Terminal 1: API
npm run dev --workspace=apps/api

# Terminal 2: Web
npm run dev --workspace=apps/web
```

## 📚 Full Documentation

See `infra/scripts/setup-aws-guide.md` for detailed instructions.

## 🔍 Troubleshooting

**"aws: command not found"**
→ Install AWS CLI (Step 1)

**"Unable to locate credentials"**
→ Run `aws configure` (Step 2)

**"Access Denied"**
→ Check IAM permissions (see setup-aws-guide.md)







