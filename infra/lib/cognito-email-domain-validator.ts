/**
 * Cognito Pre-Authentication Lambda Trigger
 * 
 * Validates that users have @gravyty.com email domains
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

export interface CognitoEmailDomainValidatorProps {
  /**
   * Allowed email domains (e.g., ['gravyty.com'])
   */
  allowedDomains: string[];
}

/**
 * Lambda function that validates email domains during Cognito authentication
 */
export class CognitoEmailDomainValidator extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: CognitoEmailDomainValidatorProps) {
    super(scope, id);

    this.function = new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/email-domain-validator')),
      description: 'Validates email domains for Cognito authentication',
      timeout: cdk.Duration.seconds(5),
    });
  }
}

