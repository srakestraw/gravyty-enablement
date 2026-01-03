/**
 * Attachments Composer Component
 * 
 * Unified component for adding and managing multiple attachments (files, links, drive items)
 */

import { useState, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  CloudQueue as CloudQueueIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export type AttachmentType = 'FILE_UPLOAD' | 'LINK' | 'DRIVE';
export type AttachmentStatus = 'ready' | 'uploading' | 'failed';

export interface Attachment {
  id: string;
  type: AttachmentType;
  title?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: AttachmentStatus;
  errorMessage?: string;
  isPrimary?: boolean;
  sortOrder: number;
  // For drive items
  driveFileId?: string;
  driveFileName?: string;
  driveWebViewLink?: string;
  // For file uploads - keep File reference until uploaded
  file?: File;
}

export interface AttachmentsComposerProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onSetPrimary?: (attachmentId: string) => void;
  disabled?: boolean;
}

export function AttachmentsComposer({
  attachments,
  onAttachmentsChange,
  onSetPrimary,
  disabled = false,
}: AttachmentsComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newAttachments: Attachment[] = newFiles.map((file, index) => ({
        id: `temp_${Date.now()}_${index}`,
        type: 'FILE_UPLOAD' as AttachmentType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready' as AttachmentStatus,
        sortOrder: attachments.length + index,
        isPrimary: attachments.length === 0 && index === 0, // First attachment is primary by default
        file: file, // Store File object for upload
      }));
      onAttachmentsChange([...attachments, ...newAttachments]);
      e.target.value = '';
    }
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      const newAttachment: Attachment = {
        id: `temp_${Date.now()}`,
        type: 'LINK' as AttachmentType,
        url: linkUrl.trim(),
        title: linkTitle.trim() || undefined,
        status: 'ready' as AttachmentStatus,
        sortOrder: attachments.length,
        isPrimary: attachments.length === 0, // First attachment is primary by default
      };
      onAttachmentsChange([...attachments, newAttachment]);
      setLinkUrl('');
      setLinkTitle('');
      setLinkDialogOpen(false);
    }
  };

  const handleRemove = (attachmentId: string) => {
    const updated = attachments.filter(a => a.id !== attachmentId);
    // If removing primary, make first remaining attachment primary
    const removed = attachments.find(a => a.id === attachmentId);
    if (removed?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    onAttachmentsChange(updated);
  };

  const handleSetPrimary = (attachmentId: string) => {
    if (onSetPrimary) {
      onSetPrimary(attachmentId);
    } else {
      const updated = attachments.map(a => ({
        ...a,
        isPrimary: a.id === attachmentId,
      }));
      onAttachmentsChange(updated);
    }
  };

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

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
        Attachments
      </Typography>

      {/* Add buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          Upload
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<LinkIcon />}
          onClick={() => setLinkDialogOpen(true)}
          disabled={disabled}
        >
          Link
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudQueueIcon />}
          disabled={true} // Drive integration not yet implemented
          sx={{ opacity: 0.5 }}
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

      {/* Attachments list */}
      {attachments.length > 0 && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
          <List dense>
            {attachments.map((attachment, index) => (
              <ListItem
                key={attachment.id}
                sx={{
                  borderBottom: index < attachments.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  py: 1,
                }}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    {attachment.type === 'FILE_UPLOAD' && (
                      <IconButton
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        title="Replace"
                      >
                        <CloudUploadIcon fontSize="small" />
                      </IconButton>
                    )}
                    {!attachment.isPrimary && (
                      <IconButton
                        size="small"
                        onClick={() => handleSetPrimary(attachment.id)}
                        disabled={disabled}
                        title="Set as primary"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleRemove(attachment.id)}
                      disabled={disabled}
                      title="Remove"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {attachment.type === 'FILE_UPLOAD' && <CloudUploadIcon fontSize="small" />}
                      {attachment.type === 'LINK' && <LinkIcon fontSize="small" />}
                      {attachment.type === 'DRIVE' && <CloudQueueIcon fontSize="small" />}
                      <Typography variant="body2" fontWeight={attachment.isPrimary ? 'bold' : 'normal'}>
                        {attachment.title || attachment.fileName || attachment.url || 'Untitled'}
                        {attachment.isPrimary && ' (Primary)'}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    attachment.type === 'FILE_UPLOAD' && attachment.fileSize
                      ? `${formatFileSize(attachment.fileSize)} • ${attachment.mimeType || 'Unknown type'}`
                      : attachment.type === 'LINK' && attachment.url
                      ? getDomainFromUrl(attachment.url)
                      : attachment.status === 'uploading'
                      ? 'Uploading...'
                      : attachment.status === 'failed'
                      ? `Failed: ${attachment.errorMessage || 'Unknown error'}`
                      : undefined
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Link dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              required
              fullWidth
              error={linkUrl.trim() !== '' && !linkUrl.startsWith('https://')}
              helperText={linkUrl.trim() !== '' && !linkUrl.startsWith('https://') ? 'Must be a valid https URL' : undefined}
            />
            <TextField
              label="Title (optional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Display name for this link"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddLink}
            variant="contained"
            disabled={!linkUrl.trim() || !linkUrl.startsWith('https://')}
          >
            Add Link
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

