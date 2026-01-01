/**
 * Cognito Post-Authentication Lambda Trigger
 * 
 * Automatically assigns @gravyty.com users to Viewer group
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface CognitoAutoAssignViewerProps {
  /**
   * User Pool ID to grant permissions for
   */
  userPoolId: string;
}

/**
 * Lambda function that automatically assigns @gravyty.com users to Viewer group
 */
export class CognitoAutoAssignViewer extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: CognitoAutoAssignViewerProps) {
    super(scope, id);

    this.function = new NodejsFunction(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/auto-assign-viewer/index.ts'),
      description: 'Automatically assigns @gravyty.com users to Viewer group',
      timeout: cdk.Duration.seconds(10),
      bundling: {
        // Bundle AWS SDK - Lambda runtime includes v2 but we're using v3
        externalModules: [],
      },
      environment: {
        NODE_ENV: 'production',
      },
    });

    // Grant permissions to list groups and add users to groups
    // Use wildcard ARN to avoid circular dependency with UserPool ID
    // The Lambda will work with any UserPool in the account/region
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminAddUserToGroup',
        ],
        resources: [
          `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/*`,
        ],
      })
    );
  }
}

