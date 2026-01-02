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
  CircularProgress,
  Alert,
  Typography,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  PhotoLibrary as PhotoLibraryIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
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
  pathId?: string;
  kitId?: string;
  rolePlayingId?: string;
  assetId?: string;
  lessonId?: string;
  onTemporaryMediaCreated?: (mediaId: string) => void; // Callback when temporary media is uploaded
  // For AI prompt suggestion
  entityType?: 'course' | 'asset' | 'role-playing' | 'path' | 'kit';
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
  pathId,
  kitId,
  rolePlayingId,
  assetId,
  lessonId,
  onTemporaryMediaCreated,
  entityType = 'course',
  entityTitle,
  entityShortDescription,
  entityDescription,
}: MediaSelectModalProps) {
  // For cover images, show 3 tabs; for others, show 1 tab
  const isCoverImage = mediaType === 'cover';
  const [tab, setTab] = useState<'upload' | 'ai' | 'unsplash'>('upload');
  
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
      setTab('upload');
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
      setTab('upload');
    }
  }, [isCoverImage, tab]);

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
      // Determine entity ID based on entity type
      let entityId: string | undefined;
      let isTemporary = false;
      
      if (entityType === 'course') {
        entityId = courseId;
        isTemporary = courseId === 'new';
        // For non-cover media types, lessonId is required
        if (mediaType !== 'cover' && !lessonId) {
          throw new Error('Lesson ID is required for video, poster, and attachment media types');
        }
      } else if (entityType === 'path') {
        entityId = pathId;
        isTemporary = pathId === 'new';
      } else if (entityType === 'kit') {
        entityId = kitId;
        isTemporary = kitId === 'new';
      } else if (entityType === 'role-playing') {
        entityId = rolePlayingId;
        isTemporary = rolePlayingId === 'new';
      } else if (entityType === 'asset') {
        entityId = assetId;
        isTemporary = assetId === 'new';
      } else {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }
      
      // For cover images, entity ID is optional if temporary
      // For other media types, entity ID is required
      if (!isTemporary && !entityId && mediaType !== 'cover') {
        throw new Error(`Entity ID is required for ${mediaType} media type`);
      }
      
      // Build presign request payload
      const presignPayload: {
        media_type: 'cover' | 'video' | 'poster' | 'attachment';
        course_id?: string;
        path_id?: string;
        kit_id?: string;
        role_playing_id?: string;
        asset_id?: string;
        lesson_id?: string;
        filename: string;
        content_type: string;
        temporary?: boolean;
      } = {
        media_type: mediaType,
        filename: selectedFile.name,
        content_type: selectedFile.type,
        temporary: isTemporary,
      };
      
      // Add entity-specific ID
      if (entityType === 'course') {
        if (courseId) {
          presignPayload.course_id = courseId;
        }
        if (lessonId) {
          presignPayload.lesson_id = lessonId;
        }
      } else if (entityType === 'path') {
        if (pathId) {
          presignPayload.path_id = pathId;
        }
      } else if (entityType === 'kit') {
        if (kitId) {
          presignPayload.kit_id = kitId;
        }
      } else if (entityType === 'role-playing') {
        if (rolePlayingId) {
          presignPayload.role_playing_id = rolePlayingId;
        }
      } else if (entityType === 'asset') {
        if (assetId) {
          presignPayload.asset_id = assetId;
        }
      }
      
      const presignResponse = await lmsAdminApi.presignMediaUpload(presignPayload);

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

      // Select the newly uploaded media
      onSelect(presignResponse.data.media_ref);
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload media';
      setUploadStatus('error');
      setUploadError(errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setUploading(false);
    }
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
            const newTab = newValue as 'upload' | 'ai' | 'unsplash';
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
            courseId={entityType === 'course' ? courseId : undefined}
            lessonId={lessonId}
            temporary={
              entityType === 'course' ? courseId === 'new' :
              entityType === 'path' ? pathId === 'new' :
              entityType === 'kit' ? kitId === 'new' :
              entityType === 'role-playing' ? rolePlayingId === 'new' :
              entityType === 'asset' ? assetId === 'new' :
              false
            }
            onImageGenerated={onSelect}
            onClose={onClose}
          />
        )}

        {tab === 'unsplash' && isCoverImage && (
          <UnsplashTab
            mediaType={mediaType}
            courseId={entityType === 'course' ? courseId : undefined}
            lessonId={lessonId}
            temporary={
              entityType === 'course' ? courseId === 'new' :
              entityType === 'path' ? pathId === 'new' :
              entityType === 'kit' ? kitId === 'new' :
              entityType === 'role-playing' ? rolePlayingId === 'new' :
              entityType === 'asset' ? assetId === 'new' :
              false
            }
            onImageSelected={onSelect}
            onClose={onClose}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
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

