import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as path from 'path';
import { BaseStack } from './base-stack';
import { ApiStack } from './api-stack';

export class EnablementPortalStack extends cdk.Stack {
  public readonly eventsTable: dynamodb.Table;
  // LMS Tables
  public readonly lmsCoursesTable: dynamodb.Table;
  public readonly lmsLessonsTable: dynamodb.Table;
  public readonly lmsPathsTable: dynamodb.Table;
  public readonly lmsProgressTable: dynamodb.Table;
  public readonly lmsAssignmentsTable: dynamodb.Table;
  public readonly lmsCertificatesTable: dynamodb.Table;
  public readonly lmsTranscriptsTable: dynamodb.Table;
  public readonly taxonomyTable: dynamodb.Table;
  // LMS S3 Bucket
  public readonly lmsMediaBucket: s3.Bucket;
  public readonly apiRole: iam.Role;
  public readonly baseStack: BaseStack;
  public readonly apiStack?: ApiStack;
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

    const allowedOrigins = getAllowedOrigins();

    // DynamoDB Tables

    // events table (actively used - KEEP)
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

    // LMS DynamoDB Tables
    // LMS Courses Table
    this.lmsCoursesTable = new dynamodb.Table(this, 'LmsCourses', {
      tableName: 'lms_courses',
      partitionKey: { name: 'course_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: PublishedCatalogIndex
    this.lmsCoursesTable.addGlobalSecondaryIndex({
      indexName: 'PublishedCatalogIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
    });
    // GSI: ProductIndex
    this.lmsCoursesTable.addGlobalSecondaryIndex({
      indexName: 'ProductIndex',
      partitionKey: { name: 'product_suite', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updated_at', type: dynamodb.AttributeType.STRING },
    });

    // LMS Lessons Table
    this.lmsLessonsTable = new dynamodb.Table(this, 'LmsLessons', {
      tableName: 'lms_lessons',
      partitionKey: { name: 'course_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lesson_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: LessonByIdIndex (for direct lookup by lesson_id)
    this.lmsLessonsTable.addGlobalSecondaryIndex({
      indexName: 'LessonByIdIndex',
      partitionKey: { name: 'lesson_id', type: dynamodb.AttributeType.STRING },
    });

    // LMS Paths Table
    this.lmsPathsTable = new dynamodb.Table(this, 'LmsPaths', {
      tableName: 'lms_paths',
      partitionKey: { name: 'path_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: PublishedPathsIndex
    this.lmsPathsTable.addGlobalSecondaryIndex({
      indexName: 'PublishedPathsIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
    });

    // LMS Progress Table
    this.lmsProgressTable = new dynamodb.Table(this, 'LmsProgress', {
      tableName: 'lms_progress',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // COURSE#course_id or PATH#path_id
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: CourseProgressByCourseIndex
    this.lmsProgressTable.addGlobalSecondaryIndex({
      indexName: 'CourseProgressByCourseIndex',
      partitionKey: { name: 'course_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'last_activity_at', type: dynamodb.AttributeType.STRING },
    });

    // LMS Assignments Table
    this.lmsAssignmentsTable = new dynamodb.Table(this, 'LmsAssignments', {
      tableName: 'lms_assignments',
      partitionKey: { name: 'assignee_user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // ASSIGNMENT#assigned_at#assignment_id
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: AssignmentsByTargetIndex
    this.lmsAssignmentsTable.addGlobalSecondaryIndex({
      indexName: 'AssignmentsByTargetIndex',
      partitionKey: { name: 'target_key', type: dynamodb.AttributeType.STRING }, // TARGET#target_type#target_id
      sortKey: { name: 'due_at', type: dynamodb.AttributeType.STRING },
    });
    // GSI: AssignmentsByStatusIndex
    this.lmsAssignmentsTable.addGlobalSecondaryIndex({
      indexName: 'AssignmentsByStatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'due_at', type: dynamodb.AttributeType.STRING },
    });

    // LMS Certificates Table (single table for templates and issued certificates)
    this.lmsCertificatesTable = new dynamodb.Table(this, 'LmsCertificates', {
      tableName: 'lms_certificates',
      partitionKey: { name: 'entity_type', type: dynamodb.AttributeType.STRING }, // TEMPLATE or ISSUED#user_id
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // template_id or issued_at#certificate_id
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: TemplatesByUpdatedIndex
    this.lmsCertificatesTable.addGlobalSecondaryIndex({
      indexName: 'TemplatesByUpdatedIndex',
      partitionKey: { name: 'entity_type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updated_at', type: dynamodb.AttributeType.STRING },
    });
    // GSI: IssuedCertificatesByUserIndex
    this.lmsCertificatesTable.addGlobalSecondaryIndex({
      indexName: 'IssuedCertificatesByUserIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'issued_at', type: dynamodb.AttributeType.STRING },
    });

    // Taxonomy Table
    this.taxonomyTable = new dynamodb.Table(this, 'Taxonomy', {
      tableName: 'taxonomy',
      partitionKey: { name: 'option_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: GroupKeyIndex
    this.taxonomyTable.addGlobalSecondaryIndex({
      indexName: 'GroupKeyIndex',
      partitionKey: { name: 'group_key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sort_order_label', type: dynamodb.AttributeType.STRING },
    });

    // LMS Transcripts Table
    // Note: If this table already exists from a failed deployment, you may need to:
    // 1. Import it: npx cdk import --resource-mapping-file <mapping-file> EnablementPortalStack
    // 2. Or delete it (if empty): aws dynamodb delete-table --table-name lms_transcripts
    // See infra/scripts/import-transcripts-table.sh for import script
    this.lmsTranscriptsTable = new dynamodb.Table(this, 'LmsTranscripts', {
      tableName: 'lms_transcripts',
      partitionKey: { name: 'transcript_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    // GSI: by_lesson_id
    this.lmsTranscriptsTable.addGlobalSecondaryIndex({
      indexName: 'by_lesson_id',
      partitionKey: { name: 'lesson_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lesson_id#created_at', type: dynamodb.AttributeType.STRING },
    });

    // LMS Media S3 Bucket
    this.lmsMediaBucket = new s3.Bucket(this, 'LmsMediaBucket', {
      bucketName: `lms-media-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedOrigins: allowedOrigins,
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
    });

    // Grant LMS DynamoDB permissions
    this.lmsCoursesTable.grantReadWriteData(lambdaRole);
    this.lmsLessonsTable.grantReadWriteData(lambdaRole);
    this.lmsPathsTable.grantReadWriteData(lambdaRole);
    this.lmsProgressTable.grantReadWriteData(lambdaRole);
    this.lmsAssignmentsTable.grantReadWriteData(lambdaRole);
    this.lmsCertificatesTable.grantReadWriteData(lambdaRole);
    this.lmsTranscriptsTable.grantReadWriteData(lambdaRole);
    this.taxonomyTable.grantReadWriteData(lambdaRole);

    // Grant LMS S3 permissions (read/write on all objects in bucket)
    this.lmsMediaBucket.grantReadWrite(lambdaRole);

    // Keep apiRole for backward compatibility (EC2 use case)
    this.apiRole = lambdaRole;

    // Create Base Stack (Cognito + Lambda) as nested stack to break circular dependencies
    this.baseStack = new BaseStack(this, 'BaseStack', {
      eventsTable: this.eventsTable,
      lmsCoursesTable: this.lmsCoursesTable,
      lmsLessonsTable: this.lmsLessonsTable,
      lmsPathsTable: this.lmsPathsTable,
      lmsProgressTable: this.lmsProgressTable,
      lmsAssignmentsTable: this.lmsAssignmentsTable,
      lmsCertificatesTable: this.lmsCertificatesTable,
      lmsTranscriptsTable: this.lmsTranscriptsTable,
      taxonomyTable: this.taxonomyTable,
      lmsMediaBucket: this.lmsMediaBucket,
      allowedOrigins,
    });

    // Reference nested stack resources
    this.userPool = this.baseStack.userPool;
    this.userPoolClient = this.baseStack.userPoolClient;
    this.userPoolDomain = this.baseStack.userPoolDomain;
    this.apiLambda = this.baseStack.apiLambda;

    // Create API Stack (HTTP API Gateway) as nested stack if Lambda exists
    if (this.apiLambda) {
      this.apiStack = new ApiStack(this, 'ApiStack', {
        apiLambda: this.apiLambda,
        allowedOrigins,
      });
      this.httpApi = this.apiStack.httpApi;
    }

    // Transcription Worker Lambda (stays in main stack as it doesn't cause circular dependencies)

    // Transcription Worker Lambda (stays in main stack as it doesn't cause circular dependencies)
    const transcriptionWorkerLambda = new NodejsFunction(this, 'TranscriptionWorker', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/transcription-worker/index.ts'),
      description: 'Processes AWS Transcribe job completion events',
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        LMS_CERTIFICATES_TABLE: this.lmsCertificatesTable.tableName,
        LMS_LESSONS_TABLE: this.lmsLessonsTable.tableName,
        LMS_TRANSCRIPTS_TABLE: this.lmsTranscriptsTable.tableName,
        LMS_MEDIA_BUCKET: this.lmsMediaBucket.bucketName,
        BRAIN_INGEST_QUEUE_URL: process.env.BRAIN_INGEST_QUEUE_URL || '', // Set via env var if queue exists
      },
    });

    // Grant permissions to transcription worker
    this.lmsCertificatesTable.grantReadWriteData(transcriptionWorkerLambda);
    this.lmsLessonsTable.grantReadWriteData(transcriptionWorkerLambda);
    this.lmsTranscriptsTable.grantReadWriteData(transcriptionWorkerLambda);
    this.lmsMediaBucket.grantRead(transcriptionWorkerLambda);
    transcriptionWorkerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'transcribe:GetTranscriptionJob',
      ],
      resources: ['*'],
    }));
    // Grant SQS send permission if queue URL is provided
    if (process.env.BRAIN_INGEST_QUEUE_URL) {
      transcriptionWorkerLambda.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
        ],
        resources: [process.env.BRAIN_INGEST_QUEUE_URL],
      }));
    }

    // EventBridge rule for Transcribe job completion
    const transcribeRule = new events.Rule(this, 'TranscribeJobCompletionRule', {
      description: 'Triggers transcription worker when Transcribe jobs complete',
      eventPattern: {
        source: ['aws.transcribe'],
        detailType: ['Transcribe Job State Change'],
        detail: {
          TranscriptionJobStatus: ['COMPLETED', 'FAILED'],
        },
      },
    });

    transcribeRule.addTarget(new targets.LambdaFunction(transcriptionWorkerLambda));

    // Content Hub Scheduler Lambda
    const contentHubSchedulerLambda = new NodejsFunction(this, 'ContentHubScheduler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/content-hub-scheduler/index.ts'),
      description: 'Publishes scheduled versions and expires published versions',
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        DDB_TABLE_CONTENT: process.env.DDB_TABLE_CONTENT || 'content_registry',
        AWS_REGION: this.region,
      },
    });

    // Grant DynamoDB permissions
    this.eventsTable.grantReadWriteData(contentHubSchedulerLambda);
    // Note: content_registry table permissions need to be granted
    // Since content_registry is created via scripts, we'll grant permissions via IAM policy
    contentHubSchedulerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${process.env.DDB_TABLE_CONTENT || 'content_registry'}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${process.env.DDB_TABLE_CONTENT || 'content_registry'}/index/*`,
      ],
    }));

    // EventBridge rule for Content Hub scheduler (runs every 5 minutes)
    const contentHubSchedulerRule = new events.Rule(this, 'ContentHubSchedulerRule', {
      description: 'Runs Content Hub scheduler every 5 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });

    contentHubSchedulerRule.addTarget(new targets.LambdaFunction(contentHubSchedulerLambda));

    // Create Lambda permission AFTER both nested stacks are fully created
    // This breaks the circular dependency by creating the permission last in the main stack
    // Must be done after both BaseStack and ApiStack are instantiated
    if (this.apiLambda && this.httpApi) {
      // Use wildcard ARN to avoid referencing the specific API Gateway ARN
      // This prevents circular dependencies between nested stacks
      this.apiLambda.addPermission('ApiGatewayInvoke', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:*/*/*`,
      });
    }

    new cdk.CfnOutput(this, 'EventsTableName', {
      value: this.eventsTable.tableName,
      description: 'DynamoDB table name for events',
      exportName: 'EnablementEventsTableName',
    });

    // LMS Outputs
    new cdk.CfnOutput(this, 'LmsCoursesTableName', {
      value: this.lmsCoursesTable.tableName,
      description: 'DynamoDB table name for LMS courses',
      exportName: 'EnablementLmsCoursesTableName',
    });

    new cdk.CfnOutput(this, 'LmsLessonsTableName', {
      value: this.lmsLessonsTable.tableName,
      description: 'DynamoDB table name for LMS lessons',
      exportName: 'EnablementLmsLessonsTableName',
    });

    new cdk.CfnOutput(this, 'LmsPathsTableName', {
      value: this.lmsPathsTable.tableName,
      description: 'DynamoDB table name for LMS paths',
      exportName: 'EnablementLmsPathsTableName',
    });

    new cdk.CfnOutput(this, 'LmsProgressTableName', {
      value: this.lmsProgressTable.tableName,
      description: 'DynamoDB table name for LMS progress',
      exportName: 'EnablementLmsProgressTableName',
    });

    new cdk.CfnOutput(this, 'LmsAssignmentsTableName', {
      value: this.lmsAssignmentsTable.tableName,
      description: 'DynamoDB table name for LMS assignments',
      exportName: 'EnablementLmsAssignmentsTableName',
    });

    new cdk.CfnOutput(this, 'LmsCertificatesTableName', {
      value: this.lmsCertificatesTable.tableName,
      description: 'DynamoDB table name for LMS certificates',
      exportName: 'EnablementLmsCertificatesTableName',
    });

    new cdk.CfnOutput(this, 'TaxonomyTableName', {
      value: this.taxonomyTable.tableName,
      description: 'DynamoDB table name for taxonomy',
      exportName: 'EnablementTaxonomyTableName',
    });

    new cdk.CfnOutput(this, 'LmsMediaBucketName', {
      value: this.lmsMediaBucket.bucketName,
      description: 'S3 bucket name for LMS media',
      exportName: 'EnablementLmsMediaBucketName',
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
      value: '/enablement-portal/cognito/google-client-id',
      description: 'SSM Parameter name for Google Client ID',
      exportName: 'EnablementGoogleClientIdParam',
    });

    new cdk.CfnOutput(this, 'GoogleClientSecretParamName', {
      value: '/enablement-portal/cognito/google-client-secret',
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

