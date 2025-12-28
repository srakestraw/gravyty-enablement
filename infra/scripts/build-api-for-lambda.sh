#!/bin/bash
# Build API for Lambda deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"

echo "🔨 Building API for Lambda deployment"
echo "======================================"

cd "$API_DIR"

# Build domain package first (dependency)
echo "Building domain package..."
cd "$PROJECT_ROOT/packages/domain"
npm run build

# Build API TypeScript
echo "Building API TypeScript..."
cd "$API_DIR"
npm run build

# Bundle for Lambda
echo "Bundling for Lambda..."
npm run bundle:lambda

echo "✅ API built for Lambda deployment"
echo "Lambda bundle location: $API_DIR/dist-lambda"




