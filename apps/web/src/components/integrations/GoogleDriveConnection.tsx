/**
 * Google Drive Connection Component
 * 
 * UI for connecting/disconnecting Google Drive integration
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { CloudQueue, CloudDone, CloudOff } from '@mui/icons-material';
import {
  connectGoogleDrive,
  getGoogleDriveStatus,
  disconnectGoogleDrive,
  type GoogleDriveConnectionStatus,
} from '../../api/googleDriveClient';
import { isErrorResponse } from '../../lib/apiClient';

export function GoogleDriveConnection() {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getGoogleDriveStatus();
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        setStatus(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      // Redirect URI should be the frontend page where Google will redirect back
      // The frontend will then extract the code and call the API callback endpoint
      const redirectUri = `${window.location.origin}/enablement/admin/integrations`;
      const response = await connectGoogleDrive(redirectUri);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      // Redirect to Google OAuth
      window.location.href = response.data.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? This will prevent syncing of Drive assets.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await disconnectGoogleDrive();
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        await loadStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {status?.connected ? (
              <CloudDone color="success" sx={{ fontSize: 40 }} />
            ) : (
              <CloudQueue color="disabled" sx={{ fontSize: 40 }} />
            )}
            <Box>
              <Typography variant="h6">Google Drive</Typography>
              <Typography variant="body2" color="text.secondary">
                Import and sync files from Google Drive
              </Typography>
            </Box>
          </Box>
          <Box>
            {status?.connected ? (
              <>
                <Chip label="Connected" color="success" sx={{ mr: 1 }} />
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<CloudQueue />}
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect Google Drive'}
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {status?.connected && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Google Drive is connected. You can now import files and sync assets.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

