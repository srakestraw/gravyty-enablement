/**
 * Content Hub - Content Card Component
 * 
 * Unified card component for displaying content in grid, list, and compact views
 * with capability-based actions and consistent visual design
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  CardMedia,
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Button,
  Tooltip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
  Publish as PublishIcon,
  Block as ExpireIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  PersonAdd as ChangeOwnerIcon,
  Download as DownloadIcon,
  ContentCopy as CopyLinkIcon,
  Add as AddToKitIcon,
  Feedback as SuggestEditIcon,
  OpenInNew as OpenIcon,
  DriveFileMove as MoveIcon,
  Description as DocIcon,
  Link as LinkIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Slideshow as DeckIcon,
  Work as WorksheetIcon,
  Business as LogoIcon,
} from '@mui/icons-material';
import type { ContentCardData } from '../../lib/content-hub/assetHelpers';
import type { ContentCapabilities } from '../../lib/content-hub/contentCapabilities';
import { CoverImage } from './CoverImage';
import { relativeTime } from '../../lib/content-hub/assetHelpers';
import { togglePinAsset, downloadAllAttachments } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import { getMediaDisplayUrl } from '../../utils/mediaUrl';

export type ContentCardView = 'grid' | 'list' | 'compact';

export interface ContentCardProps {
  view?: ContentCardView;
  content: ContentCardData;
  capabilities: ContentCapabilities;
  onOpen?: (id: string) => void;
  onPinToggle?: (id: string, pinned: boolean) => void;
  onShare?: (id: string) => void;
  onEdit?: (id: string) => void;
  onPublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDownload?: (id: string) => void;
  onAddToKit?: (id: string) => void;
  onExpire?: (id: string) => void;
  onMove?: (id: string) => void;
  onChangeOwner?: (id: string) => void;
  onSuggestEdit?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  showStatus?: boolean;
}

/**
 * Get placeholder icon based on asset type
 */
function getPlaceholderIcon(assetType?: string, fallbackType?: string) {
  const type = fallbackType || assetType?.toLowerCase();
  switch (type) {
    case 'doc':
    case 'document':
      return <DocIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'link':
      return <LinkIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'video':
      return <VideoIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'image':
      return <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'deck':
    case 'slide':
      return <DeckIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'worksheet':
      return <WorksheetIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    case 'logo':
      return <LogoIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    default:
      return <FileIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
  }
}

/**
 * Generate deterministic background color from seed
 * Returns one of 6 preset neutral background variants
 */
function getDeterministicBackground(theme: any, seed?: string): string {
  if (!seed) return theme.palette.grey[100];
  
  // Simple hash function to convert seed to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Map to one of 6 preset backgrounds (neutral greys)
  const backgrounds = [
    theme.palette.grey[50],
    theme.palette.grey[100],
    theme.palette.grey[200],
    theme.palette.grey[50],
    theme.palette.grey[100],
    theme.palette.grey[200],
  ];
  
  return backgrounds[Math.abs(hash) % backgrounds.length];
}

/**
 * Format asset type for badge display
 */
function formatAssetType(assetType?: string): string {
  if (!assetType) return '';
  
  switch (assetType.toLowerCase()) {
    case 'doc':
    case 'document':
      return 'Doc';
    case 'link':
      return 'Link';
    case 'video':
      return 'Video';
    case 'image':
      return 'Image';
    case 'deck':
      return 'Deck';
    case 'worksheet':
      return 'Sheet';
    case 'logo':
      return 'Logo';
    default:
      return assetType.charAt(0).toUpperCase() + assetType.slice(1).toLowerCase();
  }
}

export function ContentCard({
  view = 'grid',
  content,
  capabilities,
  onOpen,
  onPinToggle,
  onShare,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onDuplicate,
  onDownload,
  onAddToKit,
  onExpire,
  onMove,
  onChangeOwner,
  onSuggestEdit,
  onCopyLink,
  showStatus = false,
}: ContentCardProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pinning, setPinning] = useState(false);
  
  // Image loading state for grid view
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(content.id);
    } else {
      navigate(`/enablement/content-hub/assets/${content.id}`);
    }
  };

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pinning || !capabilities.canPin) return;

    const newPinnedState = !content.pinned;
    
    // Optimistic update: call callback immediately
    if (onPinToggle) {
      onPinToggle(content.id, newPinnedState);
    }

    // Fire API request in background
    try {
      setPinning(true);
      const response = await togglePinAsset(content.id, newPinnedState);

      if (isErrorResponse(response)) {
        // Revert on error
        if (onPinToggle) {
          onPinToggle(content.id, content.pinned);
        }
        // Error will be handled by parent component (toast)
        return;
      }
    } catch (err) {
      // Revert on error
      if (onPinToggle) {
        onPinToggle(content.id, content.pinned);
      }
      // Error will be handled by parent component (toast)
    } finally {
      setPinning(false);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleAction = (action: () => void) => {
    handleMenuClose();
    action();
  };

  const handleDownload = async () => {
    if (onDownload) {
      handleAction(() => onDownload(content.id));
    } else {
      try {
        await downloadAllAttachments(content.id);
        handleMenuClose();
      } catch (err) {
        alert('Failed to download attachments');
      }
    }
  };

  // Load image URL for grid view
  useEffect(() => {
    if (view === 'grid' && content.coverImage) {
      setImageLoading(true);
      setImageFailed(false);
      getMediaDisplayUrl(content.coverImage)
        .then((url) => {
          setImageUrl(url);
          setImageLoading(false);
        })
        .catch(() => {
          setImageFailed(true);
          setImageLoading(false);
        });
    } else {
      setImageUrl(null);
      setImageLoading(false);
      setImageFailed(true);
    }
  }, [view, content.coverImage]);

  const handleImageError = () => {
    setImageFailed(true);
    setImageLoading(false);
  };

  // Render grid view
  if (view === 'grid') {
    // Map asset type to fallbackType
    const getFallbackType = (): 'link' | 'doc' | 'video' | 'slide' | 'image' | 'generic' | undefined => {
      const type = content.type?.toLowerCase();
      if (type === 'link') return 'link';
      if (type === 'doc' || type === 'document') return 'doc';
      if (type === 'video') return 'video';
      if (type === 'deck') return 'slide';
      if (type === 'image') return 'image';
      return 'generic';
    };

    const showPlaceholder = !imageUrl || imageFailed;
    const placeholderBg = getDeterministicBackground(theme, content.id);

    return (
      <Card
        variant="outlined"
        className="content-card"
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 150ms ease',
          '&:hover': {
            boxShadow: 3,
            '& .content-card-pin': {
              opacity: 1,
            },
          },
          '&:focus-within .content-card-pin': {
            opacity: 1,
          },
        }}
      >
        <CardActionArea
          onClick={handleOpen}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            p: 0,
            '& .MuiCardActionArea-focusHighlight': {
              opacity: 0,
            },
          }}
        >
          {/* Media area wrapper - establishes positioning context for overlays */}
          <Box sx={{ position: 'relative', aspectRatio: '16 / 9' }}>
            {imageLoading && !imageFailed ? (
              <Skeleton
                variant="rectangular"
                sx={{
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : showPlaceholder ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: placeholderBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                {getPlaceholderIcon(content.type, getFallbackType())}
              </Box>
            ) : (
              <CardMedia
                component="img"
                image={imageUrl || ''}
                alt={content.title}
                onError={handleImageError}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
            
            {/* Type badge overlay (top-left) */}
            {content.type && (
              <Chip
                label={formatAssetType(content.type)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 20,
                  zIndex: 1,
                  pointerEvents: 'none',
                  '& .MuiChip-label': {
                    padding: '0 6px',
                  },
                }}
              />
            )}

            {/* Pinned badge (bottom-right) */}
            {content.pinned && (
              <Chip
                label="Pinned"
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.7rem',
                  height: 20,
                  zIndex: 2,
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>

          {/* Content */}
          <CardContent sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                mb: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.2,
                fontWeight: 600,
              }}
            >
              {content.title}
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Updated {relativeTime(content.updatedAt)} • {content.owner.name || 'Owner'}
            </Typography>

            {(content.audienceTags && content.audienceTags.length > 0) ||
            (content.topicTags && content.topicTags.length > 0) ? (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {content.audienceTags?.slice(0, 1).map((tag) => (
                  <Chip key={tag.id} label={tag.label} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                ))}
                {content.topicTags?.slice(0, 1).map((tag) => (
                  <Chip key={tag.id} label={tag.label} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                ))}
                {((content.topicTags?.length || 0) + (content.audienceTags?.length || 0) > 2) && (
                  <Chip label={`+${(content.topicTags?.length || 0) + (content.audienceTags?.length || 0) - 2}`} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                )}
              </Box>
            ) : null}

            {showStatus && content.status && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={content.status === 'published' ? 'Published' : 'Draft'}
                  size="small"
                  color={content.status === 'published' ? 'success' : 'default'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              </Box>
            )}
          </CardContent>
        </CardActionArea>

        {/* Pin icon overlay (top-right) - outside CardActionArea to avoid nested buttons */}
        {capabilities.canPin && (
          <Tooltip title={content.pinned ? 'Unpin from your library' : 'Pin to your library'}>
            <IconButton
              className="content-card-pin"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handlePinToggle(e);
              }}
              disabled={pinning}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'background.paper',
                boxShadow: 2,
                opacity: content.pinned ? 1 : 0,
                transition: 'opacity 150ms ease',
                zIndex: 2,
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
              }}
              aria-label={content.pinned ? 'Unpin from your library' : 'Pin to your library'}
            >
              {content.pinned ? (
                <PushPinIcon fontSize="small" sx={{ color: 'primary.main' }} />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}

        {/* Actions */}
        <CardActions sx={{ mt: 'auto', px: 2, pb: 1.5, pt: 0.5, justifyContent: 'space-between' }}>
          <Button size="small" onClick={handleOpen} startIcon={<OpenIcon />}>
            Open
          </Button>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <ActionMenu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            content={content}
            capabilities={capabilities}
            onShare={() => handleAction(() => onShare?.(content.id))}
            onEdit={() => handleAction(() => onEdit?.(content.id))}
            onPublish={() => handleAction(() => onPublish?.(content.id))}
            onArchive={() => handleAction(() => onArchive?.(content.id))}
            onDelete={() => handleAction(() => onDelete?.(content.id))}
            onDownload={handleDownload}
            onAddToKit={() => handleAction(() => onAddToKit?.(content.id))}
            onExpire={() => handleAction(() => onExpire?.(content.id))}
            onMove={() => handleAction(() => onMove?.(content.id))}
            onChangeOwner={() => handleAction(() => onChangeOwner?.(content.id))}
            onSuggestEdit={() => handleAction(() => onSuggestEdit?.(content.id))}
            onCopyLink={() => handleAction(() => onCopyLink?.(content.id))}
          />
        </CardActions>
      </Card>
    );
  }

  // Render list view
  if (view === 'list') {
    return (
      <Card sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
          <Box sx={{ width: 120, height: 68, mr: 2, flexShrink: 0 }}>
            <CoverImage
              coverImage={content.coverImage}
              assetType={content.type}
              height={68}
              showTypeBadge={false}
            />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {content.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {content.type} • {content.status || 'Draft'} • Updated {relativeTime(content.updatedAt)} • {content.owner.name || 'Owner'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
            {/* Pin toggle in list view */}
            {capabilities.canPin && (
              <Tooltip title={content.pinned ? 'Unpin from your library' : 'Pin to your library'}>
                <IconButton
                  size="small"
                  onClick={handlePinToggle}
                  disabled={pinning}
                  color={content.pinned ? 'primary' : 'default'}
                  aria-label={content.pinned ? 'Unpin from your library' : 'Pin to your library'}
                >
                  {content.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                </IconButton>
              </Tooltip>
            )}
            <Button size="small" onClick={handleOpen}>
              Open
            </Button>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <ActionMenu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              content={content}
              capabilities={capabilities}
              onShare={() => handleAction(() => onShare?.(content.id))}
              onEdit={() => handleAction(() => onEdit?.(content.id))}
              onPublish={() => handleAction(() => onPublish?.(content.id))}
              onArchive={() => handleAction(() => onArchive?.(content.id))}
              onDelete={() => handleAction(() => onDelete?.(content.id))}
              onDownload={handleDownload}
              onAddToKit={() => handleAction(() => onAddToKit?.(content.id))}
              onExpire={() => handleAction(() => onExpire?.(content.id))}
              onMove={() => handleAction(() => onMove?.(content.id))}
              onChangeOwner={() => handleAction(() => onChangeOwner?.(content.id))}
              onSuggestEdit={() => handleAction(() => onSuggestEdit?.(content.id))}
              onCopyLink={() => handleAction(() => onCopyLink?.(content.id))}
            />
          </Box>
        </Box>
      </Card>
    );
  }

  // Render compact view (for horizontal scrolling sections)
  return (
    <Card sx={{ width: 280, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={handleOpen} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CoverImage
          coverImage={content.coverImage}
          assetType={content.type}
          showTypeBadge
        />
        <CardContent sx={{ p: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontWeight: 600,
            }}
          >
            {content.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {relativeTime(content.updatedAt)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  content: ContentCardData;
  capabilities: ContentCapabilities;
  onShare: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onAddToKit: () => void;
  onExpire: () => void;
  onMove: () => void;
  onChangeOwner: () => void;
  onSuggestEdit: () => void;
  onCopyLink: () => void;
}

function ActionMenu({
  anchorEl,
  open,
  onClose,
  content,
  capabilities,
  onShare,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onDownload,
  onAddToKit,
  onExpire,
  onMove,
  onChangeOwner,
  onSuggestEdit,
  onCopyLink,
}: ActionMenuProps) {
  const hasQuickActions = capabilities.canShare || capabilities.canAddToKit;
  const hasManageActions = capabilities.canEditMetadata || capabilities.canUploadVersion || capabilities.canPublish || capabilities.canExpire;
  const hasAdminActions = capabilities.canChangeOwner || capabilities.canArchive || capabilities.canDelete;

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose} onClick={(e) => e.stopPropagation()}>
      {/* Quick Actions */}
      {hasQuickActions && (
        <>
          {capabilities.canShare && (
            <MenuItem onClick={onShare}>
              <ShareIcon fontSize="small" sx={{ mr: 1 }} />
              Share
            </MenuItem>
          )}
          {capabilities.canAddToKit && (
            <MenuItem onClick={onAddToKit}>
              <AddToKitIcon fontSize="small" sx={{ mr: 1 }} />
              Add to kit
            </MenuItem>
          )}
        </>
      )}

      {/* Download and Copy Link (always available if allowed) */}
      {capabilities.canDownload && (
        <MenuItem onClick={onDownload}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
      )}
      {capabilities.canCopyLink && (
        <MenuItem onClick={onCopyLink}>
          <CopyLinkIcon fontSize="small" sx={{ mr: 1 }} />
          Copy link
        </MenuItem>
      )}

      {/* Divider before manage actions */}
      {hasManageActions && (hasQuickActions || capabilities.canDownload || capabilities.canCopyLink) && <Divider />}

      {/* Manage Actions */}
      {hasManageActions && (
        <>
          {capabilities.canEditMetadata && (
            <MenuItem onClick={onEdit}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
          )}
          {capabilities.canUploadVersion && (
            <MenuItem onClick={() => {}} disabled>
              <UploadIcon fontSize="small" sx={{ mr: 1 }} />
              Upload new version
            </MenuItem>
          )}
          {capabilities.canPublish && (
            <MenuItem onClick={onPublish}>
              <PublishIcon fontSize="small" sx={{ mr: 1 }} />
              Publish
            </MenuItem>
          )}
          {capabilities.canExpire && (
            <MenuItem onClick={onExpire}>
              <ExpireIcon fontSize="small" sx={{ mr: 1 }} />
              Expire
            </MenuItem>
          )}
          {capabilities.canMove && (
            <MenuItem onClick={onMove}>
              <MoveIcon fontSize="small" sx={{ mr: 1 }} />
              Move
            </MenuItem>
          )}
        </>
      )}

      {/* Suggest Edit (for non-owners) */}
      {capabilities.canSuggestEdit && !capabilities.canEditMetadata && (
        <>
          {(hasManageActions || hasQuickActions || capabilities.canDownload || capabilities.canCopyLink) && <Divider />}
          <MenuItem onClick={onSuggestEdit}>
            <SuggestEditIcon fontSize="small" sx={{ mr: 1 }} />
            Suggest edit
          </MenuItem>
        </>
      )}

      {/* Divider before admin actions */}
      {hasAdminActions && (hasManageActions || hasQuickActions || capabilities.canSuggestEdit || capabilities.canDownload || capabilities.canCopyLink) && <Divider />}

      {/* Admin Actions */}
      {hasAdminActions && (
        <>
          {capabilities.canChangeOwner && (
            <MenuItem onClick={onChangeOwner} disabled>
              <ChangeOwnerIcon fontSize="small" sx={{ mr: 1 }} />
              Change owner
            </MenuItem>
          )}
          {capabilities.canArchive && (
            <MenuItem onClick={onArchive} disabled>
              <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
              Archive
            </MenuItem>
          )}
          {capabilities.canDelete && (
            <MenuItem onClick={onDelete}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );
}


/**
 * Content Card Skeleton for loading states
 */
export function ContentCardSkeleton({ view = 'grid' }: { view?: ContentCardView }) {
  if (view === 'grid') {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Skeleton
          variant="rectangular"
          sx={{
            aspectRatio: '16 / 9',
            width: '100%',
          }}
        />
        <CardContent sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={16} width="80%" sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Skeleton variant="rectangular" width={60} height={20} />
            <Skeleton variant="rectangular" width={80} height={20} />
          </Box>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 1.5, pt: 0.5, justifyContent: 'space-between' }}>
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </CardActions>
      </Card>
    );
  }

  if (view === 'list') {
    return (
      <Card sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
          <Skeleton variant="rectangular" width={120} height={68} sx={{ mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" height={24} width="60%" sx={{ mb: 1 }} />
            <Skeleton variant="text" height={16} width="40%" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ ml: 2 }} />
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ width: 280, flexShrink: 0 }}>
      <Skeleton variant="rectangular" height={158} />
      <CardContent>
        <Skeleton variant="text" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={14} width="60%" />
      </CardContent>
    </Card>
  );
}

