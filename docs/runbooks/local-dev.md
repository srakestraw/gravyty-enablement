# Local Development Runbook

## Prerequisites

- Node.js 18+ (recommended: use nvm or similar)
- npm (comes with Node.js)
- Git
- AWS CLI configured (for Cognito setup)
- Google Cloud account (for OAuth credentials)

## Installation

### 1. Install All Dependencies

```bash
# From project root - installs all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- `/packages/design-system`
- `/packages/domain`
- `/apps/web`
- `/apps/api`

### 2. Build Packages

```bash
# Build domain package (required for API and web app)
npm run build --workspace=packages/domain

# Build design system package (required for web app)
npm run build --workspace=packages/design-system
```

Or build all packages:

```bash
npm run build
```

## Development Workflow

### Deploying API to AWS Lambda

**Prerequisites**:
- CDK stack deployed (DynamoDB tables and S3 bucket exist)
- AWS credentials configured

**Steps**:

1. **Build API for Lambda**:
   ```bash
   ./infra/scripts/build-api-for-lambda.sh
   ```

2. **Deploy Stack** (includes Lambda + API Gateway):
   ```bash
   npm run cdk:deploy
   ```

3. **Get API URL**:
   ```bash
   ./infra/scripts/get-api-url.sh
   ```

4. **Test Deployed API**:
   ```bash
   API_URL=$(./infra/scripts/get-api-url.sh)
   curl $API_URL/health
   curl $API_URL/v1/content -H "x-dev-role: Viewer"
   ```

5. **Update Web App** (optional):
   ```bash
   # Set VITE_API_BASE_URL in apps/web/.env.local
   echo "VITE_API_BASE_URL=$API_URL" >> apps/web/.env.local
   ```

**Note**: The Lambda function uses the same codebase as local dev, but runs in AWS with IAM role-based permissions (no access keys needed).

### Running the API Server (Local)

```bash
# From project root
npm run dev --workspace=apps/api

# Or from apps/api directory
cd apps/api
npm run dev
```

The API server will start on `http://localhost:4000`.

**Note**: The API server must be running for the web app to function properly.

#### Storage Backend Configuration

The API supports two storage backends:

**1. Stub Backend (Default)**
- In-memory storage
- No AWS credentials required
- Good for local development and testing
- Set `STORAGE_BACKEND=stub` in `.env` (or leave unset)

**2. AWS DynamoDB Backend**
- Requires AWS credentials configured
- Requires DynamoDB tables and S3 bucket to be created (via CDK)
- Set `STORAGE_BACKEND=aws` in `.env`
- See "AWS Infrastructure Setup (CDK)" section below for deployment steps

**Environment Variables** (create `apps/api/.env` from `.env.example`):

For stub backend:
```bash
STORAGE_BACKEND=stub
PORT=4000
```

For AWS backend (after CDK deployment):
```bash
STORAGE_BACKEND=aws
AWS_REGION=us-east-1
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
ENABLEMENT_CONTENT_BUCKET=<bucket-name-from-cdk-outputs>
PORT=4000
```

**Note**: File upload/download requires AWS backend (`STORAGE_BACKEND=aws`) and S3 bucket to be created.

#### AWS Infrastructure Setup (CDK)

**Prerequisites:**
- AWS CLI installed and configured
- AWS credentials configured (via `aws configure` or environment variables)
- CDK CLI installed: `npm install -g aws-cdk`

**Deploy Infrastructure:**

```bash
# Set AWS profile (optional, if using named profiles)
export AWS_PROFILE=enablement

# From project root - use npm scripts
npm run cdk:bootstrap  # First time only per AWS account/region
npm run cdk:deploy     # Deploy stack (creates DynamoDB tables + S3 bucket)

# Or manually:
cd infra
npm install
cdk bootstrap  # First time only
cdk deploy
```

The CDK stack creates:
- ✅ 4 DynamoDB tables: `content_registry`, `notifications`, `subscriptions`, `events`
- ✅ GSIs on `content_registry`: `by_status_updated`, `by_product`
- ✅ S3 bucket with versioning, encryption, CORS, and block public access
- ✅ CloudFormation outputs for all resource names

**Get Resource Names:**

After deployment, retrieve resource names from CDK outputs:

```bash
# Auto-update API .env with all outputs
./infra/scripts/update-api-env-from-cdk.sh

# Or get outputs manually via AWS CLI
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

**Update API Environment:**

After CDK deployment, automatically update `apps/api/.env` with all resource names:

```bash
# Auto-update .env from CDK outputs
./infra/scripts/update-api-env-from-cdk.sh
```

**Configure Cognito Google IdP:**

**Option 1: Automated Setup (Recommended)**

```bash
./infra/scripts/configure-google-oauth.sh
```

This script will guide you through the entire process.

**Option 2: Manual Setup**

See detailed guide: [Google OAuth Setup Runbook](./google-oauth-setup.md)

Quick steps:
1. Get Cognito domain from CDK outputs
2. Create Google OAuth credentials in Google Cloud Console
3. Add redirect URI: `https://<cognito-domain>/oauth2/idpresponse`
4. Store credentials in SSM Parameter Store
5. Update Cognito Identity Provider

5. **Assign Users to Groups**:
   ```bash
   USER_POOL_ID=$(aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
     --output text)
   
   # Add user to Contributor group
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com \
     --group-name Contributor
   ```

Or manually:

```bash
# Copy example file
cp apps/api/.env.example apps/api/.env

# Edit .env and set:
STORAGE_BACKEND=aws
AWS_REGION=us-east-1
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
ENABLEMENT_CONTENT_BUCKET=<bucket-name-from-cdk-outputs>
```

**Alternative: Manual Table Creation**

If you prefer not to use CDK, create tables manually:

```bash
# Ensure AWS credentials are configured
aws configure

# Create tables using the script
cd apps/api
tsx ../../infra/scripts/create-tables.ts
```

Or manually create tables using AWS CLI or Console (see `/docs/architecture/data-model.md` for table schemas).

#### Creating S3 Bucket

**Option 1: Using CDK (Recommended - Already Included Above)**

```bash
# Install CDK CLI (if not installed)
npm install -g aws-cdk

# Navigate to infra directory
cd infra

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy stack
cdk deploy

# Get bucket name from outputs
cd infra
./scripts/get-bucket-name.sh

# Or using AWS CLI
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ContentBucketName`].OutputValue' \
  --output text
```

The CDK stack creates:
- ✅ S3 bucket with versioning
- ✅ Encryption enabled
- ✅ Block public access
- ✅ CORS configured for localhost:5173 and localhost:3000
- ✅ Outputs bucket name for easy reference

**Option 2: Manual Creation (Alternative)**

```bash
# Create bucket
aws s3 mb s3://enablement-content --region us-east-1

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket enablement-content \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket enablement-content \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket enablement-content \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Set CORS (for presigned URL uploads)
aws s3api put-bucket-cors \
  --bucket enablement-content \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
      "AllowedHeaders": ["Content-Type", "x-amz-*", "Authorization"],
      "ExposedHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3600
    }]
  }'
```

**End-to-End Upload/Download Test**:

1. **Ensure API is running**:
   ```bash
   STORAGE_BACKEND=aws npm run dev:api
   ```

2. **Create Draft content** (Contributor role):
   ```bash
   CONTENT_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/content \
     -H "Content-Type: application/json" \
     -H "x-dev-role: Contributor" \
     -H "x-dev-user-id: test-user" \
     -d '{"title":"Test Document","summary":"Test upload/download","status":"Draft","owner":"test-user"}')
   
   CONTENT_ID=$(echo $CONTENT_RESPONSE | jq -r '.data.id')
   echo "Created content: $CONTENT_ID"
   ```

3. **Get presigned upload URL**:
   ```bash
   PRESIGN_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/uploads/presign \
     -H "Content-Type: application/json" \
     -H "x-dev-role: Contributor" \
     -H "x-dev-user-id: test-user" \
     -d "{\"content_id\":\"$CONTENT_ID\",\"filename\":\"test.pdf\",\"content_type\":\"application/pdf\"}")
   
   UPLOAD_URL=$(echo $PRESIGN_RESPONSE | jq -r '.data.upload_url')
   S3_KEY=$(echo $PRESIGN_RESPONSE | jq -r '.data.s3_key')
   S3_BUCKET=$(echo $PRESIGN_RESPONSE | jq -r '.data.s3_bucket')
   echo "Upload URL: $UPLOAD_URL"
   ```

4. **Create test PDF** (or use existing file):
   ```bash
   # Create a simple test file
   echo "Test PDF content" > test.pdf
   FILE_SIZE=$(stat -f%z test.pdf)  # macOS
   # FILE_SIZE=$(stat -c%s test.pdf)  # Linux
   ```

5. **Upload file to S3**:
   ```bash
   curl -X PUT "$UPLOAD_URL" \
     -H "Content-Type: application/pdf" \
     --data-binary "@test.pdf"
   ```

6. **Attach file metadata**:
   ```bash
   curl -X POST http://localhost:4000/v1/content/$CONTENT_ID/attach \
     -H "Content-Type: application/json" \
     -H "x-dev-role: Contributor" \
     -H "x-dev-user-id: test-user" \
     -d "{\"s3_bucket\":\"$S3_BUCKET\",\"s3_key\":\"$S3_KEY\",\"filename\":\"test.pdf\",\"content_type\":\"application/pdf\",\"size_bytes\":$FILE_SIZE}"
   ```

7. **Verify file attached**:
   ```bash
   curl -s http://localhost:4000/v1/content/$CONTENT_ID | jq '.data | {file_name, size_bytes, uploaded_at}'
   ```

8. **Approve content** (Approver role):
   ```bash
   curl -X POST http://localhost:4000/v1/content/$CONTENT_ID/approve \
     -H "x-dev-role: Approver"
   ```

9. **Download file** (Viewer role):
   ```bash
   DOWNLOAD_RESPONSE=$(curl -s http://localhost:4000/v1/content/$CONTENT_ID/download \
     -H "x-dev-role: Viewer")
   
   DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | jq -r '.data.download_url')
   echo "Download URL: $DOWNLOAD_URL"
   # Open in browser or download:
   # open "$DOWNLOAD_URL"  # macOS
   # xdg-open "$DOWNLOAD_URL"  # Linux
   ```

10. **Test Draft download restriction** (should fail):
    ```bash
    # Create another Draft content
    DRAFT_CONTENT=$(curl -s -X POST http://localhost:4000/v1/content \
      -H "Content-Type: application/json" \
      -H "x-dev-role: Contributor" \
      -H "x-dev-user-id: owner-user" \
      -d '{"title":"Draft Only","summary":"Test","status":"Draft","owner":"owner-user"}')
    
    DRAFT_ID=$(echo $DRAFT_CONTENT | jq -r '.data.id')
    
    # Try to download as different user (should fail)
    curl -s http://localhost:4000/v1/content/$DRAFT_ID/download \
      -H "x-dev-role: Viewer" \
      -H "x-dev-user-id: different-user" | jq '.error'
    ```

**Web UI Test**:

1. Start web app: `npm run dev:web`
2. Navigate to `/enablement/content`
3. Create Draft content (set role to Contributor in browser dev tools)
4. Open content detail page
5. Upload file using file picker
6. Verify file metadata displays
7. Approve content (set role to Approver)
8. Download file using download button

### Running the Web App

```bash
# From project root
npm run dev --workspace=apps/web

# Or from apps/web directory
cd apps/web
npm run dev
```

The app will start on `http://localhost:5173` (Vite default) and open automatically in your browser.

**Environment Variables** (create `apps/web/.env.local`):
- `VITE_API_BASE_URL`: API base URL (default: `http://localhost:4000`)
- `VITE_COGNITO_USER_POOL_ID`: Cognito User Pool ID (from CDK outputs)
- `VITE_COGNITO_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID (from CDK outputs)
- `VITE_COGNITO_USER_POOL_DOMAIN`: Cognito domain (from CDK outputs)
- `VITE_DEV_ROLE`: Fallback role for dev mode (optional, default: `Viewer`)
- `VITE_DEV_USER_ID`: Fallback user ID for dev mode (optional, default: `dev-user`)

**Authentication**:
- If Cognito is configured: Click "Sign In with Google" to authenticate
- If Cognito is not configured: Uses dev headers (`VITE_DEV_ROLE`, `VITE_DEV_USER_ID`)

### Running Both Together

In separate terminals:

```bash
# Terminal 1: API server
npm run dev --workspace=apps/api

# Terminal 2: Web app
npm run dev --workspace=apps/web
```

Or use a process manager like `concurrently`:

```bash
# Install concurrently globally or add to root package.json
npm install -g concurrently

# Run both
concurrently "npm run dev --workspace=apps/api" "npm run dev --workspace=apps/web"
```

### Running Lint

```bash
# From project root
npm run lint --workspace=apps/web

# Or from apps/web directory
cd apps/web
npm run lint
```

### Type Checking

```bash
# From project root - checks all workspaces
npm run typecheck

# Or check specific workspace
npm run typecheck --workspace=apps/web
```

### Building for Production

```bash
# Build all packages and web app
npm run build

# Or build just the web app
npm run build --workspace=apps/web
```

### Preview Production Build

```bash
cd apps/web
npm run preview
```

## Project Structure

```
/
├── packages/
│   ├── design-system/    # MUI theme and component overrides
│   └── domain/           # Shared domain types and validators
├── apps/
│   ├── web/              # Web application (React + Vite)
│   └── api/              # API server (Express, Lambda-ready)
└── infra/                # CDK infrastructure (placeholder)
```

## API Development

### Testing API Endpoints

**Smoke Test (Recommended):**

Run the automated smoke test script:

```bash
# Ensure API is running first
npm run dev:api

# In another terminal, run smoke test
npm run smoke-test

# Or with custom API URL
API_BASE_URL=http://localhost:4000 ./infra/scripts/smoke-test.sh
```

**Manual Testing:**

Use curl or a tool like Postman/Insomnia:

```bash
# List content
curl http://localhost:4000/v1/content

# Get content by ID
curl http://localhost:4000/v1/content/1

# Create content (requires Contributor+ role)
curl -X POST http://localhost:4000/v1/content \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Contributor" \
  -d '{"title":"Test","summary":"Test summary","status":"Draft","owner":"test-user"}'

# Query assistant
curl -X POST http://localhost:4000/v1/assistant/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is Gravyty?"}'
```

### RBAC Testing

Set the `x-dev-role` header to test different roles:
- `Viewer`: Read-only
- `Contributor`: Can create/update content
- `Approver`: Can approve/deprecate/expire content
- `Admin`: Full access

## Design System Development

### Working with the Theme

1. Edit `/packages/design-system/src/theme.ts`
2. Extract tokens from Figma using MCP
3. Update theme with extracted tokens
4. Test in web app

### Adding Component Overrides

1. Edit `/packages/design-system/src/components.ts`
2. Use MUI component override pattern
3. Reference theme tokens only
4. Document in component-mapping.md

## Figma Integration

Before implementing UI:

1. Use Figma MCP to inspect design
2. Extract design tokens
3. Update theme
4. Implement component
5. Update component-mapping.md

## Troubleshooting

### Common Issues

- **Theme not loading**: Check import paths in web app
- **Design tokens missing**: Extract from Figma and add to theme
- **Component not matching design**: Verify Figma MCP inspection

## Next Steps

- [x] Initialize web app (React + Vite + TypeScript)
- [x] Initialize API server (Express, Lambda-ready)
- [x] Create domain package with shared types
- [x] Wire web app to API
- [x] Configure linting (ESLint)
- [ ] Set up testing (Jest + React Testing Library)
- [x] Configure TypeScript
- [x] Set up build pipeline
- [ ] Extract design tokens from Figma and update theme
- [ ] Replace stub storage with DynamoDB + S3 (Phase 3)
- [ ] Replace RBAC stub with Cognito JWT validation

