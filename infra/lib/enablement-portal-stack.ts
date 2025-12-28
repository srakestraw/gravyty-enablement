import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as path from 'path';
import { CognitoEmailDomainValidator } from './cognito-email-domain-validator';

export class EnablementPortalStack extends cdk.Stack {
  public readonly eventsTable: dynamodb.Table;
  public readonly apiRole: iam.Role;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly apiLambda: lambda.Function;
  public readonly httpApi: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Build allowed origins for CORS
    // Supports WEB_ALLOWED_ORIGINS env var (comma-separated) or defaults to localhost
    const getAllowedOrigins = (): string[] => {
      const envOrigins = process.env.WEB_ALLOWED_ORIGINS;
      if (envOrigins) {
        // Split by comma and trim whitespace
        return envOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
      }
      // Default to localhost origins for development
      return [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Alternative dev port
      ];
    };

    // DynamoDB Tables

    // events table
    this.eventsTable = new dynamodb.Table(this, 'Events', {
      tableName: 'events',
      partitionKey: { name: 'date_bucket', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts#event_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl', // Optional: enable TTL for automatic cleanup
    });

    // IAM Role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Enablement Portal API Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    this.eventsTable.grantWriteData(lambdaRole);
    this.eventsTable.grantReadData(lambdaRole);

    // Keep apiRole for backward compatibility (EC2 use case)
    this.apiRole = lambdaRole;

    // Email domain validator Lambda (restrict to @gravyty.com)
    const emailDomainValidator = new CognitoEmailDomainValidator(this, 'EmailDomainValidator', {
      allowedDomains: ['gravyty.com'],
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'enablement-portal-users',
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lambdaTriggers: {
        preTokenGeneration: emailDomainValidator.function,
      },
    });

    // Grant Cognito permission to invoke the Lambda
    emailDomainValidator.function.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: this.userPool.userPoolArn,
    });

    // Create Cognito Groups
    const viewerGroup = new cognito.CfnUserPoolGroup(this, 'ViewerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Viewer',
      description: 'View-only access to approved content',
      precedence: 1,
    });

    const contributorGroup = new cognito.CfnUserPoolGroup(this, 'ContributorGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Contributor',
      description: 'Can create and edit content',
      precedence: 2,
    });

    const approverGroup = new cognito.CfnUserPoolGroup(this, 'ApproverGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Approver',
      description: 'Can approve, deprecate, and expire content',
      precedence: 3,
    });

    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admin',
      description: 'Full administrative access',
      precedence: 4,
    });

    // Google Identity Provider
    // Store Google OAuth credentials in SSM Parameter Store
    const googleClientIdParam = new ssm.StringParameter(this, 'GoogleClientIdParam', {
      parameterName: '/enablement-portal/google/client-id',
      description: 'Google OAuth Client ID for Cognito',
      stringValue: 'REPLACE_WITH_GOOGLE_CLIENT_ID', // Must be set manually
    });

    const googleClientSecretParam = new ssm.StringParameter(this, 'GoogleClientSecretParam', {
      parameterName: '/enablement-portal/google/client-secret',
      description: 'Google OAuth Client Secret for Cognito',
      stringValue: 'REPLACE_WITH_GOOGLE_CLIENT_SECRET', // Must be set manually
      // Note: In production, use SecureStringParameter
    });

    // Create Google Identity Provider FIRST (before UserPoolClient)
    const googleIdp = new cognito.CfnUserPoolIdentityProvider(this, 'GoogleIdp', {
      providerName: 'Google',
      providerType: 'Google',
      userPoolId: this.userPool.userPoolId,
      attributeMapping: {
        email: 'email',
        name: 'name',
        // Map Google groups to Cognito groups if needed
        // 'custom:groups': 'groups',
      },
      providerDetails: {
        client_id: googleClientIdParam.stringValue,
        client_secret: googleClientSecretParam.stringValue,
        authorize_scopes: 'openid email profile',
      },
    });

    // Build callback URLs for Cognito OAuth
    // Include allowed origins plus localhost variants for development
    const buildCallbackUrls = (): string[] => {
      const urls: string[] = [];
      
      // Add localhost variants for development
      urls.push('http://localhost:5173');
      urls.push('http://localhost:5173/');
      urls.push('http://localhost:3000');
      urls.push('http://localhost:3000/');
      
      // Add allowed origins from WEB_ALLOWED_ORIGINS (if set)
      allowedOrigins.forEach(origin => {
        if (!origin.startsWith('http://localhost')) {
          urls.push(origin);
          urls.push(`${origin}/`); // Also add with trailing slash
        }
      });
      
      // Remove duplicates
      return [...new Set(urls)];
    };

    const callbackUrls = buildCallbackUrls();

    // User Pool Client (OAuth) - Created AFTER Google IdP
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'enablement-portal-web',
      generateSecret: false, // Required for public clients (web apps)
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls: callbackUrls,
      },
      preventUserExistenceErrors: true,
    });

    // Link Google IdP to User Pool Client
    // UserPoolClient must depend on Google IdP (not the other way around)
    const userPoolClientResource = this.userPoolClient.node.defaultChild as cognito.CfnUserPoolClient;
    userPoolClientResource.addPropertyOverride('SupportedIdentityProviders', ['Google', 'COGNITO']);
    userPoolClientResource.addDependency(googleIdp);

    // Cognito Domain (for hosted UI)
    // Use a fixed prefix since account might be a token during synthesis
    // The domain prefix must contain only lowercase letters, numbers, and hyphens
    const accountSuffix = cdk.Token.isUnresolved(this.account) 
      ? 'default' 
      : this.account.substring(0, 8).replace(/[^a-z0-9-]/g, '');
    const domainPrefix = `enablement-portal-${accountSuffix}`;
    this.userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    // Lambda Function for API (only if dist-lambda exists)
    const apiCodePath = path.join(__dirname, '../../apps/api/dist-lambda');
    const fs = require('fs');
    
    if (fs.existsSync(apiCodePath)) {
      this.apiLambda = new lambda.Function(this, 'ApiLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'lambda.handler',
        code: lambda.Code.fromAsset(apiCodePath),
        role: lambdaRole,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          AWS_REGION: this.region,
          STORAGE_BACKEND: 'aws',
          DDB_TABLE_EVENTS: this.eventsTable.tableName,
          PRESIGNED_UPLOAD_EXPIRY_SECONDS: '300',
          PRESIGNED_DOWNLOAD_EXPIRY_SECONDS: '3600',
          // Cognito config (optional, can be set via env vars)
          COGNITO_USER_POOL_ID: this.userPool.userPoolId,
          COGNITO_USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        },
      });

      // HTTP API (API Gateway v2)
      this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
        description: 'Enablement Portal API',
        corsPreflight: {
          allowOrigins,
          allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
          allowHeaders: [
            'Content-Type',
            'Authorization',
            'x-request-id',
            'x-dev-role',
            'x-dev-user-id',
          ],
          maxAge: cdk.Duration.hours(1),
        },
      });

      // Lambda integration
      const lambdaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
        'LambdaIntegration',
        this.apiLambda
      );

      // Route all /v1/* requests to Lambda
      this.httpApi.addRoutes({
        path: '/v1/{proxy+}',
        methods: [
          apigatewayv2.HttpMethod.GET,
          apigatewayv2.HttpMethod.POST,
          apigatewayv2.HttpMethod.PUT,
          apigatewayv2.HttpMethod.DELETE,
          apigatewayv2.HttpMethod.PATCH,
        ],
        integration: lambdaIntegration,
      });

      // Route /health to Lambda
      this.httpApi.addRoutes({
        path: '/health',
        methods: [apigatewayv2.HttpMethod.GET],
        integration: lambdaIntegration,
      });
    } else {
      // Create placeholder - Lambda will be deployed separately after API is built
      console.warn('⚠️  Lambda code not found at', apiCodePath);
      console.warn('   Skipping Lambda/API Gateway deployment. Deploy after building API.');
      this.apiLambda = undefined as any;
      this.httpApi = undefined as any;
    }


    new cdk.CfnOutput(this, 'EventsTableName', {
      value: this.eventsTable.tableName,
      description: 'DynamoDB table name for events',
      exportName: 'EnablementEventsTableName',
    });

    // IAM Role Output
    new cdk.CfnOutput(this, 'ApiRoleArn', {
      value: this.apiRole.roleArn,
      description: 'IAM role ARN for API to access DynamoDB and S3',
      exportName: 'EnablementApiRoleArn',
    });

    // Cognito Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'EnablementUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'EnablementUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: 'EnablementUserPoolDomain',
    });

    new cdk.CfnOutput(this, 'GoogleClientIdParamName', {
      value: googleClientIdParam.parameterName,
      description: 'SSM Parameter name for Google Client ID',
      exportName: 'EnablementGoogleClientIdParam',
    });

    new cdk.CfnOutput(this, 'GoogleClientSecretParamName', {
      value: googleClientSecretParam.parameterName,
      description: 'SSM Parameter name for Google Client Secret',
      exportName: 'EnablementGoogleClientSecretParam',
    });

    // API Gateway Outputs (only if Lambda was deployed)
    if (this.httpApi && this.apiLambda) {
      new cdk.CfnOutput(this, 'ApiUrl', {
        value: this.httpApi.url!,
        description: 'API Gateway HTTP API URL',
        exportName: 'EnablementApiUrl',
      });

      new cdk.CfnOutput(this, 'ApiLambdaFunctionName', {
        value: this.apiLambda.functionName,
        description: 'Lambda function name for API',
        exportName: 'EnablementApiLambdaFunctionName',
      });

      new cdk.CfnOutput(this, 'ApiLambdaFunctionArn', {
        value: this.apiLambda.functionArn,
        description: 'Lambda function ARN for API',
        exportName: 'EnablementApiLambdaFunctionArn',
      });
    }
  }
}

