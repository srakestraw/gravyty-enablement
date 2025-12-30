#!/bin/bash
# Get DNS records needed for Amplify custom domain setup in GoDaddy

set -e

APP_ID="${1:-d1cf513hn1tkd1}"
CUSTOM_DOMAIN="${2:-enable.gravytylabs.com}"

export AWS_PROFILE=admin

echo "🌐 Amplify DNS Records for GoDaddy"
echo "==================================="
echo ""
echo "App ID: $APP_ID"
echo "Custom Domain: $CUSTOM_DOMAIN"
echo ""

# Check if domain is already associated
echo "📋 Checking domain associations..."
DOMAIN_ASSOC=$(aws amplify list-domain-associations \
  --app-id "$APP_ID" \
  --query "domainAssociations[?domainName=='$CUSTOM_DOMAIN']" \
  --output json 2>/dev/null || echo "[]")

if [ "$DOMAIN_ASSOC" == "[]" ] || [ -z "$DOMAIN_ASSOC" ]; then
  echo "⚠️  Custom domain '$CUSTOM_DOMAIN' is not yet associated with Amplify app"
  echo ""
  echo "📝 Steps to add custom domain in Amplify Console:"
  echo ""
  echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID"
  echo "2. Click 'Domain management' in the left sidebar"
  echo "3. Click 'Add domain'"
  echo "4. Enter domain: $CUSTOM_DOMAIN"
  echo "5. Click 'Configure domain'"
  echo "6. Amplify will provide DNS records - use those values"
  echo ""
  echo "After adding the domain in Amplify Console, run this script again to get the DNS records."
  exit 0
fi

echo "✅ Domain association found!"
echo ""

# Get domain details
DOMAIN_DETAILS=$(aws amplify get-domain-association \
  --app-id "$APP_ID" \
  --domain-name "$CUSTOM_DOMAIN" \
  --output json 2>/dev/null || echo "{}")

if [ "$DOMAIN_DETAILS" == "{}" ]; then
  echo "❌ Could not get domain details"
  exit 1
fi

# Extract subdomain records
echo "📋 DNS Records to Add in GoDaddy:"
echo "=================================="
echo ""

SUBDOMAINS=$(echo "$DOMAIN_DETAILS" | jq -r '.domainAssociation.subDomains[]? | "\(.subDomainSetting.prefix) -> \(.verified // false)"' 2>/dev/null || echo "")

if [ -z "$SUBDOMAINS" ]; then
  echo "⚠️  No subdomain records found. The domain may still be provisioning."
  echo ""
  echo "Check Amplify Console for DNS records:"
  echo "  https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID/domains"
  exit 0
fi

# Get certificate verification records
CERT_RECORDS=$(echo "$DOMAIN_DETAILS" | jq -r '.domainAssociation.certificateVerificationDNSRecord? // empty' 2>/dev/null || echo "")

echo "🔐 Certificate Verification Record (if needed):"
if [ -n "$CERT_RECORDS" ] && [ "$CERT_RECORDS" != "null" ]; then
  echo "$CERT_RECORDS" | jq -r '
    "  Type: CNAME
  Name: \(.name // "N/A")
  Value: \(.value // "N/A")
  TTL: 3600"
  '
else
  echo "  (Certificate already verified or not needed)"
fi

echo ""
echo "📝 Subdomain Records:"
echo ""

# Parse and display subdomain records
echo "$DOMAIN_DETAILS" | jq -r '.domainAssociation.subDomains[]? | 
  "Subdomain: \(.subDomainSetting.prefix)
  DNS Record Type: \(.dnsRecord.type // "CNAME")
  DNS Record Name: \(.dnsRecord.name // "N/A")
  DNS Record Value: \(.dnsRecord.value // "N/A")
  Verified: \(.verified // false)
  ---"'

echo ""
echo "📋 GoDaddy DNS Setup Instructions:"
echo "===================================="
echo ""
echo "1. Log in to GoDaddy: https://dcc.godaddy.com/"
echo "2. Go to 'My Products' > 'DNS' for gravytylabs.com"
echo "3. Add the following CNAME records:"
echo ""

# Extract just the essential records
echo "$DOMAIN_DETAILS" | jq -r '.domainAssociation.subDomains[]? | 
  if .subDomainSetting.prefix == "" then
    "   Type: CNAME
   Name: @ (or leave blank for root domain)
   Value: \(.dnsRecord.value // "N/A")
   TTL: 3600"
  else
    "   Type: CNAME
   Name: \(.subDomainSetting.prefix)
   Value: \(.dnsRecord.value // "N/A")
   TTL: 3600"
  end'

echo ""
echo "4. Save the records"
echo "5. Wait 5-60 minutes for DNS propagation"
echo ""
echo "✅ After DNS propagates, your domain will be active!"
echo ""
echo "Verify DNS propagation:"
echo "  dig $CUSTOM_DOMAIN CNAME"
echo "  or use: https://www.whatsmydns.net/#CNAME/$CUSTOM_DOMAIN"


