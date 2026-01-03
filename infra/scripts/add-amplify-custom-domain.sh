#!/bin/bash
# Add custom domain to Amplify app

set -e

APP_ID="${1:-d1cf513hn1tkd1}"
DOMAIN_NAME="${2:-enable.gravytylabs.com}"
BRANCH_NAME="${3:-main}"

export AWS_PROFILE=admin

echo "🌐 Adding Custom Domain to Amplify"
echo "==================================="
echo ""
echo "App ID: $APP_ID"
echo "Domain: $DOMAIN_NAME"
echo "Branch: $BRANCH_NAME"
echo ""

# Check if domain is already associated
EXISTING=$(aws amplify list-domain-associations \
  --app-id "$APP_ID" \
  --query "domainAssociations[?domainName=='$DOMAIN_NAME'].domainName" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
  echo "✅ Domain '$DOMAIN_NAME' is already associated"
  echo ""
  echo "Current status:"
  aws amplify get-domain-association \
    --app-id "$APP_ID" \
    --domain-name "$DOMAIN_NAME" \
    --query '{status: .domainAssociation.domainStatus, subDomains: .domainAssociation.subDomains[*].{prefix: .subDomainSetting.prefix, verified: .verified}}' \
    --output json | jq .
  exit 0
fi

echo "📋 Adding domain association..."
echo ""

# Create domain association
# Note: AWS CLI doesn't support creating domain associations directly
# You need to do this through the Console or use the API with proper subdomain configuration

echo "⚠️  Domain association creation via CLI requires complex subdomain configuration"
echo ""
echo "📝 Please add the domain through AWS Amplify Console:"
echo ""
echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID"
echo "2. Click 'Domain management' in the left sidebar"
echo "3. Click 'Add domain'"
echo "4. Enter domain: $DOMAIN_NAME"
echo "5. Click 'Configure domain'"
echo "6. Configure subdomains:"
echo "   - Root domain ($DOMAIN_NAME) → Branch: $BRANCH_NAME"
echo "   - www subdomain (www.$DOMAIN_NAME) → Branch: $BRANCH_NAME"
echo "7. Amplify will show DNS records to add"
echo "8. Add the DNS records in GoDaddy (they should match what's already there)"
echo "9. Click 'Save'"
echo ""
echo "After adding in Console, run this script again to check status:"
echo "  ./infra/scripts/add-amplify-custom-domain.sh"
echo ""

# Try to get current app details
APP_DETAILS=$(aws amplify get-app --app-id "$APP_ID" --output json 2>/dev/null || echo "{}")
if [ "$APP_DETAILS" != "{}" ]; then
  APP_NAME=$(echo "$APP_DETAILS" | jq -r '.app.name // "N/A"')
  DEFAULT_DOMAIN=$(echo "$APP_DETAILS" | jq -r '.app.defaultDomain // "N/A"')
  echo "Current App Details:"
  echo "  Name: $APP_NAME"
  echo "  Default Domain: $DEFAULT_DOMAIN"
  echo ""
fi

echo "Direct Console Link:"
echo "  https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID/domains"




