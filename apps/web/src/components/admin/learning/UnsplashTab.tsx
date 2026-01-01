/**
 * Unsplash Tab Component
 * 
 * Tab content for searching and selecting Unsplash images
 */

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { downloadAndUploadImage } from './utils/imageUpload';
import type { MediaRef } from '@gravyty/domain';

export interface UnsplashTabProps {
  mediaType: 'cover' | 'video' | 'poster' | 'attachment';
  courseId?: string;
  lessonId?: string;
  temporary?: boolean;
  onImageSelected: (mediaRef: MediaRef) => void;
  onClose: () => void;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  description?: string;
  width: number;
  height: number;
}

export function UnsplashTab({
  mediaType,
  courseId,
  lessonId,
  temporary,
  onImageSelected,
  onClose,
}: UnsplashTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load trending images on mount
  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await lmsAdminApi.getTrendingUnsplash({ page: 1, per_page: 20 });
      if ('data' in response) {
        setPhotos(response.data.results);
        setTotalPages(response.data.total_pages);
      } else {
        setError(response.error?.message || 'Failed to load trending images');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending images');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTrending();
      return;
    }

    setLoading(true);
    setError(null);
    setPage(1);

    try {
      const response = await lmsAdminApi.searchUnsplash({
        query: searchQuery.trim(),
        page: 1,
        per_page: 20,
        orientation: 'landscape', // Default to landscape for 16:9 compatibility
      });

      if ('data' in response) {
        setPhotos(response.data.results);
        setTotalPages(response.data.total_pages);
      } else {
        setError(response.error?.message || 'Failed to search images');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search images');
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsCover = async () => {
    if (!selectedPhoto) return;

    setUploading(true);
    setError(null);

    try {
      // Use regular size (1080px) - good balance of quality and file size
      const imageUrl = selectedPhoto.urls.regular;
      const filename = `unsplash-${selectedPhoto.id}.jpg`;
      // For temporary media, don't pass 'new' as courseId - pass undefined
      const effectiveCourseId = (courseId === 'new' || temporary) ? undefined : courseId;
      const mediaRef = await downloadAndUploadImage(
        imageUrl,
        filename,
        mediaType,
        effectiveCourseId,
        lessonId,
        temporary,
        true // Crop to 16:9
      );

      onImageSelected(mediaRef);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="Search Unsplash photos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Image Grid */}
        {!loading && photos.length > 0 && (
          <>
            <Grid container spacing={2}>
              {photos.map((photo) => (
                <Grid item xs={6} sm={4} md={3} key={photo.id}>
                  <Paper
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      border: selectedPhoto?.id === photo.id ? 2 : 0,
                      borderColor: selectedPhoto?.id === photo.id ? 'primary.main' : 'transparent',
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16/9',
                        bgcolor: 'grey.200',
                      }}
                    >
                      <img
                        src={photo.urls.small}
                        alt={photo.description || 'Unsplash photo'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {selectedPhoto?.id === photo.id && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'primary.main',
                            borderRadius: '50%',
                            p: 0.5,
                          }}
                        >
                          <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                      )}
                    </Box>
                    {photo.description && (
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap>
                          {photo.description}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Attribution and Use Button */}
            {selectedPhoto && (
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Image
                    </Typography>
                    {selectedPhoto.description && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {selectedPhoto.description}
                      </Typography>
                    )}
                    <Chip
                      icon={<PersonIcon />}
                      label={`Photo by ${selectedPhoto.user.name} (@${selectedPhoto.user.username})`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Images from Unsplash are free to use. Attribution is provided above.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleUseAsCover}
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                  >
                    {uploading ? 'Uploading...' : 'Use as Cover Image'}
                  </Button>
                </Stack>
              </Paper>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && photos.length === 0 && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery ? 'No images found. Try a different search term.' : 'No images available.'}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

