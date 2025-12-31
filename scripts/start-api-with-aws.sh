#!/bin/bash
# Start API server with AWS credentials

cd "$(dirname "$0")/../apps/api"

echo "Starting API server with AWS profile: admin"
echo ""

# Export AWS profile so AWS SDK can use it
export AWS_PROFILE=admin
export AWS_REGION=us-east-1

# Start the server
npm run dev
