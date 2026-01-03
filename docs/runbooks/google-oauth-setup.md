# Google OAuth Setup Guide

This guide walks you through configuring Google OAuth credentials for Cognito authentication.

## Prerequisites

- CDK stack deployed (`npm run cdk:deploy`)
- Google Cloud account
- AWS CLI configured with appropriate permissions

## Quick Setup (Automated)

Run the automated setup script:

```bash
./infra/scripts/configure-google-oauth.sh
```

This script will:
1. Get Cognito domain from CDK stack
2. Guide you through Google Cloud Console setup
3. Prompt for Client ID and Client Secret
4. Store credentials in SSM Parameter Store
5. Update Cognito Identity Provider
6. Verify configuration

## Manual Setup

### Step 1: Get Cognito Domain

```bash
# Get Cognito domain from CDK outputs
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text
```

Example output: `enablement-portal-12345678.auth.us-east-1.amazoncognito.com`

### Step 2: Create Google OAuth Credentials

1. **Go to Google Cloud Console**:
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Select your project (or create a new one)

2. **Enable Google+ API** (if not already enabled):
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Client ID**:
   - Go back to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: External (or Internal if using Google Workspace)
     - App name: "Enablement Portal"
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Scopes: Leave default (email, profile, openid)
     - Click "Save and Continue"
     - Test users: Add your email (if using External)
     - Click "Save and Continue"

4. **Configure OAuth Client**:
   - Application type: **Web application**
   - Name: `Enablement Portal` (or your preferred name)
   - **Authorized redirect URIs**: Add these:
     ```
     https://<cognito-domain>/oauth2/idpresponse
     ```
     Example:
     ```
     https://enablement-portal-12345678.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     ```
   - Click "Create"

5. **Copy Credentials**:
   - Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
   - Copy the **Client Secret** (looks like: `GOCSPX-abc123...`)
   - Save these securely

### Step 3: Store Credentials in SSM

```bash
# Get SSM parameter names from CDK outputs
CLIENT_ID_PARAM=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`GoogleClientIdParamName`].OutputValue' \
  --output text)

CLIENT_SECRET_PARAM=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`GoogleClientSecretParamName`].OutputValue' \
  --output text)

# Store Client ID
aws ssm put-parameter \
  --name "$CLIENT_ID_PARAM" \
  --value "YOUR_CLIENT_ID" \
  --type String \
  --overwrite

# Store Client Secret (as SecureString)
aws ssm put-parameter \
  --name "$CLIENT_SECRET_PARAM" \
  --value "YOUR_CLIENT_SECRET" \
  --type SecureString \
  --overwrite
```

### Step 4: Update Cognito Identity Provider

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Update Identity Provider
aws cognito-idp update-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-details "client_id=YOUR_CLIENT_ID,client_secret=YOUR_CLIENT_SECRET,authorize_scopes=openid email profile"
```

### Step 5: Verify Configuration

```bash
# Check Identity Provider
aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google
```

You should see the provider details with your Client ID.

## Callback URLs Explained

### Cognito Redirect URI

The main redirect URI that Cognito uses:
```
https://<cognito-domain>/oauth2/idpresponse
```

This is where Google redirects users after authentication. Cognito then processes the OAuth response and redirects to your web app.

### Web App Redirect URIs

Configured in Amplify/Cognito User Pool Client:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev port)
- Your production domain (when deployed)

These are where Cognito redirects users after successful authentication.

## Testing

1. **Start web app**:
   ```bash
   npm run dev:web
   ```

2. **Click "Sign In with Google"** in the header

3. **You should be redirected to**:
   - Google sign-in page
   - After authentication, back to your app

4. **Check CloudWatch Logs** (if issues):
   ```bash
   # Get Lambda function name
   FUNCTION_NAME=$(aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' \
     --output text)
   
   # View logs
   aws logs tail /aws/lambda/$FUNCTION_NAME --follow
   ```

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: Google shows "redirect_uri_mismatch" error

**Solution**: 
- Verify the redirect URI in Google Cloud Console exactly matches:
  ```
  https://<cognito-domain>/oauth2/idpresponse
  ```
- Check for trailing slashes or typos
- Ensure HTTPS is used (not HTTP)

### "Invalid Client" Error

**Problem**: Cognito shows "Invalid Client" error

**Solution**:
- Verify Client ID and Client Secret are correct in SSM
- Check that the Identity Provider was updated:
  ```bash
  aws cognito-idp describe-identity-provider \
    --user-pool-id $USER_POOL_ID \
    --provider-name Google
  ```

### Users Not Appearing in Cognito

**Problem**: Users sign in but don't appear in Cognito User Pool

**Solution**:
- This is normal! Federated users are created on first sign-in
- Check Cognito User Pool → Users after first authentication
- Users will have email from Google account

### "Access Denied" After Sign-In

**Problem**: User signs in but gets access denied errors

**Solution**:
- User needs to be assigned to a Cognito group:
  ```bash
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username user@example.com \
    --group-name Viewer
  ```
- Default role is Viewer if no groups assigned

## Updating Credentials

If you need to update credentials:

1. **Update in Google Cloud Console** (if regenerating secret)
2. **Update SSM parameters**:
   ```bash
   aws ssm put-parameter \
     --name "$CLIENT_ID_PARAM" \
     --value "NEW_CLIENT_ID" \
     --type String \
     --overwrite
   
   aws ssm put-parameter \
     --name "$CLIENT_SECRET_PARAM" \
     --value "NEW_CLIENT_SECRET" \
     --type SecureString \
     --overwrite
   ```
3. **Update Cognito Identity Provider** (same as Step 4 above)

## Security Best Practices

1. **Never commit credentials** to git
2. **Use SecureString** for Client Secret in SSM
3. **Rotate credentials** periodically
4. **Limit OAuth consent screen** to necessary scopes
5. **Monitor CloudWatch Logs** for suspicious activity

## Related Documentation

- [Authentication Architecture](../architecture/auth.md)
- [Local Development Runbook](./local-dev.md)
- [Deployment Guide](../architecture/deployment.md)







