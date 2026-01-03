/**
 * Attachments Section Component
 * 
 * Complete attachments management UI with count, list, and add actions
 */

import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Menu,
  MenuItem,
  FormHelperText,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  CloudQueue as CloudQueueIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { AttachmentRow } from './AttachmentRow';
import { AddLinksPanel } from './AddLinksPanel';
import type { Attachment } from './AttachmentsComposer';

// Re-export Attachment type for convenience
export type { Attachment } from './AttachmentsComposer';

export interface AttachmentsSectionProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onSetPrimary?: (attachmentId: string) => void;
  requiresAttachments?: boolean;
  canUseDrive?: boolean;
  disabled?: boolean;
  error?: string;
}

export function AttachmentsSection({
  attachments,
  onAttachmentsChange,
  onSetPrimary,
  requiresAttachments = false,
  canUseDrive = false,
  disabled = false,
  error,
}: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [showAddLinksPanel, setShowAddLinksPanel] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newAttachments: Attachment[] = newFiles.map((file, index) => ({
        id: `temp_${Date.now()}_${index}`,
        type: 'FILE_UPLOAD' as const,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready' as const,
        sortOrder: attachments.length + index,
        isPrimary: attachments.length === 0 && index === 0,
        file: file,
      }));
      
      // Ensure exactly one primary if required
      const updated = [...attachments, ...newAttachments];
      if (requiresAttachments && updated.length > 0 && !updated.some(a => a.isPrimary)) {
        updated[0].isPrimary = true;
      }
      
      onAttachmentsChange(updated);
      e.target.value = '';
    }
  };

  const handleAddLinks = (urls: string[]) => {
    const newAttachments: Attachment[] = urls.map((url, index) => ({
      id: `temp_${Date.now()}_${index}`,
      type: 'LINK' as const,
      url: url,
      status: 'ready' as const,
      sortOrder: attachments.length + index,
      isPrimary: attachments.length === 0 && index === 0,
    }));
    
    // Ensure exactly one primary if required
    const updated = [...attachments, ...newAttachments];
    if (requiresAttachments && updated.length > 0 && !updated.some(a => a.isPrimary)) {
      updated[0].isPrimary = true;
    }
    
    onAttachmentsChange(updated);
    setShowAddLinksPanel(false);
  };

  const handleRemove = (attachmentId: string) => {
    const updated = attachments.filter(a => a.id !== attachmentId);
    // If removing primary, make first remaining attachment primary
    const removed = attachments.find(a => a.id === attachmentId);
    if (removed?.isPrimary && updated.length > 0 && requiresAttachments) {
      updated[0].isPrimary = true;
    }
    onAttachmentsChange(updated);
  };

  const handleSetPrimary = (attachmentId: string) => {
    const updated = attachments.map(a => ({
      ...a,
      isPrimary: a.id === attachmentId,
    }));
    onAttachmentsChange(updated);
    if (onSetPrimary) {
      onSetPrimary(attachmentId);
    }
  };

  const handleReplace = (attachmentId: string) => {
    fileInputRef.current?.click();
    // Note: In a full implementation, you'd track which attachment to replace
    // For now, this just opens the file picker
  };

  const handleAddMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleAddMenuClose = () => {
    setAddMenuAnchor(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    handleAddMenuClose();
  };

  const handleAddLinkClick = () => {
    setShowAddLinksPanel(true);
    handleAddMenuClose();
  };

  const readyAttachments = attachments.filter(a => a.status === 'ready');
  const uploadingAttachments = attachments.filter(a => a.status === 'uploading');
  const failedAttachments = attachments.filter(a => a.status === 'failed');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2">
            Attachments ({attachments.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Add one or more files and links. You can mix sources.
          </Typography>
        </Box>
      </Stack>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadIcon />}
          onClick={handleUploadClick}
          disabled={disabled}
        >
          Upload files
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<LinkIcon />}
          onClick={handleAddLinkClick}
          disabled={disabled}
        >
          Add link
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudQueueIcon />}
          disabled={!canUseDrive || disabled}
          sx={{ opacity: canUseDrive ? 1 : 0.5 }}
        >
          Drive
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          onChange={handleFileSelect}
        />
      </Stack>

      {/* Empty State */}
      {attachments.length === 0 && !showAddLinksPanel && (
        <Box
          sx={{
            border: 2,
            borderColor: 'divider',
            borderStyle: 'dashed',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload multiple files, add multiple links, or mix both.
          </Typography>
        </Box>
      )}

      {/* Add Links Panel */}
      {showAddLinksPanel && (
        <Box sx={{ mb: 2 }}>
          <AddLinksPanel
            onAddLinks={handleAddLinks}
            onCancel={() => setShowAddLinksPanel(false)}
          />
        </Box>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box>
            {attachments.map((attachment) => (
              <AttachmentRow
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemove}
                onSetPrimary={handleSetPrimary}
                onReplace={handleReplace}
                showPrimaryToggle={requiresAttachments}
                disabled={disabled}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Add Another Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 1.5,
          border: 1,
          borderColor: 'divider',
          borderStyle: 'dashed',
          borderRadius: 1,
          cursor: disabled ? 'default' : 'pointer',
          '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
        }}
        onClick={disabled ? undefined : handleAddMenuClick}
      >
        <AddIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          Add another attachment
        </Typography>
      </Box>

      {/* Add Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={handleAddMenuClose}
      >
        <MenuItem onClick={handleUploadClick}>
          <CloudUploadIcon fontSize="small" sx={{ mr: 1 }} />
          Upload files
        </MenuItem>
        <MenuItem onClick={handleAddLinkClick}>
          <LinkIcon fontSize="small" sx={{ mr: 1 }} />
          Add link
        </MenuItem>
        {canUseDrive && (
          <MenuItem disabled>
            <CloudQueueIcon fontSize="small" sx={{ mr: 1 }} />
            Drive
          </MenuItem>
        )}
      </Menu>

      {/* Error Message */}
      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {/* Status Summary */}
      {(uploadingAttachments.length > 0 || failedAttachments.length > 0) && (
        <Box sx={{ mt: 1 }}>
          {uploadingAttachments.length > 0 && (
            <Typography variant="caption" color="info.main">
              {uploadingAttachments.length} file{uploadingAttachments.length > 1 ? 's' : ''} uploading...
            </Typography>
          )}
          {failedAttachments.length > 0 && (
            <Typography variant="caption" color="error.main" sx={{ ml: uploadingAttachments.length > 0 ? 2 : 0 }}>
              {failedAttachments.length} failed
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

