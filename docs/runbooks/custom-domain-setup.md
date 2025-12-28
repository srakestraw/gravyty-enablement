# Custom Domain Setup for Cognito

This guide walks through setting up `enablement.gravytylabs.com` as a custom domain for Cognito authentication.

## Prerequisites

- DNS access to `gravytylabs.com` in GoDaddy
- AWS CLI configured with admin permissions
- CDK stack deployed

## Overview

Setting up a custom domain involves:
1. Requesting an SSL certificate in AWS Certificate Manager (ACM)
2. Validating the certificate via DNS
3. Creating a custom domain in Cognito
4. Adding DNS CNAME record in GoDaddy
5. Updating Google OAuth redirect URI
6. Updating web app configuration

## Step-by-Step Setup

### Step 1: Request SSL Certificate

Run the setup script:

```bash
export AWS_PROFILE=admin
./infra/scripts/setup-custom-domain.sh
```

The script will:
- Request an SSL certificate in ACM
- Display DNS validation records

### Step 2: Add DNS Validation Record in GoDaddy

1. Log in to GoDaddy DNS Management
2. Navigate to DNS settings for `gravytylabs.com`
3. Add a CNAME record:
   - **Type**: CNAME
   - **Name**: `_7a5667639948625aed44c36cefc33d7f.enablement`
   - **Value**: `_462ac439eef0663a42852c3793e512ef.jkddzztszm.acm-validations.aws.`
   - **TTL**: 3600 (or default)

4. Save the record

### Step 3: Wait for Certificate Validation

- AWS will automatically validate the certificate once DNS propagates
- This typically takes 5-30 minutes after DNS is added
- Check status using the helper script:
  ```bash
  export AWS_PROFILE=admin
  ./infra/scripts/check-certificate-status.sh
  ```
- Or manually check:
  ```bash
  aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:758742552610:certificate/9c032065-c00f-4915-ab62-127f48ba4446 \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text
  ```
- Wait until status is `ISSUED`
- Once validated, proceed to Step 4

### Step 4: Create Custom Domain in Cognito

After certificate validation, run the completion script:

```bash
export AWS_PROFILE=admin
./infra/scripts/complete-custom-domain-setup.sh
```

This script will:
- Verify certificate is validated
- Create the custom domain in Cognito
- Get the CloudFront distribution domain
- Provide DNS CNAME instructions
- Provide Google OAuth update instructions

### Step 5: Get CloudFront Distribution Domain

After creating the custom domain, get the CloudFront distribution:

```bash
aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text
```

This will return something like: `d1234567890.cloudfront.net`

### Step 6: Add DNS CNAME Record in GoDaddy

Add the main CNAME record pointing to CloudFront:

1. Go to GoDaddy DNS Management
2. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `enablement`
   - **Value**: `<cloudfront-distribution-domain>` (from Step 5)
   - **TTL**: 3600 (or default)

3. Save the record

### Step 7: Wait for DNS Propagation

- DNS propagation can take 5-60 minutes
- Verify DNS is working:
  ```bash
  dig enablement.gravytylabs.com CNAME
  ```
- Or use online tools like `whatsmydns.net`

### Step 8: Update Google OAuth Redirect URI

1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048
2. Edit your OAuth 2.0 Client ID
3. Add Authorized redirect URI:
   ```
   https://enablement.gravytylabs.com/oauth2/idpresponse
   ```
4. Save changes

### Step 9: Update Web App Configuration

Update `apps/web/.env.local`:

```bash
VITE_COGNITO_USER_POOL_DOMAIN=enablement.gravytylabs.com
```

Or use the update script:

```bash
# The domain will be the custom domain instead of the prefix
# Update manually or modify the script to handle custom domains
```

### Step 10: Update Auth Configuration

The web app's `auth.ts` already handles custom domains correctly (it constructs the full URL if needed). However, for a custom domain, you should use the domain directly:

```typescript
// For custom domain, use it directly (no .auth.us-east-1.amazoncognito.com suffix)
const userPoolDomain = userPoolDomainPrefix; // Use as-is for custom domains
```

Update `apps/web/src/lib/auth.ts` to detect if it's a custom domain or Cognito domain.

### Step 11: Test

1. Restart the web app: `npm run dev:web`
2. Navigate to: `http://localhost:3000`
3. Click "Sign In with Google"
4. Should redirect to: `https://enablement.gravytylabs.com/login`
5. After Google sign-in, should redirect back to your app

## Troubleshooting

### Certificate Not Validating

- Verify DNS validation record is correct
- Check DNS propagation: `dig _7a5667639948625aed44c36cefc33d7f.enablement.gravytylabs.com CNAME`
- Wait longer (can take up to 30 minutes)

### Custom Domain Not Working

- Verify CloudFront CNAME is correct
- Check DNS propagation: `dig enablement.gravytylabs.com CNAME`
- Verify certificate is ISSUED
- Check CloudFront distribution status

### Google OAuth Not Working

- Verify redirect URI is exactly: `https://enablement.gravytylabs.com/oauth2/idpresponse`
- Check that DNS has propagated
- Verify custom domain is active in Cognito

## Current Status

- ✅ SSL Certificate: Requested (pending validation)
- ⏳ DNS Validation: Waiting for GoDaddy DNS record
- ⏳ Custom Domain: Will create after certificate validation
- ⏳ DNS CNAME: Will add after custom domain creation
- ⏳ Google OAuth: Will update after DNS propagation
- ⏳ Web App Config: Will update after setup complete

## Quick Reference

**Certificate ARN**: `arn:aws:acm:us-east-1:758742552610:certificate/9c032065-c00f-4915-ab62-127f48ba4446`

**DNS Validation Record**:
- Name: `_7a5667639948625aed44c36cefc33d7f.enablement`
- Value: `_462ac439eef0663a42852c3793e512ef.jkddzztszm.acm-validations.aws.`

**Custom Domain**: `enablement.gravytylabs.com`

**User Pool ID**: `us-east-1_s4q1vjkgD`

