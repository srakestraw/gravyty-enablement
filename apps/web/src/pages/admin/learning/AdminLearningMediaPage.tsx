/**
 * Admin Learning Media Page v2
 * 
 * Improved media library with better upload/select UX
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AttachFile as AttachmentIcon,
} from '@mui/icons-material';
import { useAdminMedia } from '../../../hooks/useAdminMedia';
import { lmsAdminApi } from '../../../api/lmsAdminClient';

export function AdminLearningMediaPage() {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'cover' | 'video' | 'attachment'>('all');
  const { data: media, loading, error, refetch } = useAdminMedia();
  const [open, setOpen] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'cover' | 'video' | 'poster' | 'attachment'>('cover');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const presignResponse = await lmsAdminApi.presignMediaUpload({
        media_type: uploadMediaType,
        filename: file.name,
        content_type: file.type,
      });

      if ('data' in presignResponse) {
        // Upload file to S3
        await fetch(presignResponse.data.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        setOpen(false);
        setFile(null);
        refetch();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyMediaRef = (mediaItem: any) => {
    const mediaRef = {
      media_id: mediaItem.media_id,
      type: mediaItem.type === 'cover' ? 'image' : mediaItem.type === 'video' ? 'video' : 'document',
      url: mediaItem.url || '',
      created_at: mediaItem.created_at || new Date().toISOString(),
      created_by: mediaItem.created_by || '',
      filename: mediaItem.filename,
      content_type: mediaItem.content_type,
      size_bytes: mediaItem.size_bytes,
      s3_bucket: mediaItem.s3_bucket,
      s3_key: mediaItem.s3_key,
    };
    navigator.clipboard.writeText(JSON.stringify(mediaRef, null, 2));
  };

  const getMediaIcon = (type: string) => {
    if (type === 'cover' || type === 'poster') return <ImageIcon />;
    if (type === 'video') return <VideoIcon />;
    return <AttachmentIcon />;
  };

  const filteredMedia = media?.filter((item: any) => {
    if (mediaTypeFilter === 'all') return true;
    return item.type === mediaTypeFilter;
  }) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Media Library</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Upload Media
        </Button>
      </Box>

      {/* Filter */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={mediaTypeFilter}
            label="Filter by Type"
            onChange={(e) => setMediaTypeFilter(e.target.value as any)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="cover">Cover Images</MenuItem>
            <MenuItem value="video">Videos</MenuItem>
            <MenuItem value="attachment">Attachments</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Media ID</TableCell>
              <TableCell>Filename</TableCell>
              <TableCell>Course ID</TableCell>
              <TableCell>Lesson ID</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMedia.length > 0 ? (
              filteredMedia.map((item: any) => (
                <TableRow key={item.media_id}>
                  <TableCell>
                    <Chip
                      icon={getMediaIcon(item.type)}
                      label={item.type}
                      size="small"
                      color={item.type === 'cover' ? 'primary' : item.type === 'video' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {item.media_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.filename || '-'}</TableCell>
                  <TableCell>{item.course_id || '-'}</TableCell>
                  <TableCell>{item.lesson_id || '-'}</TableCell>
                  <TableCell>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Copy MediaRef JSON">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyMediaRef(item)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {mediaTypeFilter === 'all'
                    ? 'No media found. Upload your first media file to get started.'
                    : `No ${mediaTypeFilter} media found.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Media</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Media Type</InputLabel>
            <Select
              value={uploadMediaType}
              onChange={(e) => setUploadMediaType(e.target.value as any)}
            >
              <MenuItem value="cover">Cover Image</MenuItem>
              <MenuItem value="video">Video</MenuItem>
              <MenuItem value="poster">Poster Image</MenuItem>
              <MenuItem value="attachment">Attachment</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }}>
            Select File
            <input
              type="file"
              hidden
              accept={
                uploadMediaType === 'cover' || uploadMediaType === 'poster'
                  ? 'image/*'
                  : uploadMediaType === 'video'
                  ? 'video/*'
                  : '*/*'
              }
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
          {file && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            </Box>
          )}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !file}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
