#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EnablementPortalStack } from '../lib/enablement-portal-stack';

const app = new cdk.App();

new EnablementPortalStack(app, 'EnablementPortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Gravyty Enablement Portal Infrastructure',
});




