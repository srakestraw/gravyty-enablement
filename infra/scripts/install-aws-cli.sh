#!/bin/bash
# Install AWS CLI v2

set -e

echo "🔧 Installing AWS CLI..."

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        echo "Using Homebrew to install AWS CLI..."
        brew install awscli
    else
        echo "Homebrew not found. Installing AWS CLI manually..."
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "/tmp/AWSCLIV2.pkg"
        sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
        rm /tmp/AWSCLIV2.pkg
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Installing AWS CLI for Linux..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp
    sudo /tmp/aws/install
    rm -rf /tmp/aws /tmp/awscliv2.zip
else
    echo "Unsupported OS. Please install AWS CLI manually:"
    echo "https://aws.amazon.com/cli/"
    exit 1
fi

echo "✅ AWS CLI installed!"
aws --version





