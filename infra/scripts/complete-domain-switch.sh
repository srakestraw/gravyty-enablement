#!/bin/bash
# Complete the domain switch after certificate validation

set -e

export AWS_PROFILE=admin

NEW_DOMAIN="enable.gravytylabs.com"
OLD_DOMAIN="enablement.gravytylabs.com"
USER_POOL_ID="us-east-1_s4q1vjkgD"
CERT_ARN="arn:aws:acm:us-east-1:758742552610:certificate/c2601559-47ed-4589-9c13-e06a5aa7afea"
REGION="us-east-1"

echo "🔄 Completing Domain Switch"
echo "==========================="
echo "New Domain: $NEW_DOMAIN"
echo ""

# Check certificate status
STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" --query 'Certificate.Status' --output text 2>/dev/null || echo "UNKNOWN")

if [ "$STATUS" != "ISSUED" ]; then
  echo "❌ Certificate not validated yet. Status: $STATUS"
  echo ""
  echo "Please add this DNS validation record in GoDaddy:"
  echo ""
  VALIDATION=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" --query 'Certificate.DomainValidationOptions[0].ResourceRecord' --output json 2>/dev/null)
  echo "$VALIDATION" | jq -r '
    "Type: " + .Type + "\n" +
    "Name: " + .Name + "\n" +
    "Value: " + .Value
  '
  echo ""
  echo "Then wait 5-10 minutes and run this script again."
  exit 1
fi

echo "✅ Certificate validated"
echo ""

# Delete old domain
echo "📋 Deleting old domain: $OLD_DOMAIN"
OLD_EXISTS=$(aws cognito-idp describe-user-pool-domain \
  --domain "$OLD_DOMAIN" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$OLD_EXISTS" ] && [ "$OLD_EXISTS" != "None" ]; then
  aws cognito-idp delete-user-pool-domain \
    --domain "$OLD_DOMAIN" \
    --region "$REGION" > /dev/null 2>&1
  echo "✅ Old domain deleted"
  sleep 5
else
  echo "✅ Old domain doesn't exist"
fi

# Create new domain
echo ""
echo "📋 Creating new domain: $NEW_DOMAIN"
EXISTING=$(aws cognito-idp describe-user-pool-domain \
  --domain "$NEW_DOMAIN" \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
  echo "✅ Domain already exists"
else
  aws cognito-idp create-user-pool-domain \
    --domain "$NEW_DOMAIN" \
    --user-pool-id "$USER_POOL_ID" \
    --custom-domain-config "CertificateArn=$CERT_ARN" \
    --region "$REGION" > /dev/null 2>&1
  echo "✅ New domain created"
  sleep 10
fi

# Get CloudFront distribution
echo ""
echo "📋 Getting CloudFront Distribution..."
CLOUDFRONT=$(aws cognito-idp describe-user-pool-domain \
  --domain "$NEW_DOMAIN" \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text 2>/dev/null || echo "")

if [ -z "$CLOUDFRONT" ] || [ "$CLOUDFRONT" == "None" ]; then
  echo "⏳ Waiting for CloudFront..."
  for i in {1..12}; do
    sleep 10
    CLOUDFRONT=$(aws cognito-idp describe-user-pool-domain \
      --domain "$NEW_DOMAIN" \
      --query 'DomainDescription.CloudFrontDistribution' \
      --output text 2>/dev/null || echo "")
    if [ -n "$CLOUDFRONT" ] && [ "$CLOUDFRONT" != "None" ]; then
      break
    fi
    echo "   Still waiting... ($i/12)"
  done
fi

if [ -z "$CLOUDFRONT" ] || [ "$CLOUDFRONT" == "None" ]; then
  echo "❌ CloudFront not ready. Try again in a few minutes."
  exit 1
fi

echo "✅ CloudFront: $CLOUDFRONT"
echo ""

# Update web app config
echo "📋 Updating Web App Configuration..."
WEB_ENV="apps/web/.env.local"
if [ -f "$WEB_ENV" ]; then
  # Update or add VITE_COGNITO_USER_POOL_DOMAIN
  if grep -q "^VITE_COGNITO_USER_POOL_DOMAIN=" "$WEB_ENV"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^VITE_COGNITO_USER_POOL_DOMAIN=.*|VITE_COGNITO_USER_POOL_DOMAIN=$NEW_DOMAIN|" "$WEB_ENV"
    else
      sed -i "s|^VITE_COGNITO_USER_POOL_DOMAIN=.*|VITE_COGNITO_USER_POOL_DOMAIN=$NEW_DOMAIN|" "$WEB_ENV"
    fi
  else
    echo "VITE_COGNITO_USER_POOL_DOMAIN=$NEW_DOMAIN" >> "$WEB_ENV"
  fi
  echo "✅ Updated $WEB_ENV"
else
  echo "⚠️  $WEB_ENV not found. Create it manually with:"
  echo "   VITE_COGNITO_USER_POOL_DOMAIN=$NEW_DOMAIN"
fi

echo ""
echo "✅ Domain Switch Complete!"
echo "=========================="
echo ""
echo "Summary:"
echo "- Cognito Domain: $NEW_DOMAIN"
echo "- CloudFront: $CLOUDFRONT"
echo ""
echo "Next Steps:"
echo "1. Verify CNAME in GoDaddy points 'enable' to: $CLOUDFRONT"
echo "2. Update Google OAuth redirect URI: https://$NEW_DOMAIN/oauth2/idpresponse"
echo "3. Restart web app: npm run dev:web"
echo "4. Test sign-in flow"
echo ""







