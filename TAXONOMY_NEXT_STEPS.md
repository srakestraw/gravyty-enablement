# Taxonomy Implementation - Next Steps Guide

This guide walks you through setting up and running the taxonomy system.

## Prerequisites

1. **DynamoDB Local** (choose one):
   - **Option A**: Docker DynamoDB Local (recommended if Docker available)
   - **Option B**: Dynalite (Node-based, no Docker required)

2. **Environment Variables**:
   - `DYNAMODB_ENDPOINT=http://localhost:8000` (for local development)
   - `TAXONOMY_TABLE=taxonomy` (default)
   - `ADMIN_USER_ID=<your-admin-user-id>` (for migration script)

## Step 1: Start Local DynamoDB

### Option A: Docker DynamoDB Local

```bash
# Start DynamoDB Local container
docker run -d -p 8000:8000 --name dynamodb-local-taxonomy amazon/dynamodb-local

# Verify it's running
curl http://localhost:8000
# Should return: {"__type":"com.amazon.coral.service#ServiceException",...}

# If container already exists, start it:
docker start dynamodb-local-taxonomy
```

### Option B: Dynalite (No Docker Required)

```bash
# Install dynalite if not already installed
npm install -g dynalite

# Start Dynalite (in a separate terminal)
tsx scripts/lms/start_local_dynamo.ts

# Or use npm script if available
npm run dynamo:local
```

## Step 2: Create Taxonomy Table

The taxonomy table definition has been added to `scripts/lms/local_dynamo_setup.ts`. Run the setup script:

```bash
cd /Users/scott.rakestraws/Documents/Projects/enablement

# Set environment variables
export DYNAMODB_ENDPOINT=http://localhost:8000
export AWS_REGION=us-east-1

# Create all tables (including taxonomy table)
tsx scripts/lms/local_dynamo_setup.ts
```

Expected output:
```
Setting up local DynamoDB tables for Phase 9...
Endpoint: http://localhost:8000
Region: us-east-1

✅ Created table: lms_courses
✅ Created table: lms_lessons
✅ Created table: lms_progress
✅ Created table: lms_paths
✅ Created table: lms_assignments
✅ Created table: lms_certificates
✅ Created table: taxonomy  <-- New taxonomy table
⏭️  Table already exists: events
```

## Step 3: Verify Taxonomy Table

You can verify the table was created:

```bash
# Using AWS CLI (if configured)
aws dynamodb describe-table --table-name taxonomy --endpoint-url http://localhost:8000

# Or check via the API (if running)
curl http://localhost:4000/health
```

## Step 4: Run Migration Script (Optional)

**Note**: Only run this if you have existing courses/resources with string-based taxonomy fields that need to be migrated to taxonomy IDs.

```bash
# Set environment variables
export DYNAMODB_ENDPOINT=http://localhost:8000
export AWS_REGION=us-east-1
export ADMIN_USER_ID=migration_script  # Or your actual admin user ID
export LMS_COURSES_TABLE=lms_courses
export TAXONOMY_TABLE=taxonomy

# Run migration
tsx scripts/taxonomy/migrate-taxonomy.ts
```

Expected output:
```
🚀 Starting taxonomy migration...

📊 Extracting distinct taxonomy values from courses...
  Found X unique product suites
  Found Y unique product concepts
  Found Z unique topic tags

📝 Creating taxonomy options for product_suite...
  ✅ Created: Suite Name -> option_id_123
  ...

📝 Creating taxonomy options for product_concept...
  ...

📝 Creating taxonomy options for topic_tag...
  ...

🔄 Updating courses with taxonomy IDs...
  ✅ Updated course: course_123
  ...

📊 Migration Summary:
  Product Suites: X created
  Product Concepts: Y created
  Topic Tags: Z created
  Courses Updated: N

✅ Migration completed successfully!
```

## Step 5: Start API Server

Start the API server with DynamoDB endpoint:

```bash
cd apps/api

# Set environment variables
export DYNAMODB_ENDPOINT=http://localhost:8000
export AWS_REGION=us-east-1
export TAXONOMY_TABLE=taxonomy
export LMS_COURSES_TABLE=lms_courses
export LMS_LESSONS_TABLE=lms_lessons
export LMS_PATHS_TABLE=lms_paths
export LMS_PROGRESS_TABLE=lms_progress
export LMS_ASSIGNMENTS_TABLE=lms_assignments
export LMS_CERTIFICATES_TABLE=lms_certificates

# Start API
npm run dev
```

## Step 6: Test Taxonomy API

### List Taxonomy Options

```bash
# List product suites
curl "http://localhost:4000/v1/taxonomy/product_suite/options" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: test_user"

# List product concepts (filtered by parent suite)
curl "http://localhost:4000/v1/taxonomy/product_concept/options?parent_id=<suite_option_id>" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: test_user"

# List topic tags with query
curl "http://localhost:4000/v1/taxonomy/topic_tag/options?query=marketing" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: test_user"
```

### Create Taxonomy Option (Admin Only)

```bash
# Create a new product suite
curl -X POST "http://localhost:4000/v1/taxonomy/product_suite/options" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user" \
  -d '{
    "label": "New Product Suite",
    "slug": "new-product-suite",
    "sort_order": 0
  }'
```

### Update Taxonomy Option (Admin Only)

```bash
# Archive an option
curl -X PATCH "http://localhost:4000/v1/taxonomy/options/<option_id>" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user" \
  -d '{
    "archived_at": "2024-01-01T00:00:00Z"
  }'
```

## Step 7: Test UI Components

1. **Start Web App**:
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Navigate to Course Editor**:
   - Go to `/admin/learning/courses/new` or edit an existing course
   - You should see:
     - `TaxonomySelect` components for Product Suite and Product Concept
     - `TaxonomyMultiSelect` component for Topic Tags
     - Typeahead search functionality
     - "Create new" option (if you're an Admin)

3. **Test Features**:
   - Type to search for options
   - Select an option (Enter key or click)
   - Create new option (Admin only, when query doesn't match)
   - Product Concept should filter by selected Product Suite

## Troubleshooting

### Table Creation Fails

**Error**: `ECONNREFUSED` or connection errors
- **Solution**: Ensure DynamoDB Local is running on port 8000
- Check: `curl http://localhost:8000`

### Migration Script Fails

**Error**: `Taxonomy option not found` or similar
- **Solution**: Ensure taxonomy table exists and is accessible
- Verify: Check table exists with `aws dynamodb list-tables --endpoint-url http://localhost:8000`

### API Returns 404 for Taxonomy Endpoints

**Error**: Route not found
- **Solution**: Ensure taxonomy routes are registered in `apps/api/src/server.ts`
- Verify: Check that `taxonomyRoutes` is imported and mounted

### UI Components Don't Load Options

**Error**: Options list is empty or loading forever
- **Solution**: 
  1. Check browser console for API errors
  2. Verify API is running and accessible
  3. Check network tab for failed requests
  4. Ensure CORS is configured correctly

## Production Deployment

For production deployment:

1. **Create Taxonomy Table via CDK**:
   - Add taxonomy table definition to `infra/lib/enablement-portal-stack.ts`
   - Deploy: `cd infra && cdk deploy`

2. **Set Environment Variables**:
   ```bash
   TAXONOMY_TABLE=taxonomy-prod
   AWS_REGION=us-east-1
   # No DYNAMODB_ENDPOINT (uses real AWS DynamoDB)
   ```

3. **Run Migration**:
   - Run migration script against production DynamoDB
   - Ensure proper AWS credentials are configured
   - Use production admin user ID

4. **Verify**:
   - Test API endpoints
   - Test UI components
   - Verify data migration completed successfully

## Additional Resources

- **Test Documentation**: `docs/testing/taxonomy-tests.md`
- **Implementation Summary**: `TAXONOMY_IMPLEMENTATION_SUMMARY.md`
- **Migration Script**: `scripts/taxonomy/migrate-taxonomy.ts`

