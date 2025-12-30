/**
 * Lambda Handler
 * 
 * Adapter for running Express app in AWS Lambda via API Gateway
 */

import serverlessExpress from '@vendia/serverless-express';
import app from './server';

// Create Lambda handler from Express app
export const handler = serverlessExpress({ app });





