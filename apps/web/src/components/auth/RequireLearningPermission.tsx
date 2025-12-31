/**
 * RequireLearningPermission Component
 * 
 * Wrapper component that ensures user has required learning permission before rendering children.
 * Redirects to courses/paths list with error message if permission is missing.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { hasLearningPermission, type LearningPermission } from '../../lib/learningPermissions';

interface RequireLearningPermissionProps {
  children: React.ReactNode;
  permission: LearningPermission;
  redirectTo?: string;
  redirectMessage?: string;
}

export function RequireLearningPermission({ 
  children, 
  permission,
  redirectTo,
  redirectMessage = 'You do not have permission to access this page.',
}: RequireLearningPermissionProps) {
  const { user, loading, isAuth } = useAuth();
  const navigate = useNavigate();

  const hasPermission = hasLearningPermission(user?.role, permission);

  useEffect(() => {
    // Wait for auth check to complete
    if (!loading && isAuth) {
      // If authenticated but lacks permission, redirect
      if (!hasPermission) {
        const target = redirectTo || '/enablement/learn/courses';
        navigate(target, { 
          replace: true,
          state: { error: redirectMessage }
        });
      }
    }
  }, [hasPermission, loading, isAuth, navigate, redirectTo, redirectMessage]);

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

  // If lacks permission, show not authorized message (redirect will happen)
  if (!hasPermission) {
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
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Not Authorized
          </Typography>
          <Typography variant="body2">
            {redirectMessage}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // User has permission, render children
  return <>{children}</>;
}

