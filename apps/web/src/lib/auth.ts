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
    console.log('[Auth] Domain configuration:', {
      userPoolDomainInput,
      cognitoRegion,
      constructedDomain: userPoolDomain,
      hasDomain: !!userPoolDomain,
      envVars: {
        VITE_COGNITO_DOMAIN: import.meta.env.VITE_COGNITO_DOMAIN,
        VITE_COGNITO_REGION: import.meta.env.VITE_COGNITO_REGION,
        VITE_COGNITO_USER_POOL_ID: import.meta.env.VITE_COGNITO_USER_POOL_ID ? '***' : undefined,
      },
    });
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
    
    // Log configuration in dev mode only
    if (import.meta.env.DEV) {
        console.log('[Auth] Amplify configured successfully', {
          environment: isProduction ? 'production' : 'development',
          userPoolId,
          userPoolClientId,
          domain: validatedDomain,
          domainInput: userPoolDomainInput,
          cognitoRegion,
          currentOrigin,
          redirectSignIn: redirectSignIn.slice(0, 2), // Log first 2 URLs only
        });
      }
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
    console.log('[Auth] Initiating Google sign-in redirect...', {
      domain: userPoolDomain,
      redirectSignIn,
      currentOrigin,
      userPoolId,
      userPoolClientId,
    });
    
    // Log the exact redirect URI that will be used
    // Amplify uses the first redirectSignIn URL as the redirect_uri parameter
    const primaryRedirectUri = redirectSignIn[0];
    console.log('[Auth] Primary redirect URI:', primaryRedirectUri);
    console.log('[Auth] All configured redirect URIs:', redirectSignIn);
    
    // Construct the expected Cognito OAuth URL to verify what will be sent
    const expectedCognitoUrl = `https://${userPoolDomain}/oauth2/authorize?redirect_uri=${encodeURIComponent(primaryRedirectUri)}&response_type=code&client_id=${userPoolClientId}&identity_provider=Google&scope=openid+email+profile`;
    console.log('[Auth] Expected Cognito OAuth URL (first 200 chars):', expectedCognitoUrl.substring(0, 200) + '...');
    console.log('[Auth] Full redirect_uri parameter:', encodeURIComponent(primaryRedirectUri));
    
    // signInWithRedirect will immediately redirect the browser to Cognito hosted UI
    // The browser will then redirect to Google, then back to Cognito, then back to our app
    await signInWithRedirect({
      provider: 'Google',
    });
    
    // This code will not execute because the browser redirects immediately
    console.log('[Auth] This should not appear - redirect happened');
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
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    // Try to get email from ID token claims
    let email: string | undefined;
    let groups: string[] | undefined;
    
    if (session.tokens?.idToken) {
      const idTokenString = session.tokens.idToken.toString();
      const payload = decodeJwtPayload(idTokenString);
      if (payload) {
        // Email can be in 'email' claim or 'email_verified' claim
        email = payload.email || payload['cognito:username'] || user.signInDetails?.loginId;
        // Extract Cognito groups from token claims
        groups = payload['cognito:groups'] || payload.groups;
        
        // Debug logging in dev mode
        if (import.meta.env.DEV) {
          console.log('[Auth] ID Token claims:', {
            email,
            groups,
            hasCognitoGroups: !!payload['cognito:groups'],
            allClaims: Object.keys(payload),
            cognitoGroupsValue: payload['cognito:groups'],
          });
        }
      }
    }
    
    // Fallback to loginId if email not found in token
    if (!email) {
      email = user.signInDetails?.loginId;
    }
    
    // Store groups as comma-separated string for easier parsing
    const groupsString = groups && groups.length > 0 ? groups.join(',') : undefined;
    
    return {
      userId: user.userId,
      email,
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
  } catch (error) {
    console.error('Error getting ID token:', error);
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
  // This prevents console spam on normal page loads
  if (isDevelopment && (hasCode || hasState || hasError)) {
    console.log('[Auth] Checking OAuth redirect:', {
      url: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      hasCode,
      hasState,
      hasError,
    });
  }

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
    }
    
    // Clean up URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    return false;
  }

  if (hasCode || hasState) {
    try {
      console.log('[Auth] Processing OAuth redirect callback...');
      
      // Fetch auth session with forceRefresh to process the OAuth callback
      // This will exchange the authorization code for tokens
      const session = await fetchAuthSession({ forceRefresh: true });
      
      if (session.tokens?.idToken) {
        console.log('[Auth] OAuth redirect processed successfully - user authenticated', {
          hasIdToken: !!session.tokens.idToken,
          hasAccessToken: !!session.tokens.accessToken,
        });
        
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

