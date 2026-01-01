/**
 * Course Assets Component
 * 
 * Displays assets attached to a course
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Grid,
} from '@mui/material';
import { Download, GetApp, Block, Delete } from '@mui/icons-material';
import { lmsAdminApi } from '../../api/lmsAdminClient';
import { lmsApi } from '../../api/lmsClient';
import { getDownloadUrl } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import type { CourseAsset, Asset, AssetVersion } from '@gravyty/domain';

interface CourseAssetsProps {
  courseId: string;
  readOnly?: boolean; // If true, hide edit controls
  onAssetDetached?: () => void; // Callback when asset is detached
}

export function CourseAssets({ courseId, readOnly = false, onAssetDetached }: CourseAssetsProps) {
  const [assets, setAssets] = useState<Array<CourseAsset & { asset: Asset | null; version: AssetVersion | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadAssets();
  }, [courseId]);
  
  const loadAssets = async () => {
    // Skip loading assets for new courses (they don't exist yet)
    if (courseId === 'new') {
      setLoading(false);
      setAssets([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Use admin API for editors, learner API for read-only view
      const response = readOnly
        ? await lmsApi.listCourseAssets(courseId)
        : await lmsAdminApi.listCourseAssets(courseId);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      setAssets(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async (version: AssetVersion) => {
    try {
      const response = await getDownloadUrl(version.version_id);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      window.open(response.data.download_url, '_blank');
    } catch (err) {
      alert('Failed to generate download URL');
    }
  };
  
  const handleDetach = async (courseAssetId: string) => {
    if (!confirm('Are you sure you want to remove this asset from the course?')) {
      return;
    }
    
    try {
      const response = await lmsAdminApi.detachAssetFromCourse(courseId, courseAssetId);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadAssets();
      if (onAssetDetached) {
        onAssetDetached();
      }
    } catch (err) {
      alert('Failed to detach asset');
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  if (assets.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No assets attached to this course
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Course Assets
      </Typography>
      <Grid container spacing={2}>
        {assets.map((courseAsset) => {
          const asset = courseAsset.asset;
          const version = courseAsset.version;
          const isExpired = version?.status === 'expired';
          const isPublished = version?.status === 'published';
          
          if (!asset || !version) {
            return null;
          }
          
          return (
            <Grid item xs={12} sm={6} md={4} key={courseAsset.course_asset_id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {courseAsset.display_label || asset.title}
                  </Typography>
                  {courseAsset.display_label && asset.title !== courseAsset.display_label && (
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {asset.title}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip label={asset.asset_type} size="small" />
                    {courseAsset.version_id ? (
                      <Chip label={`v${version.version_number}`} size="small" color="info" />
                    ) : (
                      <Chip label="Latest" size="small" color="primary" />
                    )}
                    {isExpired && (
                      <Chip label="Expired" size="small" color="error" />
                    )}
                  </Box>
                  {asset.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {asset.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      {isPublished && !isExpired ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Download />}
                          onClick={() => handleDownload(version)}
                        >
                          Download
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled
                          startIcon={<Block />}
                        >
                          {isExpired ? 'Expired' : 'Not Available'}
                        </Button>
                      )}
                    </Box>
                    {!readOnly && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDetach(courseAsset.course_asset_id)}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

