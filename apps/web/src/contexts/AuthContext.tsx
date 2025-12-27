/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithGoogle, signOutUser, getCurrentAuthUser, getIdToken, isAuthenticated } from '../lib/auth';
import type { AuthUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuth: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const currentUser = await getCurrentAuthUser();
        setUser(currentUser);
        setIsAuth(true);
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
  };

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

