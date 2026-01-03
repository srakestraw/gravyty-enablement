#!/bin/bash
# Helper script to update Google OAuth redirect URI with custom domain
# Note: This script provides instructions - actual update must be done in Google Cloud Console

set -e

DOMAIN_NAME="enablement.gravytylabs.com"
GOOGLE_PROJECT="680059166048"
REDIRECT_URI="https://${DOMAIN_NAME}/oauth2/idpresponse"

echo "🔐 Google OAuth Redirect URI Update"
echo "===================================="
echo ""
echo "Custom Domain: $DOMAIN_NAME"
echo "Redirect URI: $REDIRECT_URI"
echo ""
echo "📋 Steps to Update in Google Cloud Console:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$GOOGLE_PROJECT"
echo ""
echo "2. Find your OAuth 2.0 Client ID (or create one if needed)"
echo ""
echo "3. Click 'Edit' on the OAuth client"
echo ""
echo "4. Under 'Authorized redirect URIs', add:"
echo "   $REDIRECT_URI"
echo ""
echo "5. Click 'Save'"
echo ""
echo "✅ After saving, Google OAuth will work with the custom domain!"
echo ""
echo "📝 Note: You can keep the existing Cognito domain redirect URI"
echo "   (enablement-portal-75874255.auth.us-east-1.amazoncognito.com)"
echo "   for backward compatibility during migration."
echo ""







