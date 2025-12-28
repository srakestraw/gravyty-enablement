/**
 * RequireAuth Component
 * 
 * Wrapper component that ensures user is authenticated before rendering children.
 * Redirects to login page with returnTo parameter if not authenticated.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuth, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth check to complete
    if (!loading) {
      // If not authenticated, redirect to login with returnTo
      if (!isAuth) {
        const returnTo = location.pathname + location.search;
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      }
    }
  }, [isAuth, loading, navigate, location]);

  // Show loading state while checking auth (prevents flash of content)
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuth) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}


