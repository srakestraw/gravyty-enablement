# AWS Architecture

This document outlines the target AWS architecture for the Enablement Portal. **Note: Infrastructure is not yet implemented.**

## High-Level Architecture

### Frontend
- **AWS Amplify**: Hosting and CI/CD for the web application
- **CloudFront**: CDN for static assets (via Amplify)

### Authentication
- **Amazon Cognito**: User authentication and authorization
- **Google SSO**: Social identity provider integration
- **Cognito User Pools**: User management

### API Layer
- **API Gateway**: RESTful API endpoints
- **Lambda Functions**: Serverless compute for API handlers
- **Lambda Authorizers**: Request authorization

### Storage
- **Amazon S3**: Object storage for content files (PDFs, videos, images)
- **DynamoDB**: NoSQL database for metadata, user data, and content indexing

### Search & AI
- **Amazon OpenSearch**: Vector store for semantic search
- **OpenAI API**: 
  - GPT models for chat responses
  - Embeddings API for vector generation

### Analytics & Events
- **Amazon EventBridge**: Event-driven architecture
- **AWS Step Functions**: Workflow orchestration
- **Kinesis Firehose**: Data streaming
- **Amazon Athena**: Query analytics data in S3

### Notifications
- **Amazon SES**: Email notifications

## Data Flow

### Content Upload
1. Content uploaded to S3
2. Metadata stored in DynamoDB
3. Content processed and embedded via OpenAI
4. Embeddings stored in OpenSearch
5. EventBridge event triggers notifications

### Content Search
1. User query processed
2. Query embedded via OpenAI
3. Vector search in OpenSearch
4. Results ranked and returned
5. Analytics logged to Firehose

### AI Assistant
1. User message sent to API Gateway
2. Lambda function processes request
3. RAG query to OpenSearch
4. OpenAI generates response with citations
5. Response returned to user

## Security

- **Cognito**: Authentication and authorization
- **IAM Roles**: Least privilege access
- **VPC**: Private resources in VPC (if needed)
- **Encryption**: At rest and in transit
- **No PII**: System designed to avoid PII storage

## Scalability

- **Serverless**: Lambda auto-scales
- **DynamoDB**: Auto-scaling tables
- **OpenSearch**: Managed service with scaling
- **S3**: Unlimited storage

## Cost Optimization

- **Serverless**: Pay per use
- **S3 Lifecycle**: Archive old content
- **CloudFront**: Reduce origin requests
- **Reserved Capacity**: For predictable workloads (future)

## Implementation Status

**Current**: Architecture planning only. No infrastructure implemented.

**Next Steps**:
1. Set up Amplify app
2. Configure Cognito
3. Create API Gateway + Lambda
4. Set up S3 buckets
5. Initialize DynamoDB tables
6. Configure OpenSearch
7. Set up EventBridge and Step Functions

