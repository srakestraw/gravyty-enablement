#!/bin/bash
# Quick status check for Amplify domain

export AWS_PROFILE=admin
APP_ID="d1cf513hn1tkd1"
DOMAIN="enable.gravytylabs.com"

echo "=== Amplify Domain Status ==="
aws amplify get-domain-association \
  --app-id "$APP_ID" \
  --domain-name "$DOMAIN" \
  --query '{status: domainAssociation.domainStatus, certificateVerificationDNSRecord: domainAssociation.certificateVerificationDNSRecord, subDomains: domainAssociation.subDomains[*].{prefix: subDomainSetting.prefix, verified: verified, dnsRecord: .dnsRecord}}' \
  --output json 2>/dev/null | jq . || echo "Domain not found or error"

echo ""
echo "=== DNS Records Check ==="
echo "Certificate validation:"
dig +short _5e2d07b5345e5077eff0eea06e4e1baa.enable.gravytylabs.com CNAME || echo "Not found"

echo ""
echo "Subdomain:"
dig +short enable.gravytylabs.com CNAME || echo "Not found"
