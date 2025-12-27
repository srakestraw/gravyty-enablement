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
const userPoolDomain = userPoolDomainInput
  ? (userPoolDomainInput.includes('.') 
      ? userPoolDomainInput // Custom domain - use as-is
      : `${userPoolDomainInput}.auth.${cognitoRegion}.amazoncognito.com`) // Cognito domain - add suffix
  : '';

// Build redirect URLs based on environment
// In production, use production domain; in dev, use current origin and localhost variants
const getRedirectUrls = (): string[] => {
  const urls: string[] = [];
  
  if (isProduction) {
    // Production: use production domain
    urls.push(productionDomain);
    urls.push(`${productionDomain}/`);
  } else {
    // Development: prioritize current origin first (Amplify uses first URL)
    // This ensures the redirect_uri matches what Cognito expects
    if (currentOrigin) {
      urls.push(currentOrigin); // Add without trailing slash first
      urls.push(`${currentOrigin}/`); // Then with trailing slash
    }
    // Also include other localhost variants
    urls.push('http://localhost:3000');
    urls.push('http://localhost:3000/');
    urls.push('http://localhost:5173');
    urls.push('http://localhost:5173/');
    // Also include production domain for testing
    urls.push(productionDomain);
    urls.push(`${productionDomain}/`);
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

if (userPoolId && userPoolClientId && userPoolDomain) {
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: {
            oauth: {
              domain: userPoolDomain,
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
    if (isDevelopment) {
      console.log('[Auth] Amplify configured successfully', {
        environment: isProduction ? 'production' : 'development',
        userPoolId,
        userPoolClientId,
        domain: userPoolDomain,
        currentOrigin,
        redirectSignIn,
      });
    }
  } catch (error) {
    console.error('[Auth] Failed to configure Amplify:', error);
  }
} else {
  console.warn('[Auth] Amplify not configured - missing environment variables', {
    hasUserPoolId: !!userPoolId,
    hasClientId: !!userPoolClientId,
    hasDomain: !!userPoolDomain,
    environment: isProduction ? 'production' : 'development',
  });
}

export interface AuthUser {
  userId: string;
  email?: string;
  role?: string;
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
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    return {
      userId: user.userId,
      email: user.signInDetails?.loginId,
      // Role will be extracted from JWT token groups claim
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get ID token for API requests
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
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

  // Log current URL for debugging
  if (isDevelopment) {
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
    
    console.error('[Auth] OAuth error received:', { 
      error, 
      errorDescription,
      currentUrl: window.location.href,
      configuredRedirectUrls: redirectSignIn,
    });
    
    // Show user-friendly error message for common errors
    if (error === 'unauthorized_client') {
      console.error('[Auth] Redirect URI mismatch!', {
        currentOrigin,
        configuredUrls: redirectSignIn,
        message: 'The redirect URI does not match what is configured in Cognito. Ensure http://localhost:3000 is in Cognito callback URLs.',
      });
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

