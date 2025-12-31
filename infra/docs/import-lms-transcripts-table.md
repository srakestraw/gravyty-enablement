# Import Existing lms_transcripts Table into CloudFormation

## Overview

The `lms_transcripts` DynamoDB table was created in a previous deployment but is not currently tracked by CloudFormation. This document explains how to import it into the stack.

## Prerequisites

- AWS CLI configured with appropriate credentials
- CDK CLI installed
- Access to the AWS account where the table exists

## Step 1: Verify Table Exists

```bash
aws dynamodb describe-table --table-name lms_transcripts --region us-east-1
```

Expected output should show the table with:
- Partition key: `transcript_id` (String)
- GSI: `by_lesson_id` with partition key `lesson_id` and sort key `lesson_id#created_at`

## Step 2: Generate Import Mapping

Create a file `import-mapping.json` with the following content:

```json
{
  "LmsTranscriptsF89DDEE3": {
    "TableName": "lms_transcripts"
  }
}
```

The logical ID `LmsTranscriptsF89DDEE3` matches the CDK construct ID in `enablement-portal-stack.ts`.

## Step 3: Run CDK Import

From the `infra` directory:

```bash
cd infra
npx cdk import --resource-mapping-file import-mapping.json EnablementPortalStack
```

This command will:
1. Read the import mapping file
2. Verify the table exists in DynamoDB
3. Create a changeset to import the table into CloudFormation
4. Prompt for confirmation before applying

## Step 4: Review and Confirm

CDK will show you a preview of the import operation. Review it carefully:

- **Resource Type**: `AWS::DynamoDB::Table`
- **Logical ID**: `LmsTranscriptsF89DDEE3`
- **Physical ID**: `lms_transcripts`

If everything looks correct, confirm the import.

## Step 5: Deploy the Stack

After successful import, deploy the stack to ensure everything is synchronized:

```bash
npx cdk deploy --require-approval never
```

## Alternative: Manual CloudFormation Import

If CDK import doesn't work, you can use AWS CloudFormation Console:

1. Go to AWS CloudFormation Console
2. Select `EnablementPortalStack`
3. Click "Stack actions" → "Import resources into stack"
4. Select "DynamoDB table" as resource type
5. Enter:
   - **Logical ID**: `LmsTranscriptsF89DDEE3`
   - **Table name**: `lms_transcripts`
6. Review and import

## Verification

After import, verify the table is tracked:

```bash
aws cloudformation describe-stack-resources \
  --stack-name EnablementPortalStack \
  --logical-resource-id LmsTranscriptsF89DDEE3 \
  --region us-east-1
```

You should see the table resource with its physical ID `lms_transcripts`.

## Troubleshooting

### Error: "Resource already exists"
- The table might already be imported. Check CloudFormation stack resources.
- If it's imported with a different logical ID, you may need to update references.

### Error: "Table not found"
- Verify the table name is correct: `lms_transcripts`
- Check the AWS region (should be `us-east-1`)

### Error: "Import mapping file not found"
- Ensure the file path is correct relative to where you're running the command
- Use absolute path if needed: `/full/path/to/import-mapping.json`

## Notes

- Importing a resource does not modify the resource itself, only adds it to CloudFormation tracking
- After import, the table will be managed by CloudFormation (deletion policies, updates, etc.)
- The table has `RemovalPolicy.RETAIN`, so it won't be deleted if the stack is deleted

