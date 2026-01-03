#!/bin/bash
# Switch Cognito custom domain from enablement.gravytylabs.com to enable.gravytylabs.com

set -e

export AWS_PROFILE=admin

OLD_DOMAIN="enablement.gravytylabs.com"
NEW_DOMAIN="enable.gravytylabs.com"
USER_POOL_ID="us-east-1_s4q1vjkgD"
REGION="us-east-1"

echo "🔄 Switching Cognito Domain"
echo "============================"
echo "From: $OLD_DOMAIN"
echo "To: $NEW_DOMAIN"
echo ""

# Step 1: Check if new domain already exists
echo "📋 Step 1: Checking if new domain exists..."
EXISTING_NEW=$(aws cognito-idp describe-user-pool-domain \
  --domain "$NEW_DOMAIN" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_NEW" ] && [ "$EXISTING_NEW" != "None" ]; then
  echo "✅ New domain already exists: $NEW_DOMAIN"
  EXISTING_POOL=$(aws cognito-idp describe-user-pool-domain \
    --domain "$NEW_DOMAIN" \
    --query 'DomainDescription.UserPoolId' \
    --output text 2>/dev/null || echo "")
  
  if [ "$EXISTING_POOL" == "$USER_POOL_ID" ]; then
    echo "✅ Domain is already attached to this User Pool"
    SKIP_CREATE=true
  else
    echo "⚠️  Domain exists but attached to different User Pool: $EXISTING_POOL"
    echo "   You may need to delete it first"
    exit 1
  fi
else
  SKIP_CREATE=false
fi

# Step 2: Request SSL certificate for new domain
if [ "$SKIP_CREATE" != "true" ]; then
  echo ""
  echo "📋 Step 2: Requesting SSL Certificate..."
  
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$NEW_DOMAIN" \
    --validation-method DNS \
    --region "$REGION" \
    --query 'CertificateArn' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
    # Check if certificate already exists
    EXISTING_CERT=$(aws acm list-certificates \
      --region "$REGION" \
      --query "CertificateSummaryList[?DomainName=='$NEW_DOMAIN'].CertificateArn" \
      --output text 2>/dev/null | head -1)
    
    if [ -n "$EXISTING_CERT" ] && [ "$EXISTING_CERT" != "None" ]; then
      CERT_ARN="$EXISTING_CERT"
      echo "✅ Certificate already exists: $CERT_ARN"
    else
      echo "❌ Failed to request certificate"
      exit 1
    fi
  else
    echo "✅ Certificate requested: $CERT_ARN"
  fi
  
  # Get DNS validation record
  sleep 3
  VALIDATION=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output json 2>/dev/null || echo "{}")
  
  if [ "$VALIDATION" != "{}" ]; then
    echo ""
    echo "📝 DNS Validation Record (if not already added):"
    echo "$VALIDATION" | jq -r '
      "Type: " + .Type + "\n" +
      "Name: " + .Name + "\n" +
      "Value: " + .Value
    '
    echo ""
    echo "⚠️  If you haven't added this DNS record yet, add it in GoDaddy"
    echo "   Then wait 5-10 minutes for validation"
    echo ""
    read -p "Press Enter after DNS validation record is added and certificate is validated..."
  fi
  
  # Check certificate status
  STATUS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.Status' \
    --output text 2>/dev/null || echo "PENDING_VALIDATION")
  
  if [ "$STATUS" != "ISSUED" ]; then
    echo "⏳ Certificate status: $STATUS"
    echo "   Waiting for validation..."
    for i in {1..12}; do
      sleep 10
      STATUS=$(aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --region "$REGION" \
        --query 'Certificate.Status' \
        --output text 2>/dev/null || echo "PENDING_VALIDATION")
      echo "   Check $i: Status = $STATUS"
      if [ "$STATUS" == "ISSUED" ]; then
        echo "✅ Certificate validated!"
        break
      fi
    done
    
    if [ "$STATUS" != "ISSUED" ]; then
      echo "❌ Certificate not validated yet. Please wait and run this script again."
      exit 1
    fi
  else
    echo "✅ Certificate is validated"
  fi
fi

# Step 3: Delete old domain (if exists)
echo ""
echo "📋 Step 3: Deleting old domain..."
OLD_EXISTS=$(aws cognito-idp describe-user-pool-domain \
  --domain "$OLD_DOMAIN" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$OLD_EXISTS" ] && [ "$OLD_EXISTS" != "None" ]; then
  echo "Deleting $OLD_DOMAIN..."
  aws cognito-idp delete-user-pool-domain \
    --domain "$OLD_DOMAIN" \
    --region "$REGION" 2>&1 | head -5
  echo "✅ Old domain deleted"
  sleep 5  # Wait for deletion to complete
else
  echo "✅ Old domain doesn't exist (already deleted or never created)"
fi

# Step 4: Create new domain (if not exists)
if [ "$SKIP_CREATE" != "true" ]; then
  echo ""
  echo "📋 Step 4: Creating new domain..."
  aws cognito-idp create-user-pool-domain \
    --domain "$NEW_DOMAIN" \
    --user-pool-id "$USER_POOL_ID" \
    --custom-domain-config "CertificateArn=$CERT_ARN" \
    --region "$REGION" 2>&1 | head -10
  
  echo "✅ New domain created"
  echo "   Waiting for CloudFront distribution..."
  sleep 10
fi

# Step 5: Get CloudFront distribution
echo ""
echo "📋 Step 5: Getting CloudFront Distribution..."
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain "$NEW_DOMAIN" \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text 2>/dev/null || echo "")

if [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" == "None" ]; then
  echo "⏳ CloudFront distribution not ready yet. Waiting..."
  for i in {1..12}; do
    sleep 10
    CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
      --domain "$NEW_DOMAIN" \
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

# Step 6: Verify DNS CNAME
echo "📋 Step 6: DNS Configuration"
echo "============================"
echo ""
echo "Verify your CNAME record in GoDaddy points to:"
echo "  $CLOUDFRONT_DOMAIN"
echo ""
echo "Expected CNAME:"
echo "  Type: CNAME"
echo "  Name: enable"
echo "  Value: $CLOUDFRONT_DOMAIN"
echo ""

# Step 7: Update instructions
echo "📋 Step 7: Next Steps"
echo "======================"
echo ""
echo "1. Verify DNS CNAME is correct (see above)"
echo ""
echo "2. Update Google OAuth Redirect URI:"
echo "   https://$NEW_DOMAIN/oauth2/idpresponse"
echo ""
echo "3. Update web app .env.local:"
echo "   VITE_COGNITO_USER_POOL_DOMAIN=$NEW_DOMAIN"
echo ""
echo "4. Restart web app"
echo ""

echo "✅ Domain Switch Complete!"
echo "=========================="
echo "New Cognito Domain: $NEW_DOMAIN"
echo "CloudFront: $CLOUDFRONT_DOMAIN"
echo ""







