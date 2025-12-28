/**
 * Debug utilities for authentication
 * 
 * Use these in the browser console to debug auth issues
 */

import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Decode JWT token payload (without verification)
 */
function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Debug function to check current auth state
 * Call this from browser console: window.debugAuth()
 */
export async function debugAuth() {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    
    if (!session.tokens?.idToken) {
      console.error('❌ No ID token found');
      return;
    }
    
    const idTokenString = session.tokens.idToken.toString();
    const payload = decodeJwtPayload(idTokenString);
    
    if (!payload) {
      console.error('❌ Failed to decode token');
      return;
    }
    
    const groups = payload['cognito:groups'] || payload.groups || [];
    const email = payload.email;
    const sub = payload.sub;
    
    console.log('🔍 Auth Debug Info:');
    console.log('==================');
    console.log('Email:', email);
    console.log('User ID (sub):', sub);
    console.log('Groups in token:', groups);
    console.log('Has Admin group:', groups.includes('Admin'));
    console.log('');
    console.log('All token claims:', Object.keys(payload));
    console.log('');
    console.log('Full token payload:', payload);
    
    if (groups.length === 0) {
      console.warn('⚠️  WARNING: No groups found in token!');
      console.warn('   This usually means:');
      console.warn('   1. You need to SIGN OUT and SIGN BACK IN to refresh your token');
      console.warn('   2. Or the user is not in any Cognito groups');
      console.warn('');
      console.warn('   SOLUTION: Sign out completely, then sign back in with Google OAuth');
    } else if (!groups.includes('Admin')) {
      console.warn('⚠️  WARNING: Admin group not found in token!');
      console.warn('   Current groups:', groups);
      console.warn('   You are in the Admin group in Cognito, but your token is old.');
      console.warn('');
      console.warn('   SOLUTION: Sign out completely, then sign back in to get a fresh token');
    } else {
      console.log('✅ Admin group found in token!');
      console.log('   Your role should be Admin. If you still see errors, check API logs.');
    }
    
    return {
      email,
      sub,
      groups,
      isAdmin: groups.includes('Admin'),
      payload,
    };
  } catch (error) {
    console.error('❌ Error debugging auth:', error);
    return null;
  }
}

// Make it available globally in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}

