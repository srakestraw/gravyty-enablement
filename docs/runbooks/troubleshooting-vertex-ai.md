# Troubleshooting Vertex AI Configuration Errors

## Error: "Failed to retrieve GCP service account credentials from SSM: Unknown"

This error occurs when the Lambda function cannot retrieve the GCP service account JSON from AWS SSM Parameter Store.

### Common Causes

1. **SSM Parameter Doesn't Exist**
   - The parameter `/enablement-portal/gcp/service-account-json` hasn't been created yet
   - Solution: Create the parameter using the setup script or AWS CLI

2. **Lambda Doesn't Have SSM Permissions**
   - The Lambda execution role lacks `ssm:GetParameter` permission
   - Solution: Verify IAM permissions in `infra/lib/base-stack.ts`

3. **Wrong Parameter Name**
   - The parameter path doesn't match what's configured
   - Solution: Check `GCP_SERVICE_ACCOUNT_PARAM` environment variable

### Quick Fixes

#### Option 1: Create SSM Parameter (if missing)

```bash
# Use the setup script
./infra/scripts/setup-gcp-vertex-ai.sh --service-account-file /path/to/service-account-key.json

# Or manually with AWS CLI
GCP_SA_JSON=$(cat /path/to/service-account-key.json)
aws ssm put-parameter \
  --name /enablement-portal/gcp/service-account-json \
  --value "$GCP_SA_JSON" \
  --type SecureString \
  --description "GCP Service Account JSON for Vertex AI Imagen" \
  --region us-east-1
```

#### Option 2: Verify Parameter Exists

```bash
aws ssm get-parameter \
  --name /enablement-portal/gcp/service-account-json \
  --with-decryption \
  --region us-east-1
```

If this fails with "ParameterNotFound", create it using Option 1.

#### Option 3: Check Lambda IAM Permissions

Verify the Lambda execution role has permission to read the parameter:

```bash
# Check the stack outputs for the Lambda role ARN
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaRoleArn`].OutputValue' \
  --output text

# Check IAM policy (should include ssm:GetParameter)
aws iam get-role-policy \
  --role-name <role-name> \
  --policy-name <policy-name>
```

The policy should include:
```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter",
    "ssm:GetParameters"
  ],
  "Resource": "arn:aws:ssm:*:*:parameter/enablement-portal/gcp/service-account-json"
}
```

#### Option 4: Use Local Credentials (Development Only)

For local development, you can bypass SSM by setting:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
```

### Verify Configuration

After fixing, test the configuration:

```bash
# Test from API
cd apps/api
npm run test:ai
```

Or check Lambda logs:

```bash
# Get recent logs
aws logs tail /aws/lambda/<lambda-function-name> --follow
```

### Fallback: Use OpenAI Instead

If Vertex AI isn't configured, you can use OpenAI for image generation:

- In the UI, select "OpenAI (DALL-E 3)" as the provider
- Or set `AI_DEFAULT_PROVIDER=openai` environment variable

### Still Having Issues?

1. **Check CloudWatch Logs**: Look for detailed error messages
2. **Verify Environment Variables**: Ensure `GOOGLE_CLOUD_PROJECT` is set in Lambda
3. **Test SSM Access**: Try reading the parameter manually with AWS CLI using the same credentials
4. **Review Setup Guide**: See `docs/runbooks/vertex-ai-setup.md` for complete setup instructions

