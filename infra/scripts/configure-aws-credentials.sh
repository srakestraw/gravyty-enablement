#!/bin/bash
# Interactive AWS Credentials Configuration Script

set -e

echo "🔐 AWS Credentials Configuration"
echo "================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found!"
    echo ""
    echo "Please install AWS CLI first:"
    echo "  macOS: brew install awscli"
    echo "  Linux: See https://aws.amazon.com/cli/"
    echo ""
    echo "Or run: ./infra/scripts/install-aws-cli.sh"
    exit 1
fi

echo "✅ AWS CLI found: $(aws --version)"
echo ""

# Check if credentials already exist
if [ -f ~/.aws/credentials ]; then
    echo "⚠️  Existing AWS credentials found at ~/.aws/credentials"
    read -p "Do you want to reconfigure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing credentials."
        exit 0
    fi
fi

echo ""
echo "You'll need:"
echo "  1. AWS Access Key ID"
echo "  2. AWS Secret Access Key"
echo "  3. Default region (e.g., us-east-1)"
echo ""
echo "Get your credentials from:"
echo "  https://console.aws.amazon.com/iam/home#/security_credentials"
echo "  (or ask your AWS administrator)"
echo ""

# Run aws configure
aws configure

echo ""
echo "✅ Credentials configured!"
echo ""

# Verify credentials
echo "🔍 Verifying credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ Successfully connected to AWS!"
    echo ""
    aws sts get-caller-identity
    echo ""
    echo "You're ready to set up AWS resources!"
    echo "Run: ./infra/scripts/setup-aws.sh"
else
    echo "❌ Failed to verify credentials"
    echo "Please check your Access Key ID and Secret Access Key"
    exit 1
fi




