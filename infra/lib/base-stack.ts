import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { CognitoEmailDomainValidator } from './cognito-email-domain-validator';
import { CognitoAutoAssignViewer } from './cognito-auto-assign-viewer';

/**
 * Base stack containing Cognito resources and Lambda function
 * This is separated to break circular dependencies with API Gateway
 */
interface BaseStackProps extends cdk.NestedStackProps {
  eventsTable: dynamodb.Table;
  lmsCoursesTable: dynamodb.Table;
  lmsLessonsTable: dynamodb.Table;
  lmsPathsTable: dynamodb.Table;
  lmsProgressTable: dynamodb.Table;
  lmsAssignmentsTable: dynamodb.Table;
  lmsCertificatesTable: dynamodb.Table;
  lmsTranscriptsTable: dynamodb.Table;
  metadataTable: dynamodb.ITable;
  lmsMediaBucket: s3.Bucket;
  allowedOrigins: string[];
}

export class BaseStack extends cdk.NestedStack {
  public readonly apiLambda: lambda.Function;
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly lambdaRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // IAM Role for Lambda
    this.lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Enablement Portal API Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    props.eventsTable.grantWriteData(this.lambdaRole);
    props.eventsTable.grantReadData(this.lambdaRole);

    // Grant LMS DynamoDB permissions
    props.lmsCoursesTable.grantReadWriteData(this.lambdaRole);
    props.lmsLessonsTable.grantReadWriteData(this.lambdaRole);
    props.lmsPathsTable.grantReadWriteData(this.lambdaRole);
    props.lmsProgressTable.grantReadWriteData(this.lambdaRole);
    props.lmsAssignmentsTable.grantReadWriteData(this.lambdaRole);
    props.lmsCertificatesTable.grantReadWriteData(this.lambdaRole);
    props.lmsTranscriptsTable.grantReadWriteData(this.lambdaRole);
    props.metadataTable.grantReadWriteData(this.lambdaRole);

    // Grant LMS S3 permissions (read/write on all objects in bucket)
    props.lmsMediaBucket.grantReadWrite(this.lambdaRole);

    // Add Transcribe permissions to API Lambda role
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
        'transcribe:ListTranscriptionJobs',
      ],
      resources: ['*'],
    }));

    // Add SSM permissions for AI API keys (OpenAI and Google Gemini) and Unsplash
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/openai/api-key`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/gemini/api-key`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/gcp/service-account-json`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/unsplash/access-key`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/unsplash/application-id`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/enablement-portal/unsplash/secret-key`,
      ],
    }));

    // Email domain validator Lambda (restrict to @gravyty.com)
    const emailDomainValidator = new CognitoEmailDomainValidator(this, 'EmailDomainValidator', {
      allowedDomains: ['gravyty.com'],
    });

    // Cognito User Pool
    // IMPORTANT: Uses RETAIN policy to prevent deletion on stack destroy
    // This ensures the pool persists across deployments and prevents creating new pools
    // 
    // To use an existing pool instead of creating a new one:
    //   export EXISTING_USER_POOL_ID=us-east-1_xBNZh7TaB
    //   npm run cdk:deploy
    const existingUserPoolId = process.env.EXISTING_USER_POOL_ID;
    
    let isExistingPool = false;
    if (existingUserPoolId) {
      // Import existing User Pool instead of creating new one
      // This prevents creating duplicate pools on each deployment
      console.log(`[BaseStack] Using existing User Pool: ${existingUserPoolId}`);
      this.userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', existingUserPoolId);
      isExistingPool = true;
    } else {
      // Create new User Pool (only if EXISTING_USER_POOL_ID is not set)
      // RETAIN policy ensures it won't be deleted on stack destroy
      // However, CDK will still create a NEW pool if it doesn't find the existing one
      // To prevent this, always set EXISTING_USER_POOL_ID when deploying
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
        removalPolicy: cdk.RemovalPolicy.RETAIN, // CRITICAL: Prevents deletion on stack destroy
        // Note: lambdaTriggers are set later via CfnUserPool to avoid circular dependency
      });
    }

    // Grant Cognito permission to invoke the email domain validator Lambda
    // Use wildcard ARN to avoid circular dependency with UserPool ARN
    emailDomainValidator.function.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      // Use wildcard ARN instead of specific UserPool ARN to break circular dependency
      sourceArn: `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`,
    });

    // Auto-assign Viewer role Lambda (assigns @gravyty.com users to Viewer group)
    // Pass empty string - the Lambda uses wildcard ARN so doesn't need specific UserPool ID
    const autoAssignViewer = new CognitoAutoAssignViewer(this, 'AutoAssignViewer', {
      userPoolId: '', // Not used anymore - Lambda uses wildcard ARN
    });

    // Grant Cognito permission to invoke the auto-assign Lambda
    // Use wildcard ARN to avoid circular dependency with UserPool ARN
    autoAssignViewer.function.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      // Use wildcard ARN instead of specific UserPool ARN to break circular dependency
      sourceArn: `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`,
    });

    // Add lambda triggers to User Pool using CfnUserPool AFTER permissions are set
    // This breaks the circular dependency by configuring triggers after all resources are created
    // Only set lambda config for newly created pools, not imported ones
    // (Imported pools should already have their lambda triggers configured)
    if (!isExistingPool) {
      const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;
      if (cfnUserPool) {
        cfnUserPool.lambdaConfig = {
          preTokenGeneration: emailDomainValidator.function.functionArn,
          postAuthentication: autoAssignViewer.function.functionArn,
        };
        
        // Ensure lambdaConfig is set after permissions are created
        cfnUserPool.node.addDependency(emailDomainValidator.function);
        cfnUserPool.node.addDependency(autoAssignViewer.function);
      }
    } else {
      console.log(`[BaseStack] Skipping lambda config for existing User Pool (triggers should already be configured)`);
    }

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

    // Grant Cognito admin permissions to Lambda role for user management
    // Use wildcard ARN to avoid circular dependency
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:ListUsers',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminEnableUser',
        'cognito-idp:AdminDisableUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminRemoveUserFromGroup',
        'cognito-idp:AdminListGroupsForUser',
        'cognito-idp:ListGroups',
      ],
      resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`],
    }));

    // Google Identity Provider
    // Store Google OAuth credentials in SSM Parameter Store
    const googleClientIdParam = new ssm.StringParameter(this, 'GoogleClientIdParam', {
      parameterName: '/enablement-portal/cognito/google-client-id',
      description: 'Google OAuth Client ID for Cognito',
      stringValue: 'REPLACE_WITH_GOOGLE_CLIENT_ID', // Must be set manually
    });

    const googleClientSecretParam = new ssm.StringParameter(this, 'GoogleClientSecretParam', {
      parameterName: '/enablement-portal/cognito/google-client-secret',
      description: 'Google OAuth Client Secret for Cognito',
      stringValue: 'REPLACE_WITH_GOOGLE_CLIENT_SECRET', // Must be set manually
    });

    const googleIdp = new cognito.CfnUserPoolIdentityProvider(this, 'GoogleIdp', {
      userPoolId: this.userPool.userPoolId,
      providerName: 'Google',
      providerType: 'Google',
      providerDetails: {
        client_id: googleClientIdParam.stringValue,
        client_secret: googleClientSecretParam.stringValue,
        authorize_scopes: 'openid email profile',
      },
      attributeMapping: {
        email: 'email',
        email_verified: 'email_verified',
        name: 'name',
        picture: 'picture',
        username: 'sub',
        given_name: 'given_name',
        family_name: 'family_name',
      },
    });

    // Cognito User Pool Client
    // When using EXISTING_USER_POOL_ID, if a client with this name already exists,
    // CDK will create a new one. To use the existing client, set EXISTING_USER_POOL_CLIENT_ID.
    // Otherwise, this will create/update the client as needed.
    const existingClientId = process.env.EXISTING_USER_POOL_CLIENT_ID;
    
    if (existingClientId && existingUserPoolId) {
      // Import existing client when using existing pool
      console.log(`[BaseStack] Using existing User Pool Client: ${existingClientId}`);
      this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
        this,
        'UserPoolClient',
        existingClientId
      );
    } else {
      // Create new client (will update existing one if name matches)
      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: this.userPool,
        userPoolClientName: 'enablement-portal-client',
        generateSecret: false,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
          },
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
          ],
          // Include both base origin (for Amplify OAuth redirect) and /auth/callback path
          // Amplify's signInWithRedirect uses the base origin as redirect_uri
          callbackUrls: [
            ...props.allowedOrigins.map(origin => origin), // Base origin (e.g., https://main.xxx.amplifyapp.com)
            ...props.allowedOrigins.map(origin => `${origin}/`), // Base origin with trailing slash
            ...props.allowedOrigins.map(origin => `${origin}/auth/callback`), // Explicit callback path
          ],
          logoutUrls: [
            ...props.allowedOrigins.map(origin => origin), // Base origin
            ...props.allowedOrigins.map(origin => `${origin}/`), // Base origin with trailing slash
            ...props.allowedOrigins.map(origin => `${origin}/auth/logout`), // Explicit logout path
          ],
        },
        preventUserExistenceErrors: true,
      });
    }

    // Cognito Domain (for hosted UI)
    // IMPORTANT: Domain 'enablement-portal-75874255' already exists and is associated with the UserPool.
    // The domain was created in the main stack before we refactored to nested stacks.
    // Since Cognito domains are globally unique and can only be associated with one UserPool,
    // we CANNOT create it again in the nested stack - it will fail with "already associated".
    // 
    // Solution: Skip domain creation entirely. The domain already works and is associated.
    // For outputs, we'll use a string reference since we know the domain name.
    const accountSuffix = cdk.Token.isUnresolved(this.account) 
      ? 'default' 
      : this.account.substring(0, 8).replace(/[^a-z0-9-]/g, '');
    const domainPrefix = `enablement-portal-${accountSuffix}`;
    
    // DO NOT create the domain resource - it already exists and is working
    // Create a UserPoolDomain-like object for type compatibility with outputs only
    // This is just a reference, not an actual CloudFormation resource
    this.userPoolDomain = {
      domainName: domainPrefix,
      baseUrl: () => `https://${domainPrefix}.auth.${this.region}.amazoncognito.com`,
    } as cognito.UserPoolDomain;

    // Lambda Function for API (only if dist-lambda exists)
    const apiCodePath = path.join(__dirname, '../../apps/api/dist-lambda');
    const fs = require('fs');
    
    if (fs.existsSync(apiCodePath)) {
      this.apiLambda = new lambda.Function(this, 'ApiLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'lambda.handler',
        code: lambda.Code.fromAsset(apiCodePath),
        role: this.lambdaRole,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          STORAGE_BACKEND: 'aws',
          DDB_TABLE_EVENTS: props.eventsTable.tableName,
          PRESIGNED_UPLOAD_EXPIRY_SECONDS: '300',
          PRESIGNED_DOWNLOAD_EXPIRY_SECONDS: '3600',
          // Cognito config - use token references to avoid circular dependency
          COGNITO_USER_POOL_ID: cdk.Token.asString(this.userPool.userPoolId),
          COGNITO_USER_POOL_CLIENT_ID: cdk.Token.asString(this.userPoolClient.userPoolClientId),
          // LMS Tables
          LMS_COURSES_TABLE: props.lmsCoursesTable.tableName,
          LMS_LESSONS_TABLE: props.lmsLessonsTable.tableName,
          LMS_PATHS_TABLE: props.lmsPathsTable.tableName,
          LMS_PROGRESS_TABLE: props.lmsProgressTable.tableName,
          LMS_ASSIGNMENTS_TABLE: props.lmsAssignmentsTable.tableName,
          LMS_CERTIFICATES_TABLE: props.lmsCertificatesTable.tableName,
          LMS_TRANSCRIPTS_TABLE: props.lmsTranscriptsTable.tableName,
          METADATA_TABLE: props.metadataTable.tableName,
          // LMS S3 Bucket
          LMS_MEDIA_BUCKET: props.lmsMediaBucket.bucketName,
          // GCP/Vertex AI configuration
          GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || '',
          GOOGLE_CLOUD_REGION: process.env.GOOGLE_CLOUD_REGION || process.env.GCP_REGION || 'us-central1',
        },
      });
    } else {
      // Create placeholder - Lambda will be deployed separately after API is built
      console.warn('⚠️  Lambda code not found at', apiCodePath);
      console.warn('   Skipping Lambda deployment. Deploy after building API.');
      this.apiLambda = undefined as any;
    }
  }
}

