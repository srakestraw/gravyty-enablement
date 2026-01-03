/**
 * Google Drive OAuth Helper
 * 
 * Utilities for Google Drive OAuth flow and token management
 */

import { google } from 'googleapis';
import { GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { ssmClient } from '../aws/ssmClient';

const GOOGLE_DRIVE_CLIENT_ID_PARAM = '/enablement-portal/google-drive/client-id';
const GOOGLE_DRIVE_CLIENT_SECRET_PARAM = '/enablement-portal/google-drive/client-secret';
const GOOGLE_DRIVE_REFRESH_TOKEN_PARAM = '/enablement-portal/google-drive/refresh-token';

/**
 * Get Google Drive OAuth client ID from SSM
 */
export async function getGoogleDriveClientId(): Promise<string | null> {
  try {
    const command = new GetParameterCommand({
      Name: GOOGLE_DRIVE_CLIENT_ID_PARAM,
      WithDecryption: false,
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error('[GoogleDrive] Error getting client ID:', error);
    return null;
  }
}

/**
 * Get Google Drive OAuth client secret from SSM
 */
export async function getGoogleDriveClientSecret(): Promise<string | null> {
  try {
    const command = new GetParameterCommand({
      Name: GOOGLE_DRIVE_CLIENT_SECRET_PARAM,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error('[GoogleDrive] Error getting client secret:', error);
    return null;
  }
}

/**
 * Store refresh token in SSM
 */
export async function storeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const command = new PutParameterCommand({
      Name: GOOGLE_DRIVE_REFRESH_TOKEN_PARAM,
      Value: refreshToken,
      Type: 'SecureString',
      Overwrite: true,
    });
    await ssmClient.send(command);
  } catch (error) {
    console.error('[GoogleDrive] Error storing refresh token:', error);
    throw error;
  }
}

/**
 * Get refresh token from SSM
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const command = new GetParameterCommand({
      Name: GOOGLE_DRIVE_REFRESH_TOKEN_PARAM,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error('[GoogleDrive] Error getting refresh token:', error);
    return null;
  }
}

/**
 * Create OAuth2 client for Google Drive
 */
export async function createGoogleDriveOAuthClient(redirectUri: string) {
  const clientId = await getGoogleDriveClientId();
  const clientSecret = await getGoogleDriveClientSecret();
  
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials not configured');
  }
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Generate OAuth authorization URL
 */
export async function generateAuthUrl(redirectUri: string, state?: string): Promise<string> {
  const oauth2Client = await createGoogleDriveOAuthClient(redirectUri);
  
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiryDate: number }> {
  const oauth2Client = await createGoogleDriveOAuthClient(redirectUri);
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600000, // Default 1 hour
  };
}

/**
 * Get access token using refresh token
 */
export async function refreshAccessToken(): Promise<{ accessToken: string; expiryDate: number }> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const clientId = await getGoogleDriveClientId();
  const clientSecret = await getGoogleDriveClientSecret();
  
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials not configured');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost' // Redirect URI not needed for refresh
  );
  
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }
  
  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date || Date.now() + 3600000,
  };
}

/**
 * Create authenticated Google Drive client
 */
export async function createDriveClient(): Promise<typeof google.drive> {
  const { accessToken } = await refreshAccessToken();
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}


