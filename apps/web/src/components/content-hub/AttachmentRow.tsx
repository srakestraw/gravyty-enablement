/**
 * Attachment Row Component
 * 
 * Displays a single attachment with icon, title, secondary info, status, and actions
 */

import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  CloudQueue as CloudQueueIcon,
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudUploadOutlined as CloudUploadOutlinedIcon,
} from '@mui/icons-material';
import type { Attachment } from './AttachmentsComposer';

export interface AttachmentRowProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onReplace?: (id: string) => void;
  showPrimaryToggle?: boolean;
  disabled?: boolean;
}

export function AttachmentRow({
  attachment,
  onRemove,
  onSetPrimary,
  onReplace,
  showPrimaryToggle = true,
  disabled = false,
}: AttachmentRowProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const getIcon = () => {
    switch (attachment.type) {
      case 'FILE_UPLOAD':
        return <CloudUploadIcon fontSize="small" color="action" />;
      case 'LINK':
        return <LinkIcon fontSize="small" color="action" />;
      case 'DRIVE':
        return <CloudQueueIcon fontSize="small" color="action" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    return attachment.title || attachment.fileName || attachment.url || 'Untitled';
  };

  const getSecondary = () => {
    if (attachment.status === 'uploading') {
      return 'Uploading...';
    }
    if (attachment.status === 'failed') {
      return `Failed: ${attachment.errorMessage || 'Unknown error'}`;
    }
    if (attachment.type === 'FILE_UPLOAD' && attachment.fileSize) {
      return `${formatFileSize(attachment.fileSize)} • ${attachment.mimeType || 'Unknown type'}`;
    }
    if (attachment.type === 'LINK' && attachment.url) {
      return getDomainFromUrl(attachment.url);
    }
    if (attachment.type === 'DRIVE' && attachment.driveFileName) {
      return attachment.driveFileName;
    }
    return undefined;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        px: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 0,
        },
      }}
    >
      {/* Icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 32 }}>
        {getIcon()}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          {attachment.isPrimary && showPrimaryToggle && (
            <Chip
              label="Primary"
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
          <Typography
            variant="body2"
            fontWeight={attachment.isPrimary ? 'bold' : 'normal'}
            noWrap
            sx={{ flex: 1 }}
          >
            {getTitle()}
          </Typography>
        </Stack>
        {getSecondary() && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {getSecondary()}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        {showPrimaryToggle && !attachment.isPrimary && onSetPrimary && (
          <Tooltip title="Set as primary">
            <IconButton
              size="small"
              onClick={() => onSetPrimary(attachment.id)}
              disabled={disabled}
            >
              <StarBorderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {showPrimaryToggle && attachment.isPrimary && onSetPrimary && (
          <Tooltip title="Primary attachment">
            <IconButton
              size="small"
              onClick={() => onSetPrimary(attachment.id)}
              disabled={disabled}
              color="primary"
            >
              <StarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {attachment.type === 'FILE_UPLOAD' && onReplace && (
          <Tooltip title="Replace file">
            <IconButton
              size="small"
              onClick={() => onReplace(attachment.id)}
              disabled={disabled}
            >
              <CloudUploadOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Remove">
          <IconButton
            size="small"
            onClick={() => onRemove(attachment.id)}
            disabled={disabled}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

