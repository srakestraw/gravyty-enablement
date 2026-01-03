/**
 * Cover Image Selector Component
 * 
 * Shared component for selecting cover images across courses, assets, and role-playing
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Image as ImageIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from '../admin/learning/MediaSelectModal';
import { getMediaDisplayUrl } from '../../utils/mediaUrl';
import type { MediaRef } from '@gravyty/domain';

export interface CoverImageSelectorProps {
  // Entity context
  entityType: 'course' | 'asset' | 'role-playing' | 'path' | 'kit';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [overflowMenuAnchor, setOverflowMenuAnchor] = useState<null | HTMLElement>(null);
  const overflowMenuOpen = Boolean(overflowMenuAnchor);
  
  // Load presigned URL when coverImage changes
  useEffect(() => {
    if (coverImage) {
      getMediaDisplayUrl(coverImage).then(setImageUrl);
    } else {
      setImageUrl(null);
    }
  }, [coverImage]);

  const handleSelect = (mediaRef: MediaRef) => {
    onCoverImageSelected(mediaRef);
    setModalOpen(false);
  };

  const handleRemoveClick = () => {
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (onCoverImageRemoved) {
      onCoverImageRemoved();
    }
    setRemoveDialogOpen(false);
  };

  const handleRemoveCancel = () => {
    setRemoveDialogOpen(false);
  };

  const handleOverflowMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverflowMenuAnchor(event.currentTarget);
  };

  const handleOverflowMenuClose = () => {
    setOverflowMenuAnchor(null);
  };

  // Thumbnail dimensions based on breakpoint
  // Mobile: 96x54, Tablet: 120x68, Desktop: 140x79
  const thumbnailWidth = isMobile ? 96 : isTablet ? 120 : 140;
  const thumbnailHeight = isMobile ? 54 : isTablet ? 68 : 79;

  const hasImage = coverImage && imageUrl;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 1.5,
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}
      >
        {/* Thumbnail */}
        <Button
          onClick={() => setModalOpen(true)}
          aria-label={hasImage ? 'Change cover image' : 'Add cover image'}
          sx={{
            p: 0,
            minWidth: thumbnailWidth,
            width: thumbnailWidth,
            height: thumbnailHeight,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'action.disabled',
            bgcolor: 'grey.200',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'grey.300',
              borderColor: 'primary.main',
              transform: 'scale(1.02)',
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }}
        >
          {hasImage ? (
            <img
              src={imageUrl!}
              alt="Cover preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <ImageIcon sx={{ fontSize: isMobile ? 24 : 28, color: 'text.disabled', opacity: 0.5 }} />
          )}
        </Button>

        {/* Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Label */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              (Optional)
            </Typography>
          </Box>

          {/* Helper text */}
          {showGuidance && (
            <Box>
              {hasImage ? (
                <Typography variant="caption" color="text.secondary">
                  {coverImage?.filename && (
                    <>
                      {coverImage.filename}
                      {coverImage.width && coverImage.height && ` • ${coverImage.width} × ${coverImage.height}`}
                    </>
                  )}
                  {!coverImage?.filename && 'Cover image selected'}
                </Typography>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Recommended: 1480 x 643 (16:9) - JPG, PNG, WebP
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Max 5 MB
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
            {hasImage ? (
              <>
                <Button
                  variant="contained"
                  onClick={() => setModalOpen(true)}
                >
                  Replace
                </Button>
                <IconButton
                  size="small"
                  onClick={handleOverflowMenuOpen}
                  aria-label="More actions"
                  aria-haspopup="true"
                  aria-expanded={overflowMenuOpen}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  onClick={() => setModalOpen(true)}
                >
                  Add image
                </Button>
                {/* Reserve space for future overflow menu */}
                <IconButton
                  size="small"
                  disabled
                  sx={{ opacity: 0, pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>

          {/* Overflow Menu */}
          {hasImage && (
            <Menu
              anchorEl={overflowMenuAnchor}
              open={overflowMenuOpen}
              onClose={handleOverflowMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {onCoverImageRemoved && (
                <MenuItem
                  onClick={() => {
                    handleOverflowMenuClose();
                    handleRemoveClick();
                  }}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Remove</ListItemText>
                </MenuItem>
              )}
              {/* Future: Add "View" menu item here */}
            </Menu>
          )}
        </Box>
      </Box>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onClose={handleRemoveCancel}>
        <DialogTitle>Remove Cover Image</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove the cover image? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveCancel}>Cancel</Button>
          <Button onClick={handleRemoveConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Media Select Modal */}
      <MediaSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelect}
        mediaType="cover"
        title="Select Cover Image"
        courseId={entityType === 'course' ? entityId : undefined}
        pathId={entityType === 'path' ? entityId : undefined}
        kitId={entityType === 'kit' ? entityId : undefined}
        rolePlayingId={entityType === 'role-playing' ? entityId : undefined}
        assetId={entityType === 'asset' ? entityId : undefined}
        onTemporaryMediaCreated={onTemporaryMediaCreated}
        entityType={entityType}
        entityTitle={entityTitle}
        entityShortDescription={entityShortDescription}
        entityDescription={entityDescription}
      />
    </Box>
  );
}

