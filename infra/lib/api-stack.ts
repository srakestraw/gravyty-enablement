import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.NestedStackProps {
  apiLambda: lambda.Function;
  allowedOrigins: string[];
}

/**
 * API stack containing HTTP API Gateway and Lambda integration
 * This is separated from base stack to break circular dependencies
 */
export class ApiStack extends cdk.NestedStack {
  public readonly httpApi: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // HTTP API (API Gateway v2)
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      description: 'Enablement Portal API',
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
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

    // Create integration using lower-level construct to avoid automatic permission creation
    // Get the underlying CfnApi to create integration manually
    const cfnApi = this.httpApi.node.defaultChild as apigatewayv2.CfnApi;
    
    // Create Lambda integration manually using CfnIntegration
    const integration = new apigatewayv2.CfnIntegration(this, 'LambdaIntegration', {
      apiId: cfnApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: props.apiLambda.functionArn,
      payloadFormatVersion: '1.0',
    });
    
    // Ensure integration depends on Lambda function to establish proper order
    integration.node.addDependency(props.apiLambda);

    // Create routes manually using CfnRoute
    const routeV1 = new apigatewayv2.CfnRoute(this, 'RouteV1', {
      apiId: cfnApi.ref,
      routeKey: 'ANY /v1/{proxy+}',
      target: `integrations/${integration.ref}`,
    });

    const routeHealth = new apigatewayv2.CfnRoute(this, 'RouteHealth', {
      apiId: cfnApi.ref,
      routeKey: 'GET /health',
      target: `integrations/${integration.ref}`,
    });

    // Ensure routes depend on integration
    routeV1.addDependency(integration);
    routeHealth.addDependency(integration);

    // Note: Lambda permission will be created in main stack after both nested stacks
    // This avoids cross-stack circular dependencies between BaseStack and ApiStack
  }
}

