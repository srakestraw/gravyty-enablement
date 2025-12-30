#!/bin/bash
# Setup custom domain for Cognito User Pool
# Domain: enablement.gravytylabs.com

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME="EnablementPortalStack"
DOMAIN_NAME="enablement.gravytylabs.com"
REGION="us-east-1"

echo "🌐 Setting Up Custom Domain for Cognito"
echo "=========================================="
echo "Domain: $DOMAIN_NAME"
echo ""

export AWS_PROFILE=admin

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ]; then
  echo "❌ Could not retrieve User Pool ID. Ensure the CDK stack is deployed."
  exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"
echo ""

# Step 1: Request SSL Certificate in ACM
echo "📋 Step 1: Requesting SSL Certificate in ACM..."
echo "================================================"

# Check if certificate already exists
EXISTING_CERT=$(aws acm list-certificates \
  --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" \
  --output text 2>/dev/null | head -1)

if [ -n "$EXISTING_CERT" ] && [ "$EXISTING_CERT" != "None" ]; then
  echo "✅ Certificate already exists: $EXISTING_CERT"
  CERT_ARN="$EXISTING_CERT"
else
  echo "Requesting new certificate..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN_NAME" \
    --validation-method DNS \
    --region "$REGION" \
    --query 'CertificateArn' \
    --output text 2>/dev/null)
  
  if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
    echo "❌ Failed to request certificate"
    exit 1
  fi
  
  echo "✅ Certificate requested: $CERT_ARN"
  echo ""
  echo "⏳ Waiting for certificate validation details..."
  sleep 5
  
  # Get DNS validation records
  VALIDATION_RECORDS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output json 2>/dev/null)
  
  if [ -n "$VALIDATION_RECORDS" ]; then
    echo ""
    echo "📝 DNS Validation Records (Add these in GoDaddy):"
    echo "=================================================="
    echo "$VALIDATION_RECORDS" | jq -r '
      "Type: " + .Type + "\n" +
      "Name: " + .Name + "\n" +
      "Value: " + .Value
    '
    echo ""
    echo "⚠️  IMPORTANT: Add these DNS records in GoDaddy before proceeding!"
    echo "   The certificate must be validated before it can be used."
    echo ""
    read -p "Press Enter after you've added the DNS records in GoDaddy..."
  fi
fi

# Step 2: Create custom domain in Cognito
echo ""
echo "📋 Step 2: Creating Custom Domain in Cognito..."
echo "================================================"

# Delete existing domain if it exists (to avoid conflicts)
EXISTING_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DOMAIN" ] && [ "$EXISTING_DOMAIN" != "None" ]; then
  echo "⚠️  Custom domain already exists. Checking if it's attached to this User Pool..."
  EXISTING_POOL=$(aws cognito-idp describe-user-pool-domain \
    --domain "$DOMAIN_NAME" \
    --query 'DomainDescription.UserPoolId' \
    --output text 2>/dev/null || echo "")
  
  if [ "$EXISTING_POOL" == "$USER_POOL_ID" ]; then
    echo "✅ Custom domain already configured for this User Pool"
  else
    echo "⚠️  Custom domain exists but attached to different User Pool"
    echo "   You may need to delete it first or use a different domain"
  fi
else
  echo "Creating custom domain..."
  aws cognito-idp create-user-pool-domain \
    --domain "$DOMAIN_NAME" \
    --user-pool-id "$USER_POOL_ID" \
    --custom-domain-config "CertificateArn=$CERT_ARN" \
    --region "$REGION" 2>&1 | head -10
  
  echo "✅ Custom domain created"
fi

# Step 3: Get CloudFront distribution details
echo ""
echo "📋 Step 3: Getting CloudFront Distribution Details..."
echo "====================================================="

CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text 2>/dev/null || echo "")

if [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" == "None" ]; then
  echo "⚠️  CloudFront domain not available yet. It may take a few minutes to provision."
  echo "   Run this script again in a few minutes to get the DNS records."
  exit 0
fi

echo "✅ CloudFront Distribution: $CLOUDFRONT_DOMAIN"
echo ""

# Step 4: Provide DNS CNAME record for GoDaddy
echo "📋 Step 4: DNS Configuration for GoDaddy"
echo "=========================================="
echo ""
echo "Add this CNAME record in GoDaddy DNS settings:"
echo ""
echo "  Type: CNAME"
echo "  Name: enablement"
echo "  Value: $CLOUDFRONT_DOMAIN"
echo "  TTL: 3600 (or default)"
echo ""
echo "Full record:"
echo "  enablement.gravytylabs.com → $CLOUDFRONT_DOMAIN"
echo ""

# Step 5: Update Google OAuth redirect URI
echo "📋 Step 5: Update Google OAuth Redirect URI"
echo "============================================="
echo ""
echo "After DNS propagates (can take 5-60 minutes), update Google OAuth:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048"
echo "2. Edit your OAuth 2.0 Client ID"
echo "3. Add this Authorized redirect URI:"
echo ""
echo "   https://$DOMAIN_NAME/oauth2/idpresponse"
echo ""
echo "4. Save changes"
echo ""

# Step 6: Update web app configuration
echo "📋 Step 6: Update Web App Configuration"
echo "========================================"
echo ""
echo "After DNS propagates, update apps/web/.env.local:"
echo ""
echo "  VITE_COGNITO_USER_POOL_DOMAIN=$DOMAIN_NAME"
echo ""
echo "Then restart the web app."
echo ""

echo "✅ Custom Domain Setup Complete!"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Add DNS CNAME record in GoDaddy (see above)"
echo "2. Wait for DNS propagation (5-60 minutes)"
echo "3. Update Google OAuth redirect URI"
echo "4. Update web app .env.local"
echo "5. Restart web app"
echo ""





