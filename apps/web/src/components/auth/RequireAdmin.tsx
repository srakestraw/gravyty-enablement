/**
 * RequireAdmin Component
 * 
 * Wrapper component that ensures user has Admin role before rendering children.
 * Redirects to home page if user is not an Admin.
 * This provides defense-in-depth route-level protection for Admin routes.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, loading, isAuth } = useAuth();
  const navigate = useNavigate();

  const userIsAdmin = isAdmin(user?.role);

  useEffect(() => {
    // Wait for auth check to complete
    if (!loading && isAuth) {
      // If authenticated but not Admin, redirect to home
      if (!userIsAdmin) {
        navigate('/enablement', { replace: true });
      }
    }
  }, [userIsAdmin, loading, isAuth, navigate]);

  // Show loading state while checking auth
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

  // If not authenticated, don't render (RequireAuth will handle redirect)
  if (!isAuth) {
    return null;
  }

  // If not Admin, show not authorized message (redirect will happen)
  if (!userIsAdmin) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Not Authorized
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You do not have permission to access this page.
        </Typography>
      </Box>
    );
  }

  // User is Admin, render children
  return <>{children}</>;
}

