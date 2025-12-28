/**
 * Landing Page
 * 
 * Branded unauthenticated landing page with sign-in CTA
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  SchoolOutlined,
  FolderOutlined,
  AutoAwesomeOutlined,
  InsightsOutlined,
} from '@mui/icons-material';
import { Icon } from '../components/icons/Icon';
import { useAuth } from '../contexts/AuthContext';
import { track, TELEMETRY_EVENTS } from '../lib/telemetry';

const RETURN_TO_KEY = 'enablement_return_to';

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, isAuth, loading } = useAuth();
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);

  // Track landing page view
  useEffect(() => {
    track(TELEMETRY_EVENTS.LANDING_VIEWED);
  }, []);

  // If already authenticated, redirect to returnTo or default
  useEffect(() => {
    if (!loading && isAuth) {
      const returnTo = searchParams.get('returnTo') || '/enablement';
      navigate(returnTo, { replace: true });
    }
  }, [isAuth, loading, navigate, searchParams]);

  const handleSignIn = async () => {
    track(TELEMETRY_EVENTS.LOGIN_CTA_CLICKED, { provider: 'google' });
    
    // Store returnTo in sessionStorage before redirecting to OAuth
    const returnTo = searchParams.get('returnTo') || '/enablement';
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
    
    try {
      await signIn();
      // signIn() will redirect to Google OAuth, so this code won't execute
      // The redirect back will be handled by App.tsx and then navigate to returnTo
    } catch (error) {
      console.error('Sign in failed:', error);
      const errorCode = error instanceof Error ? (error as any).code : 'unknown';
      track(TELEMETRY_EVENTS.LOGIN_FAILED, { error_code: errorCode });
      // Clean up sessionStorage on error
      sessionStorage.removeItem(RETURN_TO_KEY);
      // Error handling - could show a toast or error message
    }
  };

  const handleTroubleshootingClick = () => {
    setTroubleshootingOpen(true);
  };

  const handleTroubleshootingClose = () => {
    setTroubleshootingOpen(false);
  };

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
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // If authenticated, don't render landing page (redirect will happen)
  if (isAuth) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header with Logo */}
      <Box
        sx={{
          py: 2,
          px: { xs: 2, sm: 4 },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Box
            component="img"
            src="/images/logos/gravyty-logo.svg"
            alt="Gravyty"
            sx={{
              height: 40,
              width: 'auto',
            }}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, flex: 1 }}>
        {/* Hero Section */}
        <Grid container spacing={4} alignItems="center" sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Gravyty Enablement
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
              One place to learn, find, and share what you need to sell, onboard, and renew - fast.
            </Typography>
            
            {/* Supporting Bullets */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                • Learn - Courses and certifications designed for Sales and Customer Success.
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                • Assets - The source of truth for decks, one-pagers, messaging, and templates with version control.
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                • Ask AI - Get answers grounded in approved content and resources.
              </Typography>
            </Box>

            {/* Login CTA - Above the fold */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Icon name="mail" />}
                onClick={handleSignIn}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Sign in with Google
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use your Gravyty Google account.
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={handleTroubleshootingClick}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Trouble signing in?
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src="/assets/landing/enablement-hero.png"
              alt="Gravyty Enablement Platform"
              onError={(e) => {
                // Fallback if image doesn't exist yet
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
              sx={{
                width: '100%',
                height: 'auto',
                borderRadius: 2,
                boxShadow: 3,
                maxHeight: { xs: 300, md: 400 },
                objectFit: 'contain',
              }}
            />
          </Grid>
        </Grid>

        {/* 4-Card Section - Primary Modules */}
        <Box sx={{ mb: 6 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <SchoolOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Learn
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Courses, certifications, and guided learning for onboarding and continuous enablement.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available after sign-in
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <FolderOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Assets
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Decks, battlecards, one-pagers, and brand kits with lifecycle management and alerts.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available after sign-in
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <AutoAwesomeOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Ask AI
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Instant answers based on approved materials - cite sources and stay consistent.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available after sign-in
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  <InsightsOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Insights
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Adoption, learning progress, and asset performance to prove enablement impact.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available after sign-in
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Built For Strip */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="body2" color="text.secondary" component="span" sx={{ mr: 1 }}>
            Built for:
          </Typography>
          <Chip label="Sales" size="small" sx={{ mr: 0.5 }} />
          <Chip label="Customer Success" size="small" sx={{ mr: 0.5 }} />
          <Chip label="Product Marketing" size="small" sx={{ mr: 0.5 }} />
          <Chip label="Product" size="small" />
        </Box>
      </Container>

      {/* Troubleshooting Dialog */}
      <Dialog
        open={troubleshootingOpen}
        onClose={handleTroubleshootingClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Trouble signing in?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" paragraph>
              If you're experiencing issues signing in, try these troubleshooting steps:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Icon name="helpCircle" size={20} color="primary.main" />
                </ListItemIcon>
                <ListItemText
                  primary="Allow popups for this domain"
                  secondary="If the Hosted UI opens in a new window, ensure popup blockers are disabled for this site."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Icon name="helpCircle" size={20} color="primary.main" />
                </ListItemIcon>
                <ListItemText
                  primary="Try incognito mode"
                  secondary="Open an incognito or private browsing window to rule out browser extensions or cached data issues."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Icon name="helpCircle" size={20} color="primary.main" />
                </ListItemIcon>
                <ListItemText
                  primary="Confirm you're using the correct Google account"
                  secondary="Make sure you're signing in with your Gravyty Google account, not a personal account."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Icon name="helpCircle" size={20} color="primary.main" />
                </ListItemIcon>
                <ListItemText
                  primary="Contact support or your administrator"
                  secondary="If you continue to experience issues, contact your administrator or support team for access assistance."
                />
              </ListItem>
            </List>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTroubleshootingClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

