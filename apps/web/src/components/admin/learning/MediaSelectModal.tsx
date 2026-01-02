/**
 * Media Select Modal
 * 
 * Modal for selecting or uploading media for courses/lessons
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
  Paper,
  Stack,
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
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
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
  
  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'empty' | 'selected' | 'uploading' | 'error'>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewHeadingRef = useRef<HTMLDivElement>(null);
  
  // Legacy state for backward compatibility (will be removed)
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Utility function to read image dimensions
  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file
  const validateFile = async (file: File): Promise<{ valid: boolean; error?: string; warning?: string }> => {
    // Check file type
    const isImage = mediaType === 'cover' || mediaType === 'poster';
    if (isImage) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        return { valid: false, error: 'Invalid file type. Please select a PNG or JPG image.' };
      }
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds 10MB. Please select a smaller file.` };
    }

    // Check dimensions for cover images
    if (isImage && mediaType === 'cover') {
      try {
        const { width, height } = await readImageDimensions(file);
        const aspectRatio = width / height;
        const targetAspectRatio = 16 / 9; // 1.778
        
        // Minimum dimensions check
        if (width < 400 || height < 225) {
          return { valid: false, error: 'Image is too small. Minimum dimensions: 400 x 225px.' };
        }

        // Aspect ratio warning (non-blocking)
        if (Math.abs(aspectRatio - targetAspectRatio) > 0.1) {
          return { 
            valid: true, 
            warning: 'This image may be cropped to fit the 16:9 aspect ratio. Keep the subject centered.' 
          };
        }
      } catch (err) {
        return { valid: false, error: 'Failed to read image dimensions.' };
      }
    }

    return { valid: true };
  };

  // Handle file selection
  const handleFileSelection = useCallback(async (file: File | null) => {
    // Cleanup previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!file) {
      setSelectedFile(null);
      setFileMeta(null);
      setUploadStatus('empty');
      setErrorMessage(null);
      setWarningMessage(null);
      setFile(null); // Legacy
      return;
    }

    // Set file immediately for preview
    setSelectedFile(file);
    setFile(file); // Legacy
    setUploadStatus('selected');
    setErrorMessage(null);
    setWarningMessage(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Read metadata
    try {
      const meta: { name: string; size: number; type: string; width?: number; height?: number } = {
        name: file.name,
        size: file.size,
        type: file.type,
      };

      // Read dimensions for images
      if (mediaType === 'cover' || mediaType === 'poster') {
        try {
          const { width, height } = await readImageDimensions(file);
          meta.width = width;
          meta.height = height;
        } catch (err) {
          console.warn('Failed to read image dimensions:', err);
        }
      }

      setFileMeta(meta);

      // Validate file
      const validation = await validateFile(file);
      if (!validation.valid) {
        setUploadStatus('error');
        setErrorMessage(validation.error || 'Invalid file');
      } else {
        setUploadStatus('selected');
        if (validation.warning) {
          setWarningMessage(validation.warning);
        }
        // Focus on preview heading after file selection
        setTimeout(() => {
          previewHeadingRef.current?.focus();
        }, 100);
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process file');
    }
  }, [mediaType, previewUrl]);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset tab when modal opens and ensure valid tab state
  useEffect(() => {
    if (open) {
      setTab('gallery');
      setSelectedMediaId(null);
      setFile(null);
      setUploadError(null);
      // Reset upload tab state
      handleFileSelection(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on 'open', not handleFileSelection to avoid resetting when file is selected

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

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, [handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  }, [handleFileSelection]);

  const handleReplaceFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    handleFileSelection(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  const handleUpload = async () => {
    if (!selectedFile || uploadStatus !== 'selected') return;

    setUploadStatus('uploading');
    setUploading(true);
    setUploadError(null);
    setErrorMessage(null);

    try {
      // Mark as temporary if courseId is 'new' (unsaved course)
      const isTemporary = courseId === 'new';
      
      const presignResponse = await lmsAdminApi.presignMediaUpload({
        media_type: mediaType,
        course_id: courseId,
        lesson_id: lessonId,
        filename: selectedFile.name,
        content_type: selectedFile.type,
        temporary: isTemporary,
      });

      if ('error' in presignResponse) {
        throw new Error(presignResponse.error.message || 'Failed to get upload URL');
      }

      if (!presignResponse.data) {
        throw new Error('Invalid response from server');
      }

      // Upload file to S3
      const uploadResult = await fetch(presignResponse.data.upload_url, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResult.status} ${uploadResult.statusText}`);
      }

      // If temporary, notify parent component to track it
      if (isTemporary && onTemporaryMediaCreated) {
        onTemporaryMediaCreated(presignResponse.data.media_ref.media_id);
      }

      // Refresh media list and select the newly uploaded media
      await refetch();
      // Use same params as the hook to ensure consistent filtering
      const newMedia = await lmsAdminApi.listMedia({ 
        media_type: mediaType,
        course_id: courseId,
        lesson_id: lessonId,
      });
      if ('error' in newMedia) {
        console.warn('Failed to refresh media list, but upload succeeded:', newMedia.error);
        // Still select the media even if list refresh fails
        onSelect(presignResponse.data.media_ref);
        onClose();
        return;
      }

      if (newMedia.data) {
        const uploaded = newMedia.data.media.find((m: any) => m.media_id === presignResponse.data.media_ref.media_id);
        if (uploaded) {
          onSelect(presignResponse.data.media_ref);
          onClose();
        } else {
          // Media uploaded but not found in list - still select it
          console.warn('Media uploaded but not found in refreshed list, selecting anyway');
          onSelect(presignResponse.data.media_ref);
          onClose();
        }
      } else {
        // No data in response but no error - still select the media
        onSelect(presignResponse.data.media_ref);
        onClose();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload media';
      setUploadStatus('error');
      setUploadError(errorMsg);
      setErrorMessage(errorMsg);
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
            // Reset upload state when switching away from upload tab
            if (newTab !== 'upload') {
              handleFileSelection(null);
            }
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
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={
                mediaType === 'cover' || mediaType === 'poster'
                  ? 'image/png,image/jpeg,image/jpg'
                  : mediaType === 'video'
                  ? 'video/*'
                  : '*/*'
              }
              onChange={handleFileInputChange}
            />

            {uploadStatus === 'empty' && (
              <Box
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                sx={{
                  border: `2px dashed ${dragActive ? 'primary.main' : 'divider'}`,
                  borderRadius: 1,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: dragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
                <Typography variant="h6" gutterBottom>
                  Select File
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Drag and drop or click to upload
                </Typography>
                {(mediaType === 'cover' || mediaType === 'poster') && (
                  <Typography variant="caption" color="text.secondary">
                    PNG/JPG, up to 10MB. Recommended 16:9 aspect ratio (1600 x 900px).
                  </Typography>
                )}
                {mediaType === 'video' && (
                  <Typography variant="caption" color="text.secondary">
                    Video files, up to 10MB.
                  </Typography>
                )}
                {mediaType === 'attachment' && (
                  <Typography variant="caption" color="text.secondary">
                    All file types, up to 10MB.
                  </Typography>
                )}
              </Box>
            )}

            {(uploadStatus === 'selected' || uploadStatus === 'uploading' || uploadStatus === 'error') && (
              <Stack spacing={2}>
                {/* Preview Panel */}
                {(mediaType === 'cover' || mediaType === 'poster') && previewUrl && (
                  <Paper
                    sx={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.200',
                      border: uploadStatus === 'error' ? '2px solid' : 'none',
                      borderColor: uploadStatus === 'error' ? 'error.main' : 'transparent',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {uploadStatus === 'uploading' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        <CircularProgress sx={{ color: 'white' }} />
                      </Box>
                    )}
                  </Paper>
                )}

                {/* File Details Panel */}
                {fileMeta && (
                  <Paper sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Box 
                        ref={previewHeadingRef}
                        tabIndex={-1}
                        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <Typography variant="subtitle2" component="h3">File Details</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleReplaceFile}
                            disabled={uploadStatus === 'uploading'}
                          >
                            Replace File
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            color="error"
                            onClick={handleRemoveFile}
                            disabled={uploadStatus === 'uploading'}
                            startIcon={<DeleteIcon />}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Box>
                      <Typography variant="body2">
                        <strong>Name:</strong> {fileMeta.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Size:</strong> {formatFileSize(fileMeta.size)}
                      </Typography>
                      {fileMeta.width && fileMeta.height && (
                        <Typography variant="body2">
                          <strong>Dimensions:</strong> {fileMeta.width} x {fileMeta.height}px
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Warning Message */}
                {warningMessage && uploadStatus === 'selected' && (
                  <Alert severity="warning">{warningMessage}</Alert>
                )}

                {/* Error Message */}
                {errorMessage && uploadStatus === 'error' && (
                  <Alert severity="error">{errorMessage}</Alert>
                )}
              </Stack>
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
            disabled={!selectedFile || uploadStatus !== 'selected' || uploading}
            startIcon={uploadStatus === 'uploading' ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            {uploadStatus === 'uploading' 
              ? 'Uploading...' 
              : mediaType === 'cover' 
                ? 'Set Cover Image' 
                : mediaType === 'poster'
                  ? 'Set Poster Image'
                  : 'Upload & Select'}
          </Button>
        )}
        {/* AI and Unsplash tabs handle their own actions */}
      </DialogActions>
    </Dialog>
  );
}

