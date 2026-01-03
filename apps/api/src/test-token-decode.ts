/**
 * Test script to decode and verify JWT token
 * Run with: tsx src/test-token-decode.ts <token>
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_xBNZh7TaB';
const USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID || '18b68j5jbm61pthstbk3ngeaa3';

const token = process.argv[2];

if (!token) {
  console.error('Usage: tsx src/test-token-decode.ts <jwt-token>');
  process.exit(1);
}

async function testToken() {
  console.log('========================================');
  console.log('Token Decode Test');
  console.log('========================================\n');

  // 1. Decode raw token
  console.log('1. Decoding raw token (no verification)...');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const rawPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    console.log('Raw payload groups:', rawPayload['cognito:groups']);
    console.log('Raw payload keys:', Object.keys(rawPayload));
    console.log('Raw payload (full):', JSON.stringify(rawPayload, null, 2));
  } catch (error) {
    console.error('Error decoding raw token:', error);
  }

  console.log('\n');

  // 2. Verify token
  console.log('2. Verifying token with CognitoJwtVerifier...');
  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id',
      clientId: USER_POOL_CLIENT_ID,
    });

    const verifiedPayload = await verifier.verify(token);
    console.log('Verified payload groups:', verifiedPayload['cognito:groups']);
    console.log('Verified payload keys:', Object.keys(verifiedPayload));
    console.log('Verified payload (full):', JSON.stringify(verifiedPayload, null, 2));
  } catch (error) {
    console.error('Error verifying token:', error);
  }
}

testToken().catch(console.error);

