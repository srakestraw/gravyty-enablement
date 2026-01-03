/**
 * Test script to verify Admin role extraction from JWT token
 * 
 * Usage: tsx test-admin-access.ts <token>
 * 
 * This script decodes a JWT token and shows what groups/roles are extracted
 */

import { normalizeGroups, extractRoleFromGroups } from './src/middleware/jwtAuth';

// Get token from command line args
const token = process.argv[2];

if (!token) {
  console.error('Usage: tsx test-admin-access.ts <jwt-token>');
  console.error('Example: tsx test-admin-access.ts eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

try {
  // Decode token manually
  const parts = token.split('.');
  if (parts.length < 2) {
    console.error('Invalid token format');
    process.exit(1);
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  
  console.log('\n=== Token Payload Analysis ===\n');
  console.log('Email:', payload.email);
  console.log('User ID:', payload.sub);
  console.log('Issuer:', payload.iss);
  console.log('\n=== Groups in Token ===\n');
  
  // Check all possible group claim names
  const groupClaims = {
    'cognito:groups': payload['cognito:groups'],
    'groups': payload.groups,
    'cognito_groups': payload.cognito_groups,
  };
  
  for (const [claimName, claimValue] of Object.entries(groupClaims)) {
    if (claimValue) {
      console.log(`${claimName}:`, claimValue);
      console.log(`  Type:`, typeof claimValue);
      console.log(`  Is Array:`, Array.isArray(claimValue));
      console.log(`  Stringified:`, JSON.stringify(claimValue));
      
      // Test normalization
      const normalized = normalizeGroups(claimValue);
      console.log(`  Normalized:`, normalized);
      
      // Test role extraction
      const role = extractRoleFromGroups(normalized);
      console.log(`  Extracted Role:`, role);
      console.log('');
    }
  }
  
  // Show all keys that might contain groups
  const allKeys = Object.keys(payload);
  const groupKeys = allKeys.filter(k => k.toLowerCase().includes('group'));
  console.log('All group-related keys:', groupKeys);
  console.log('\n=== Full Payload Keys ===\n');
  console.log(allKeys.join(', '));
  
} catch (error) {
  console.error('Error decoding token:', error);
  if (error instanceof Error) {
    console.error('Message:', error.message);
  }
  process.exit(1);
}

