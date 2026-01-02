/**
 * Cover Image Selector Component
 * 
 * Shared component for selecting cover images across courses, assets, and role-playing
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from '../admin/learning/MediaSelectModal';
import { getMediaDisplayUrl } from '../../utils/mediaUrl';
import type { MediaRef } from '@gravyty/domain';

export interface CoverImageSelectorProps {
  // Entity context
  entityType: 'course' | 'asset' | 'role-playing';
  entityId?: string;
  
  // Current cover image
  coverImage?: MediaRef | null;
  
  // Entity details for AI prompt suggestion
  entityTitle?: string;
  entityShortDescription?: string;
  entityDescription?: string;
  
  // Callbacks
  onCoverImageSelected: (mediaRef: MediaRef) => void;
  onCoverImageRemoved?: () => void;
  onTemporaryMediaCreated?: (mediaId: string) => void;
  
  // Optional customization
  label?: string; // Default: "Cover Image"
  showGuidance?: boolean; // Default: true
}

export function CoverImageSelector({
  entityType,
  entityId,
  coverImage,
  entityTitle,
  entityShortDescription,
  entityDescription,
  onCoverImageSelected,
  onCoverImageRemoved,
  onTemporaryMediaCreated,
  label = 'Cover Image',
  showGuidance = true,
}: CoverImageSelectorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Load presigned URL when coverImage changes
  useEffect(() => {
    if (coverImage) {
      getMediaDisplayUrl(coverImage).then(setImageUrl);
    } else {
      setImageUrl(null);
    }
  }, [coverImage]);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelect = (mediaRef: MediaRef) => {
    onCoverImageSelected(mediaRef);
    setModalOpen(false);
  };

  const handleRemove = () => {
    if (onCoverImageRemoved) {
      onCoverImageRemoved();
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        {/* Label */}
        <Typography variant="subtitle2">{label}</Typography>

        {/* Image Requirements Guidance */}
        {showGuidance && (
          <Chip
            label="Recommended: 16:9 aspect ratio (1600 x 900). Keep subject centered, avoid text near edges."
            size="small"
            color="info"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Current Cover Image Display */}
        {coverImage && imageUrl ? (
          <Paper
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 600,
              aspectRatio: '16/9',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'grey.200',
            }}
          >
            <img
              src={imageUrl}
              alt="Cover"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setModalOpen(true)}
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              {onCoverImageRemoved && (
                <IconButton
                  size="small"
                  onClick={handleRemove}
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Paper>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setModalOpen(true)}
            sx={{
              width: '100%',
              maxWidth: 600,
              aspectRatio: '16/9',
              borderStyle: 'dashed',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Attach Cover Image
            </Typography>
          </Button>
        )}

        {/* Media Select Modal */}
        <MediaSelectModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleSelect}
          mediaType="cover"
          title="Select Cover Image"
          courseId={entityType === 'course' ? entityId : undefined}
          onTemporaryMediaCreated={onTemporaryMediaCreated}
          entityType={entityType}
          entityTitle={entityTitle}
          entityShortDescription={entityShortDescription}
          entityDescription={entityDescription}
        />
      </Stack>
    </Box>
  );
}

