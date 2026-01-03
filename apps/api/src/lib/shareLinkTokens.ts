/**
 * Share Link Token Generation
 * 
 * High-entropy token generation for secure share links.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a high-entropy, unguessable token for share links
 * 
 * Uses crypto.randomBytes for cryptographically secure random generation.
 * Returns a URL-safe base64-encoded string.
 * 
 * @param length - Number of random bytes (default: 32, produces ~43 char token)
 * @returns URL-safe base64 token
 */
export function generateShareToken(length: number = 32): string {
  const bytes = randomBytes(length);
  // Convert to base64url (URL-safe base64)
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a verification token for email verification
 * 
 * @returns URL-safe base64 token
 */
export function generateVerificationToken(): string {
  return generateShareToken(24); // 24 bytes = ~32 char token
}


