/**
 * Content Hub Landing Page
 * 
 * Landing page with pinned, recently updated, and expiring soon sections
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { listAssets, type ListAssetsParams } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { isContributorOrHigher, isAdmin } from '../../lib/roles';
import { Add as AddIcon } from '@mui/icons-material';

export function ContentHubLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pinnedAssets, setPinnedAssets] = useState<Asset[]>([]);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [expiringAssets, setExpiringAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const canCreate = isContributorOrHigher(user?.role) || isAdmin(user?.role);
  
  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load pinned assets
      const pinnedResponse = await listAssets({ pinned: true, limit: 10 });
      if (!isErrorResponse(pinnedResponse)) {
        setPinnedAssets(pinnedResponse.data.assets);
      }
      
      // Load recently updated (published, non-expired)
      const recentResponse = await listAssets({ status: 'published', limit: 10 });
      if (!isErrorResponse(recentResponse)) {
        setRecentAssets(recentResponse.data.assets);
      }
      
      // Load expiring soon (would need a specific query - for now use recent)
      // TODO: Add expiring soon filter to API
      setExpiringAssets([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadSections();
  }, []);
  
  if (loading) {
    return (
      <PlaceholderPage title="Content Hub" description="Discover enablement assets">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PlaceholderPage>
    );
  }
  
  if (error) {
    return (
      <PlaceholderPage title="Content Hub" description="Discover enablement assets">
        <Alert severity="error">{error}</Alert>
      </PlaceholderPage>
    );
  }
  
  const renderAssetCard = (asset: Asset) => (
    <Grid item xs={12} sm={6} md={4} key={asset.asset_id}>
      <Card>
        <CardActionArea onClick={() => navigate(`/enablement/resources/${asset.asset_id}`)}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {asset.title}
            </Typography>
            {asset.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {asset.description}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={asset.asset_type} size="small" />
              {asset.pinned && <Chip label="Pinned" size="small" color="primary" />}
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
  
  return (
    <>
      <PlaceholderPage title="Content Hub" description="Discover enablement assets">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canCreate && (
              <>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/enablement/content-hub/create')}
                >
                  Create Asset
                </Button>
              </>
            )}
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/enablement/resources/library')}
          >
            Browse All Assets
          </Button>
        </Box>
      
      {/* Pinned Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Pinned
        </Typography>
        {pinnedAssets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No pinned content yet
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {pinnedAssets.map(renderAssetCard)}
          </Grid>
        )}
      </Box>
      
      {/* Recently Updated Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recently Updated
        </Typography>
        {recentAssets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No recent updates
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {recentAssets.slice(0, 6).map(renderAssetCard)}
          </Grid>
        )}
      </Box>
      
      {/* Expiring Soon Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Expiring Soon
        </Typography>
        {expiringAssets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No content expiring soon
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {expiringAssets.map(renderAssetCard)}
          </Grid>
        )}
      </Box>
      </PlaceholderPage>
    </>
  );
}

