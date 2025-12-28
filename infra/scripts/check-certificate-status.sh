#!/bin/bash
# Check SSL certificate validation status

set -e

export AWS_PROFILE=admin

CERT_ARN="arn:aws:acm:us-east-1:758742552610:certificate/9c032065-c00f-4915-ab62-127f48ba4446"
REGION="us-east-1"

echo "🔍 Checking Certificate Status"
echo "============================="
echo ""

STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" --query 'Certificate.Status' --output text)

echo "Certificate ARN: $CERT_ARN"
echo "Status: $STATUS"
echo ""

if [ "$STATUS" == "ISSUED" ]; then
  echo "✅ Certificate is validated and ready!"
  echo ""
  echo "Next steps:"
  echo "1. Run: ./infra/scripts/complete-custom-domain-setup.sh"
  echo "2. Add CNAME record in GoDaddy"
  echo "3. Update Google OAuth redirect URI"
  echo "4. Update web app .env.local"
elif [ "$STATUS" == "PENDING_VALIDATION" ]; then
  echo "⏳ Certificate is still validating..."
  echo ""
  echo "This typically takes 5-30 minutes after DNS is added."
  echo "AWS will automatically validate once DNS propagates."
  echo ""
  echo "To check again, run: ./infra/scripts/check-certificate-status.sh"
else
  echo "⚠️  Unexpected status: $STATUS"
fi




