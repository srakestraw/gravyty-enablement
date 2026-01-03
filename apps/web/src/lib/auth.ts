/**
 * Authentication Module
 * 
 * Handles Cognito authentication using AWS Amplify
 */

import { Amplify } from 'aws-amplify';
import {
  signOut,
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
} from 'aws-amplify/auth';

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// Production domain from environment variable or default
const productionDomain = import.meta.env.VITE_PRODUCTION_DOMAIN || 'https://enable.gravytylabs.com';

// Amplify configuration
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '';
// Support both VITE_COGNITO_DOMAIN (new) and VITE_COGNITO_USER_POOL_DOMAIN (legacy)
const userPoolDomainInput = import.meta.env.VITE_COGNITO_DOMAIN || import.meta.env.VITE_COGNITO_USER_POOL_DOMAIN || '';
// Get region from env or default to us-east-1
const cognitoRegion = import.meta.env.VITE_COGNITO_REGION || 'us-east-1';

// Determine if it's a custom domain or Cognito domain prefix
// Custom domains contain dots (e.g., enablement.gravytylabs.com)
// Cognito prefixes don't (e.g., enablement-portal-75874255)
let userPoolDomain = '';
if (userPoolDomainInput) {
  const trimmedInput = String(userPoolDomainInput).trim();
  if (trimmedInput.includes('.')) {
    // Custom domain - use as-is
    userPoolDomain = trimmedInput;
  } else if (trimmedInput) {
    // Cognito domain prefix - construct full domain
    userPoolDomain = `${trimmedInput}.auth.${cognitoRegion}.amazoncognito.com`;
  }
}

// Debug logging for domain construction (dev mode only)
if (import.meta.env.DEV && typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    // Debug logging removed
  } catch (e) {
    // Silently fail if logging causes issues
  }
}

// Build redirect URLs based on environment
// Always prioritize current origin first to support Amplify preview URLs and dynamic environments
// Cognito requires the redirect_uri to match the origin where OAuth flow is initiated
const getRedirectUrls = (): string[] => {
  const urls: string[] = [];
  
  // Always prioritize current origin first (Amplify uses first URL)
  // This ensures the redirect_uri matches what Cognito expects and works with preview URLs
  if (currentOrigin) {
    urls.push(currentOrigin); // Add without trailing slash first
    urls.push(`${currentOrigin}/`); // Then with trailing slash
  }
  
  if (isProduction) {
    // Production: also include production domain as fallback
    // But current origin (which could be Amplify preview URL) takes priority
    if (productionDomain && currentOrigin !== productionDomain) {
      urls.push(productionDomain);
      urls.push(`${productionDomain}/`);
    }
  } else {
    // Development: include localhost variants
    urls.push('http://localhost:3000');
    urls.push('http://localhost:3000/');
    urls.push('http://localhost:5173');
    urls.push('http://localhost:5173/');
    // Also include production domain for testing
    if (productionDomain && currentOrigin !== productionDomain) {
      urls.push(productionDomain);
      urls.push(`${productionDomain}/`);
    }
  }
  
  // Remove duplicates while preserving order (first occurrence wins)
  const seen = new Set<string>();
  return urls.filter(url => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const redirectSignIn = getRedirectUrls();
const redirectSignOut = getRedirectUrls();

let isConfigured = false;

// Validate domain configuration before configuring Amplify
if (!userPoolDomain) {
  console.error('[Auth] CRITICAL: userPoolDomain is empty!', {
    userPoolDomainInput,
    cognitoRegion,
    userPoolId,
    userPoolClientId,
    envVars: {
      VITE_COGNITO_DOMAIN: import.meta.env.VITE_COGNITO_DOMAIN,
      VITE_COGNITO_REGION: import.meta.env.VITE_COGNITO_REGION,
    },
  });
}

if (userPoolId && userPoolClientId && userPoolDomain) {
  try {
    // Ensure domain is a valid string (not null/undefined)
    const validatedDomain = String(userPoolDomain).trim();
    if (!validatedDomain) {
      throw new Error(`Invalid Cognito domain: "${userPoolDomain}" (type: ${typeof userPoolDomain})`);
    }

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: {
            oauth: {
              domain: validatedDomain,
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn,
              redirectSignOut,
              responseType: 'code',
              providers: ['Google'],
            },
          },
        },
      },
    });
    isConfigured = true;
    
    // Log configuration for debugging
    if (import.meta.env.DEV) {
      console.log('[Auth] Amplify configured:', {
        userPoolId,
        userPoolClientId,
        userPoolDomain: validatedDomain,
        redirectSignIn: redirectSignIn.slice(0, 3), // First 3 URLs
        currentOrigin,
      });
    }
    
    // Configuration successful
  } catch (error) {
    console.error('[Auth] Failed to configure Amplify:', error, {
      userPoolId,
      userPoolClientId,
      userPoolDomain,
      userPoolDomainInput,
      cognitoRegion,
    });
  }
} else {
  const missingVars: string[] = [];
  if (!userPoolId) missingVars.push('VITE_COGNITO_USER_POOL_ID');
  if (!userPoolClientId) missingVars.push('VITE_COGNITO_USER_POOL_CLIENT_ID');
  if (!userPoolDomain) missingVars.push('VITE_COGNITO_DOMAIN');
  
  const errorMsg = `[Auth] Amplify not configured - missing environment variables: ${missingVars.join(', ')}`;
  
  if (isProduction) {
    // In production, this is a critical error - log as error
    console.error(errorMsg, {
      hasUserPoolId: !!userPoolId,
      hasClientId: !!userPoolClientId,
      hasDomain: !!userPoolDomain,
      userPoolDomainInput,
      environment: 'production',
      message: 'Cognito authentication will not work. Please set VITE_COGNITO_DOMAIN in Amplify environment variables.',
    });
  } else {
    console.warn(errorMsg, {
      hasUserPoolId: !!userPoolId,
      hasClientId: !!userPoolClientId,
      hasDomain: !!userPoolDomain,
      userPoolDomainInput,
      environment: 'development',
    });
  }
}

export interface AuthUser {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  authMode?: 'cognito' | 'dev';
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<void> {
  if (!isConfigured) {
    const error = new Error(
      'Amplify is not configured. Please check your environment variables: ' +
      'VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID, VITE_COGNITO_DOMAIN'
    );
    console.error('[Auth] Sign in failed:', error);
    throw error;
  }

  try {
    // Initiating Google sign-in redirect
    // Amplify uses the first redirectSignIn URL as the redirect_uri parameter
    await signInWithRedirect({
      provider: 'Google',
    });
  } catch (error) {
    console.error('[Auth] Sign in redirect failed:', error);
    // Re-throw to let the UI handle the error
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  return signOut();
}

/**
 * Decode JWT token payload (without verification - token is already verified by Amplify)
 */
export function decodeJwtPayload(token: string): any {
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
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    // Try to get email and name from ID token claims
    let email: string | undefined;
    let name: string | undefined;
    let groups: string[] | undefined;
    
    if (session.tokens?.idToken) {
      const idTokenString = session.tokens.idToken.toString();
      const payload = decodeJwtPayload(idTokenString);
      if (payload) {
        // Email can be in 'email' claim or 'email_verified' claim
        email = payload.email || payload['cognito:username'] || user.signInDetails?.loginId;
        // Extract name from token claims (may be in 'name' or 'cognito:name')
        name = payload.name || payload['cognito:name'];
        // Extract Cognito groups from token claims
        groups = payload['cognito:groups'] || payload.groups;
        
        // ID Token claims extracted
      }
    }
    
    // Fallback to loginId if email not found in token
    if (!email) {
      email = user.signInDetails?.loginId;
    }
    
    // Fallback name to email if name not available
    if (!name && email) {
      name = email;
    }
    
    // Store groups as comma-separated string for easier parsing
    const groupsString = groups && groups.length > 0 ? groups.join(',') : undefined;
    
    return {
      userId: user.userId,
      email,
      name,
      // Role will be extracted from JWT token groups claim in AuthContext
      // Store raw groups string for role extraction
      role: groupsString,
      authMode: 'cognito',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get ID token for API requests
 * Optionally force refresh to get latest groups/claims
 */
export async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    const session = await fetchAuthSession({ forceRefresh });
    return session.tokens?.idToken?.toString() || null;
  } catch (error: any) {
    // Handle specific Cognito errors more gracefully
    const errorMessage = error?.message || String(error);
    const errorName = error?.name || '';
    
    // ResourceNotFoundException typically means the client ID doesn't exist
    if (errorName === 'ResourceNotFoundException' || errorMessage.includes('does not exist')) {
      // Only log once per session to avoid console spam
      if (!(window as any).__cognitoClientErrorLogged) {
        console.error('[Auth] Cognito User Pool Client not found:', {
          clientId: userPoolClientId,
          userPoolId,
          message: 'The configured client ID does not exist in Cognito. Please verify your environment variables.',
          fix: 'Check VITE_COGNITO_USER_POOL_CLIENT_ID in your .env file or Amplify environment variables.',
        });
        (window as any).__cognitoClientErrorLogged = true;
      }
    } else {
      // Log other errors normally
      console.error('Error getting ID token:', error);
    }
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle OAuth redirect callback
 * In Amplify v6, we need to explicitly fetch the auth session after OAuth redirect
 * This processes the OAuth code and exchanges it for tokens
 */
export async function handleOAuthRedirect(): Promise<boolean> {
  if (!isConfigured) {
    console.warn('[Auth] Cannot handle OAuth redirect - Amplify not configured');
    return false;
  }

  // Check both query parameters and hash fragments (Amplify v6 may use either)
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hasCode = urlParams.has('code') || hashParams.has('code');
  const hasState = urlParams.has('state') || hashParams.has('state');
  const hasError = urlParams.has('error') || hashParams.has('error');

  // Only log if there's an actual OAuth redirect (code, state, or error)
  // Checking OAuth redirect parameters

  // Handle OAuth errors
  if (hasError) {
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
    
    // Log error details in a way that's easy to read in console
    console.error('========================================');
    console.error('[Auth] OAuth Error Detected');
    console.error('========================================');
    console.error('Error Code:', error);
    console.error('Error Description:', errorDescription);
    console.error('Current URL:', window.location.href);
    console.error('Current Origin:', currentOrigin);
    console.error('Cognito Domain:', userPoolDomain);
    console.error('Configured Redirect URLs:', redirectSignIn);
    console.error('========================================');
    
    // Show user-friendly error message for common errors
    if (error === 'unauthorized_client') {
      console.error('');
      console.error('🔴 REDIRECT URI MISMATCH DETECTED');
      console.error('');
      console.error('The redirect URI does not match what is configured in Cognito.');
      console.error('');
      console.error('Current origin:', currentOrigin);
      console.error('Primary redirect URI (what Amplify sends):', redirectSignIn[0]);
      console.error('');
      console.error('To fix this, ensure these URLs are in Cognito callback URLs:');
      console.error(`  - ${currentOrigin}`);
      console.error(`  - ${currentOrigin}/`);
      console.error('');
      console.error('Run this command to update Cognito:');
      console.error('  cd infra/scripts && ./update-cognito-callback-urls.sh');
      console.error('');
    } else if (error === 'invalid_request' && errorDescription?.includes('invalid_client')) {
      // Google OAuth invalid_client error - most common causes
      console.error('');
      console.error('🔴 GOOGLE OAUTH INVALID_CLIENT ERROR');
      console.error('');
      console.error('Google rejected the OAuth request. This usually means:');
      console.error('');
      console.error('1. ❌ Redirect URI not authorized in Google Cloud Console');
      console.error('2. ❌ Client ID/Secret mismatch between Cognito and Google');
      console.error('3. ❌ OAuth consent screen not configured');
      console.error('');
      console.error('Required Redirect URI in Google Cloud Console:');
      const cognitoRedirectUri = `https://${userPoolDomain}/oauth2/idpresponse`;
      console.error(`  ${cognitoRedirectUri}`);
      console.error('');
      console.error('Steps to fix:');
      console.error('');
      console.error('1. Go to Google Cloud Console:');
      console.error('   https://console.cloud.google.com/apis/credentials?project=680059166048');
      console.error('');
      console.error('2. Find your OAuth 2.0 Client ID and click Edit');
      console.error('');
      console.error('3. In "Authorized redirect URIs", ensure this EXACT URI exists:');
      console.error(`   ${cognitoRedirectUri}`);
      console.error('');
      console.error('4. Verify:');
      console.error('   - Uses HTTPS (not HTTP)');
      console.error('   - Includes /oauth2/idpresponse path');
      console.error('   - No trailing slash');
      console.error('   - Matches exactly (case-sensitive)');
      console.error('');
      console.error('5. Check OAuth Consent Screen is configured:');
      console.error('   https://console.cloud.google.com/apis/credentials/consent?project=680059166048');
      console.error('');
      console.error('6. If app is in testing mode, add your email to test users');
      console.error('');
      console.error('7. Wait 1-2 minutes after saving, then try again');
      console.error('');
      console.error('To verify Cognito configuration, run:');
      console.error(`  aws cognito-idp describe-identity-provider \\`);
      console.error(`    --user-pool-id ${userPoolId} \\`);
      console.error(`    --provider-name Google`);
      console.error('');
    }
    
    // Clean up URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    return false;
  }

  if (hasCode || hasState) {
    // Check if we're on the error page (Cognito redirected to /error)
    if (window.location.pathname === '/error' || window.location.href.includes('/error?')) {
      console.error('[Auth] Cognito redirected to /error endpoint');
      console.error('[Auth] This usually indicates a redirect URI mismatch or state validation failure');
      console.error('[Auth] Current URL:', window.location.href);
      console.error('[Auth] Current Origin:', currentOrigin);
      console.error('[Auth] Expected redirect URIs:', redirectSignIn);
      console.error('[Auth] Please verify your origin matches one of the callback URLs in Cognito');
      return false;
    }
    
    try {
      // Processing OAuth redirect callback
      // Fetch auth session with forceRefresh to process the OAuth callback
      // This will exchange the authorization code for tokens
      const session = await fetchAuthSession({ forceRefresh: true });
      
      if (session.tokens?.idToken) {
        // OAuth redirect processed successfully
        
        // Clean up URL parameters and hash
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        return true;
      } else {
        console.warn('[Auth] OAuth redirect processed but no tokens received', {
          sessionKeys: Object.keys(session),
        });
        return false;
      }
    } catch (error) {
      console.error('[Auth] Error processing OAuth redirect:', error);
      // Clean up URL even on error to prevent retry loops
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return false;
    }
  }
  
  return false;
}

