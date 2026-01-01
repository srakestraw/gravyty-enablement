#!/bin/bash
# Configure Google OAuth Consent Screen via CLI

set -e

PROJECT_ID="${1:-680059166048}"
APP_NAME="${2:-Enablement Portal}"
SUPPORT_EMAIL="${3}"
DEVELOPER_EMAIL="${4}"

echo "🔐 Configure OAuth Consent Screen via CLI"
echo "========================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "App Name: $APP_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

# Prompt for email if not provided
if [ -z "$SUPPORT_EMAIL" ]; then
    CURRENT_EMAIL=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')
    read -p "Support email [$CURRENT_EMAIL]: " SUPPORT_EMAIL
    SUPPORT_EMAIL="${SUPPORT_EMAIL:-$CURRENT_EMAIL}"
fi

if [ -z "$DEVELOPER_EMAIL" ]; then
    CURRENT_EMAIL=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')
    read -p "Developer contact email [$CURRENT_EMAIL]: " DEVELOPER_EMAIL
    DEVELOPER_EMAIL="${DEVELOPER_EMAIL:-$CURRENT_EMAIL}"
fi

echo ""
echo "📋 Configuration:"
echo "  App Name: $APP_NAME"
echo "  Support Email: $SUPPORT_EMAIL"
echo "  Developer Email: $DEVELOPER_EMAIL"
echo ""

# Note: gcloud doesn't have a direct command to configure OAuth consent screen
# We need to use the REST API or guide the user

echo "⚠️  Note: gcloud CLI doesn't have a direct command to configure OAuth consent screen"
echo ""
echo "You have two options:"
echo ""
echo "Option 1: Configure via Google Cloud Console (Recommended)"
echo "==========================================================="
echo "1. Open: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "2. Click 'Configure Consent Screen'"
echo "3. Select User Type: External (or Internal if using Google Workspace)"
echo "4. Fill in:"
echo "   - App name: $APP_NAME"
echo "   - User support email: $SUPPORT_EMAIL"
echo "   - Developer contact: $DEVELOPER_EMAIL"
echo "5. Click 'Save and Continue'"
echo "6. Scopes: Ensure 'email', 'profile', 'openid' are included"
echo "7. Click 'Save and Continue'"
echo "8. Test users: Add your email if app is in Testing mode"
echo "9. Click 'Save and Continue'"
echo ""

# Try to open browser on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening browser..."
    open "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID" 2>/dev/null || true
    echo ""
fi

echo "Option 2: Use REST API (Advanced)"
echo "================================="
echo ""
echo "Get access token:"
echo "  ACCESS_TOKEN=\$(gcloud auth print-access-token)"
echo ""
echo "Then use the OAuth Consent Screen API:"
echo "  https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getOAuthIdpConfig"
echo ""
echo "Or configure via Terraform/Infrastructure as Code"
echo ""

echo "✅ After configuring, wait 1-2 minutes and try signing in again!"

