/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signInWithGoogle, signOutUser, getCurrentAuthUser, getIdToken, isAuthenticated } from '../lib/auth';
import type { AuthUser } from '../lib/auth';
import { normalizeRole, roleFromGroups, isAdmin } from '../lib/roles';

interface AuthUserWithRole extends AuthUser {
  role: string;
  authMode: 'cognito' | 'dev';
}

interface AuthContextType {
  user: AuthUserWithRole | null;
  loading: boolean;
  isAuth: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const currentUser = await getCurrentAuthUser();
        
        if (currentUser) {
          // Determine auth mode and extract role
          let role: string;
          let authMode: 'cognito' | 'dev';
          let rawGroups: string[] | undefined;
          
          // Check if we're in dev mode (Cognito not configured or using dev headers)
          const devRole = import.meta.env.VITE_DEV_ROLE;
          const isCognitoConfigured = currentUser.authMode === 'cognito' && currentUser.role;
          
          if (!isCognitoConfigured && devRole) {
            // Dev fallback path - use VITE_DEV_ROLE
            authMode = 'dev';
            role = normalizeRole(devRole);
            
            if (import.meta.env.DEV) {
              console.log('[Auth] Using dev mode role:', {
                raw: devRole,
                normalized: role,
                authMode,
              });
            }
          } else {
            // Cognito path - extract from groups
            authMode = 'cognito';
            
            // Parse groups from role field (stored as comma-separated string in getCurrentAuthUser)
            if (currentUser.role) {
              rawGroups = currentUser.role.split(',').map(g => g.trim()).filter(Boolean);
            }
            
            role = roleFromGroups(rawGroups);
            
            // Always log role extraction in dev mode for debugging
            if (import.meta.env.DEV) {
              console.log('[Auth] Using Cognito role:', {
                rawGroups,
                normalized: role,
                authMode,
                userEmail: currentUser.email,
                userId: currentUser.userId,
              });
            }
            
            // Also log if Admin role is detected
            if (role === 'Admin') {
              console.log('[Auth] ✅ Admin role detected!', {
                rawGroups,
                normalized: role,
                userEmail: currentUser.email,
              });
            }
          }
          
          // Ensure role is always set (default to Viewer if missing)
          if (!role) {
            role = 'Viewer';
          }
          
          const userWithRole: AuthUserWithRole = {
            ...currentUser,
            role,
            authMode,
          };
          
          setUser(userWithRole);
          setIsAuth(true);
        } else {
          setUser(null);
          setIsAuth(false);
        }
      } else {
        setUser(null);
        setIsAuth(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async () => {
    try {
      // signInWithRedirect immediately redirects the browser, so this code won't execute
      // The redirect will be handled by handleOAuthRedirect in App.tsx
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsAuth(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const getToken = async () => {
    return getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuth,
        signIn,
        signOut,
        getIdToken: getToken,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

