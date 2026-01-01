/**
 * Vertex AI Credentials Helper
 * 
 * Manages Google Cloud service account credentials for Vertex AI (Imagen)
 * Supports both local development (via GOOGLE_APPLICATION_CREDENTIALS) and
 * AWS Lambda (via SSM Parameter Store)
 */

import { ssmClient } from '../../aws/ssmClient';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { AIConfigError } from '../types';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const GCP_SERVICE_ACCOUNT_PARAM = process.env.GCP_SERVICE_ACCOUNT_PARAM || '/enablement-portal/gcp/service-account-json';
const GCP_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
const GCP_REGION = process.env.GOOGLE_CLOUD_REGION || process.env.GCP_REGION || 'us-central1';

// Cache credentials path and project info
let cachedCredentialsPath: string | null = null;
let credentialsCacheTime: number = 0;
const CREDENTIALS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get GCP service account credentials JSON from SSM Parameter Store
 * and write it to a temporary file for Application Default Credentials (ADC)
 */
async function getServiceAccountCredentials(): Promise<string> {
  // Check if GOOGLE_APPLICATION_CREDENTIALS is already set (local dev)
  const existingCredsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (existingCredsPath && existsSync(existingCredsPath)) {
    return existingCredsPath;
  }

  // Return cached path if still valid
  if (cachedCredentialsPath && Date.now() - credentialsCacheTime < CREDENTIALS_CACHE_TTL_MS) {
    if (existsSync(cachedCredentialsPath)) {
      return cachedCredentialsPath;
    }
    // Cache invalid, clear it
    cachedCredentialsPath = null;
  }

  try {
    // Get service account JSON from SSM
    const command = new GetParameterCommand({
      Name: GCP_SERVICE_ACCOUNT_PARAM,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    const serviceAccountJson = response.Parameter?.Value;

    if (!serviceAccountJson || serviceAccountJson === 'REPLACE_WITH_GCP_SERVICE_ACCOUNT_JSON') {
      throw new AIConfigError(
        'gemini',
        'GCP service account credentials not configured. Please set GCP_SERVICE_ACCOUNT_PARAM in SSM or GOOGLE_APPLICATION_CREDENTIALS environment variable.'
      );
    }

    // Parse to validate JSON
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (error) {
      throw new AIConfigError(
        'gemini',
        `Invalid service account JSON in SSM: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Write to temporary file (Lambda: /tmp, local: os.tmpdir())
    const tmpDir = process.env.LAMBDA_TASK_ROOT ? '/tmp' : tmpdir();
    const credentialsPath = join(tmpDir, 'gcp-sa.json');
    
    writeFileSync(credentialsPath, serviceAccountJson, { mode: 0o600 });
    
    // Cache the path
    cachedCredentialsPath = credentialsPath;
    credentialsCacheTime = Date.now();

    return credentialsPath;
  } catch (error) {
    if (error instanceof AIConfigError) {
      throw error;
    }
    
    // Better error handling for AWS SDK errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // AWS SDK errors often have name, code, and message properties
      const awsError = error as any;
      if (awsError.name) {
        errorMessage = `${awsError.name}: ${awsError.message || 'No message'}`;
      } else if (awsError.code) {
        errorMessage = `${awsError.code}: ${awsError.message || 'No message'}`;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }
    
    // Check for common SSM errors
    if (errorMessage.includes('ParameterNotFound') || errorMessage.includes('does not exist')) {
      throw new AIConfigError(
        'gemini',
        `GCP service account parameter not found in SSM: ${GCP_SERVICE_ACCOUNT_PARAM}. Please create it using: aws ssm put-parameter --name ${GCP_SERVICE_ACCOUNT_PARAM} --value '...' --type SecureString`
      );
    }
    
    if (errorMessage.includes('AccessDenied') || errorMessage.includes('UnauthorizedOperation')) {
      throw new AIConfigError(
        'gemini',
        `Access denied to SSM parameter: ${GCP_SERVICE_ACCOUNT_PARAM}. Please ensure the Lambda execution role has ssm:GetParameter permission for this parameter.`
      );
    }
    
    throw new AIConfigError(
      'gemini',
      `Failed to retrieve GCP service account credentials from SSM (${GCP_SERVICE_ACCOUNT_PARAM}): ${errorMessage}`
    );
  }
}

/**
 * Initialize Vertex AI credentials by setting GOOGLE_APPLICATION_CREDENTIALS
 * This enables Application Default Credentials (ADC) for Google Cloud clients
 */
export async function initializeVertexAiCredentials(): Promise<void> {
  const credentialsPath = await getServiceAccountCredentials();
  
  // Set environment variable for ADC
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  
  // Also set project and region if not already set
  if (!process.env.GOOGLE_CLOUD_PROJECT && GCP_PROJECT_ID) {
    process.env.GOOGLE_CLOUD_PROJECT = GCP_PROJECT_ID;
  }
  if (!process.env.GOOGLE_CLOUD_REGION && GCP_REGION) {
    process.env.GOOGLE_CLOUD_REGION = GCP_REGION;
  }
}

/**
 * Get GCP project ID
 */
export function getGcpProjectId(): string {
  const projectId = GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new AIConfigError(
      'gemini',
      'GCP project ID not configured. Please set GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.'
    );
  }
  return projectId;
}

/**
 * Get GCP region
 */
export function getGcpRegion(): string {
  return GCP_REGION || process.env.GOOGLE_CLOUD_REGION || 'us-central1';
}

