import { AppBar, Toolbar, Typography, Box, Button, CircularProgress } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon, AccountCircle } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { user, loading, isAuth, signIn, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      console.log('[Header] Sign in button clicked');
      await signIn();
      // Note: signIn will redirect immediately, so this code won't execute
      console.log('[Header] Sign in completed (this should not appear)');
    } catch (error) {
      console.error('[Header] Sign in error:', error);
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in. Please try again.';
      alert(`Sign in failed: ${errorMessage}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Gravyty Enablement Portal
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : isAuth && user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountCircle />
                <Typography variant="body2">
                  {user.email || user.userId}
                </Typography>
                {user.role && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    ({user.role})
                  </Typography>
                )}
              </Box>
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={handleSignIn}
            >
              Sign In with Google
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

