/**
 * Admin Integrations Page
 * 
 * Scaffold placeholder for future Integrations module implementation.
 * This page will provide integration configuration and management capabilities.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Grid, Alert } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { GoogleDriveConnection } from '../../components/integrations/GoogleDriveConnection';
import { googleDriveCallback } from '../../api/googleDriveClient';
import { isErrorResponse } from '../../lib/apiClient';

export function AdminIntegrationsPage() {
  const [searchParams] = useSearchParams();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbackSuccess, setCallbackSuccess] = useState(false);
  
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);
  
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const response = await googleDriveCallback(code, state, redirectUri);
      
      if (isErrorResponse(response)) {
        setCallbackError(response.error.message);
      } else {
        setCallbackSuccess(true);
        // Remove query params from URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      setCallbackError(err instanceof Error ? err.message : 'Failed to complete connection');
    }
  };
  
  return (
    <PlaceholderPage
      title="Integrations"
      description="Configure and manage platform integrations"
    >
      {callbackError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {callbackError}
        </Alert>
      )}
      {callbackSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Google Drive connected successfully!
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <GoogleDriveConnection />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Integration catalog showing available connectors for LMS, CRM, and other enablement tools" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Connection management with OAuth setup, API key configuration, and authentication testing" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Data sync configuration for importing courses, users, and content from external systems" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Webhook management for real-time event notifications and bidirectional data flows" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Integration health monitoring and error logs for troubleshooting connection issues" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

