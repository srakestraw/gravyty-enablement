#!/bin/bash
# Complete custom domain setup after certificate validation
# Domain: enablement.gravytylabs.com

set -e

export AWS_PROFILE=admin

DOMAIN_NAME="enablement.gravytylabs.com"
USER_POOL_ID="us-east-1_s4q1vjkgD"
CERT_ARN="arn:aws:acm:us-east-1:758742552610:certificate/9c032065-c00f-4915-ab62-127f48ba4446"
REGION="us-east-1"

echo "🌐 Completing Custom Domain Setup"
echo "=================================="
echo "Domain: $DOMAIN_NAME"
echo ""

# Check certificate status
echo "📋 Step 1: Checking Certificate Status..."
STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" --query 'Certificate.Status' --output text)

if [ "$STATUS" != "ISSUED" ]; then
  echo "⏳ Certificate status: $STATUS"
  echo "   Waiting for certificate validation..."
  echo "   This can take 5-30 minutes after DNS is added."
  echo ""
  echo "   Run this script again in a few minutes, or wait for validation."
  exit 0
fi

echo "✅ Certificate is validated (ISSUED)"
echo ""

# Check if custom domain already exists
echo "📋 Step 2: Checking if custom domain exists..."
EXISTING_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DOMAIN" ] && [ "$EXISTING_DOMAIN" != "None" ]; then
  echo "✅ Custom domain already exists"
  EXISTING_POOL=$(aws cognito-idp describe-user-pool-domain \
    --domain "$DOMAIN_NAME" \
    --query 'DomainDescription.UserPoolId' \
    --output text 2>/dev/null || echo "")
  
  if [ "$EXISTING_POOL" == "$USER_POOL_ID" ]; then
    echo "✅ Domain is already attached to this User Pool"
  else
    echo "⚠️  Domain exists but attached to different User Pool: $EXISTING_POOL"
    echo "   You may need to delete it first"
    exit 1
  fi
else
  echo "Creating custom domain..."
  aws cognito-idp create-user-pool-domain \
    --domain "$DOMAIN_NAME" \
    --user-pool-id "$USER_POOL_ID" \
    --custom-domain-config "CertificateArn=$CERT_ARN" \
    --region "$REGION"
  
  echo "✅ Custom domain created"
  echo "   Waiting for CloudFront distribution to be ready..."
  sleep 10
fi

# Get CloudFront distribution
echo ""
echo "📋 Step 3: Getting CloudFront Distribution..."
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text 2>/dev/null || echo "")

if [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" == "None" ]; then
  echo "⏳ CloudFront distribution not ready yet. Waiting..."
  for i in {1..12}; do
    sleep 10
    CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
      --domain "$DOMAIN_NAME" \
      --query 'DomainDescription.CloudFrontDistribution' \
      --output text 2>/dev/null || echo "")
    if [ -n "$CLOUDFRONT_DOMAIN" ] && [ "$CLOUDFRONT_DOMAIN" != "None" ]; then
      break
    fi
    echo "   Still waiting... ($i/12)"
  done
fi

if [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" == "None" ]; then
  echo "❌ CloudFront distribution not available. Try again in a few minutes."
  exit 1
fi

echo "✅ CloudFront Distribution: $CLOUDFRONT_DOMAIN"
echo ""

# Provide DNS instructions
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

# Update Google OAuth instructions
echo "📋 Step 5: Update Google OAuth Redirect URI"
echo "============================================="
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=680059166048"
echo "2. Edit your OAuth 2.0 Client ID"
echo "3. Add Authorized redirect URI:"
echo ""
echo "   https://$DOMAIN_NAME/oauth2/idpresponse"
echo ""
echo "4. Save changes"
echo ""

# Update web app configuration
echo "📋 Step 6: Update Web App Configuration"
echo "=========================================="
echo ""
echo "Update apps/web/.env.local:"
echo ""
echo "  VITE_COGNITO_USER_POOL_DOMAIN=$DOMAIN_NAME"
echo ""
echo "Then restart the web app: npm run dev:web"
echo ""

echo "✅ Custom Domain Setup Complete!"
echo "=================================="
echo ""
echo "Summary:"
echo "- Custom Domain: $DOMAIN_NAME"
echo "- CloudFront: $CLOUDFRONT_DOMAIN"
echo "- Next: Add CNAME in GoDaddy (see above)"
echo "- Then: Update Google OAuth redirect URI"
echo "- Finally: Update web app .env.local and restart"
echo ""







