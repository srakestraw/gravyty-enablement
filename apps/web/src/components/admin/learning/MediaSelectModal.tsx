/**
 * Media Select Modal
 * 
 * Modal for selecting or uploading media for courses/lessons
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Upload as UploadIcon,
  VideoFile as VideoIcon,
  Image as ImageIcon,
  AttachFile as AttachmentIcon,
  Close as CloseIcon,
  Collections as CollectionsIcon,
  AutoAwesome as AutoAwesomeIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';
import { useAdminMedia } from '../../../hooks/useAdminMedia';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import type { MediaRef } from '@gravyty/domain';
import { AIGenerationTab } from './AIGenerationTab';
import { UnsplashTab } from './UnsplashTab';

export interface MediaSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mediaRef: MediaRef) => void;
  mediaType: 'cover' | 'video' | 'poster' | 'attachment';
  title?: string;
  courseId?: string;
  lessonId?: string;
  onTemporaryMediaCreated?: (mediaId: string) => void; // Callback when temporary media is uploaded
  // For AI prompt suggestion
  entityType?: 'course' | 'asset' | 'role-playing';
  entityTitle?: string;
  entityShortDescription?: string;
  entityDescription?: string;
}

export function MediaSelectModal({
  open,
  onClose,
  onSelect,
  mediaType,
  title = 'Select Media',
  courseId,
  lessonId,
  onTemporaryMediaCreated,
  entityType = 'course',
  entityTitle,
  entityShortDescription,
  entityDescription,
}: MediaSelectModalProps) {
  // For cover images, show 4 tabs; for others, show 2 tabs
  const isCoverImage = mediaType === 'cover';
  const [tab, setTab] = useState<'gallery' | 'upload' | 'ai' | 'unsplash'>('gallery');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset tab when modal opens and ensure valid tab state
  useEffect(() => {
    if (open) {
      setTab('gallery');
      setSelectedMediaId(null);
      setFile(null);
      setUploadError(null);
    }
  }, [open]);

  // Ensure tab is valid for current media type
  useEffect(() => {
    if (!isCoverImage && (tab === 'ai' || tab === 'unsplash')) {
      setTab('gallery');
    }
  }, [isCoverImage, tab]);

  const { data: media, loading, error, refetch } = useAdminMedia({
    media_type: mediaType,
    course_id: courseId,
    lesson_id: lessonId,
  });

  // Filter media by type
  const filteredMedia = media?.filter((m: any) => {
    if (mediaType === 'cover') return m.type === 'cover';
    if (mediaType === 'video') return m.type === 'video';
    if (mediaType === 'poster') return m.type === 'poster';
    if (mediaType === 'attachment') return m.type === 'attachment';
    return true;
  }) || [];

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Mark as temporary if courseId is 'new' (unsaved course)
      const isTemporary = courseId === 'new';
      
      const presignResponse = await lmsAdminApi.presignMediaUpload({
        media_type: mediaType,
        course_id: courseId,
        lesson_id: lessonId,
        filename: file.name,
        content_type: file.type,
        temporary: isTemporary,
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

        // If temporary, notify parent component to track it
        if (isTemporary && onTemporaryMediaCreated) {
          onTemporaryMediaCreated(presignResponse.data.media_ref.media_id);
        }

        // Refresh media list and select the newly uploaded media
        await refetch();
        const newMedia = await lmsAdminApi.listMedia({ media_type: mediaType });
        if ('data' in newMedia) {
          const uploaded = newMedia.data.media.find((m: any) => m.media_id === presignResponse.data.media_ref.media_id);
          if (uploaded) {
            onSelect(presignResponse.data.media_ref);
            onClose();
          }
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = () => {
    if (!selectedMediaId) return;

    const selected = filteredMedia.find((m: any) => m.media_id === selectedMediaId);
    if (selected) {
      // Convert media item to MediaRef
      const mediaRef: MediaRef = {
        media_id: selected.media_id,
        type: selected.type === 'cover' ? 'image' : selected.type === 'video' ? 'video' : 'document',
        url: selected.url || '',
        created_at: selected.created_at || new Date().toISOString(),
        created_by: selected.created_by || '',
        filename: selected.filename,
        content_type: selected.content_type,
        size_bytes: selected.size_bytes,
        s3_bucket: selected.s3_bucket,
        s3_key: selected.s3_key,
      };
      onSelect(mediaRef);
      onClose();
    }
  };

  const getMediaIcon = (type: string) => {
    if (type === 'cover' || type === 'poster') return <ImageIcon />;
    if (type === 'video') return <VideoIcon />;
    return <AttachmentIcon />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs 
          value={tab} 
          onChange={(_, newValue) => {
            const newTab = newValue as 'gallery' | 'upload' | 'ai' | 'unsplash';
            // Only allow switching to AI/Unsplash tabs if it's a cover image
            if ((newTab === 'ai' || newTab === 'unsplash') && !isCoverImage) {
              return;
            }
            setTab(newTab);
          }} 
          sx={{ mb: 2 }}
        >
          <Tab label="Gallery" value="gallery" icon={<CollectionsIcon />} iconPosition="start" />
          <Tab label="Upload" value="upload" icon={<UploadIcon />} iconPosition="start" />
          <Tab 
            label="Use AI Generation" 
            value="ai" 
            icon={<AutoAwesomeIcon />} 
            iconPosition="start"
            sx={{ display: isCoverImage ? 'flex' : 'none' }}
          />
          <Tab 
            label="Unsplash" 
            value="unsplash" 
            icon={<PhotoLibraryIcon />} 
            iconPosition="start"
            sx={{ display: isCoverImage ? 'flex' : 'none' }}
          />
        </Tabs>

        {tab === 'gallery' && (
          <Box>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message}
              </Alert>
            )}

            {!loading && !error && (
              <>
                {filteredMedia.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                    No {mediaType} media found. Upload your first file to get started.
                  </Typography>
                ) : (
                  <List>
                    {filteredMedia.map((item: any) => (
                      <ListItem key={item.media_id} disablePadding>
                        <ListItemButton
                          selected={selectedMediaId === item.media_id}
                          onClick={() => setSelectedMediaId(item.media_id)}
                        >
                          <ListItemIcon>{getMediaIcon(item.type)}</ListItemIcon>
                          <ListItemText
                            primary={item.filename || item.media_id}
                            secondary={item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </Box>
        )}

        {tab === 'upload' && (
          <Box>
            <Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }}>
              <UploadIcon sx={{ mr: 1 }} />
              Select File
              <input
                type="file"
                hidden
                accept={
                  mediaType === 'cover' || mediaType === 'poster'
                    ? 'image/*'
                    : mediaType === 'video'
                    ? 'video/*'
                    : '*/*'
                }
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>

            {file && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}

            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>
        )}

        {tab === 'ai' && isCoverImage && (
          <AIGenerationTab
            entityTitle={entityTitle}
            entityShortDescription={entityShortDescription}
            entityDescription={entityDescription}
            entityType={entityType}
            mediaType={mediaType}
            courseId={courseId}
            lessonId={lessonId}
            temporary={courseId === 'new'}
            onImageGenerated={onSelect}
            onClose={onClose}
          />
        )}

        {tab === 'unsplash' && isCoverImage && (
          <UnsplashTab
            mediaType={mediaType}
            courseId={courseId}
            lessonId={lessonId}
            temporary={courseId === 'new'}
            onImageSelected={onSelect}
            onClose={onClose}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tab === 'gallery' && (
          <Button
            variant="contained"
            onClick={handleSelect}
            disabled={!selectedMediaId}
          >
            Select
          </Button>
        )}
        {tab === 'upload' && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload & Select'}
          </Button>
        )}
        {/* AI and Unsplash tabs handle their own actions */}
      </DialogActions>
    </Dialog>
  );
}

