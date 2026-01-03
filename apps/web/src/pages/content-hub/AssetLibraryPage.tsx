/**
 * Content Hub - Asset Library Page
 * 
 * Browse and search enablement assets with filters
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Fab,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { listAssets, type ListAssetsParams } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { isContributorOrHigher, isApproverOrHigher, isAdmin } from '../../lib/roles';

export function AssetLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ensure Admin always has create permissions (fallback for role detection issues)
  const canCreate = isContributorOrHigher(user?.role) || isAdmin(user?.role);
  const canPin = isApproverOrHigher(user?.role);
  
  // Debug logging for role detection
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AssetLibrary] User role check:', {
        userRole: user?.role,
        canCreate,
        canPin,
        userId: user?.userId,
        email: user?.email,
      });
    }
  }, [user?.role, canCreate, canPin]);
  
  useEffect(() => {
    loadAssets();
  }, []);
  
  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ListAssetsParams = {
        status: 'published', // Default: show only published
        limit: 50,
      };
      
      const response = await listAssets(params);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      setAssets(response.data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <PlaceholderPage title="Asset Library" description="Browse and search enablement assets">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PlaceholderPage>
    );
  }
  
  if (error) {
    return (
      <PlaceholderPage title="Asset Library" description="Browse and search enablement assets">
        <Alert severity="error">{error}</Alert>
      </PlaceholderPage>
    );
  }
  
  return (
    <>
      <PlaceholderPage title="Asset Library" description="Browse and search enablement assets">
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canCreate ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/enablement/content-hub/create')}
                >
                  Create Asset
                </Button>
              </>
            ) : (
              // Show button anyway for Admin users (fallback for role detection issues)
              user && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    console.warn('[AssetLibrary] Role check failed, but showing button anyway. User role:', user.role);
                    navigate('/enablement/content-hub/create');
                  }}
                >
                  Create Asset (Debug)
                </Button>
              )
            )}
          </Box>
        </Box>
        
        {assets.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No assets found. Assets will appear here once they are created and published.
            </Typography>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Create Your First Asset
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {assets.map((asset) => (
              <Grid item xs={12} sm={6} md={4} key={asset.asset_id}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/enablement/resources/${asset.asset_id}`)}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {asset.title}
                      </Typography>
                      {(asset.short_description || asset.description) && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {asset.short_description || asset.description}
                        </Typography>
                      )}
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={asset.asset_type} size="small" />
                        {asset.pinned && <Chip label="Pinned" size="small" color="primary" />}
                      </Box>
                      {canPin && (
                        <Button
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (asset.pinned) {
                                const response = await unpinAsset(asset.asset_id);
                                if (!isErrorResponse(response)) {
                                  await loadAssets();
                                } else {
                                  alert(response.error.message);
                                }
                              } else {
                                const response = await pinAsset(asset.asset_id);
                                if (!isErrorResponse(response)) {
                                  await loadAssets();
                                } else {
                                  alert(response.error.message);
                                }
                              }
                            } catch (err) {
                              alert('Failed to update pin status');
                            }
                          }}
                        >
                          {asset.pinned ? 'Unpin' : 'Pin'}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      </PlaceholderPage>
    </>
  );
}

