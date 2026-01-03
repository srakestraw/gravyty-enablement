/**
 * Add Links Panel Component
 * 
 * Inline panel for adding multiple links at once (paste one per line)
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';

export interface AddLinksPanelProps {
  onAddLinks: (urls: string[]) => void;
  onCancel: () => void;
}

export function AddLinksPanel({ onAddLinks, onCancel }: AddLinksPanelProps) {
  const [linkText, setLinkText] = useState('');
  const [errors, setErrors] = useState<Array<{ line: number; message: string }>>([]);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url.trim());
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAdd = () => {
    const lines = linkText.split('\n').map(line => line.trim()).filter(Boolean);
    const validUrls: string[] = [];
    const newErrors: Array<{ line: number; message: string }> = [];

    lines.forEach((line, index) => {
      if (validateUrl(line)) {
        validUrls.push(line);
      } else {
        newErrors.push({
          line: index + 1,
          message: 'Must be a valid https URL',
        });
      }
    });

    setErrors(newErrors);

    if (validUrls.length > 0) {
      onAddLinks(validUrls);
      setLinkText('');
      setErrors([]);
    }
  };

  const validUrls = linkText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(url => validateUrl(url));

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Typography variant="subtitle2" gutterBottom>
        Add links
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Paste one or more URLs (one per line).
      </Typography>
      
      <TextField
        fullWidth
        multiline
        rows={4}
        value={linkText}
        onChange={(e) => {
          setLinkText(e.target.value);
          setErrors([]);
        }}
        placeholder="https://example.com&#10;https://another-link.com&#10;https://third-link.com"
        sx={{ mb: 2 }}
      />

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.map((error, idx) => (
            <Typography key={idx} variant="caption" component="div">
              Line {error.line}: {error.message}
            </Typography>
          ))}
        </Alert>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel} size="small">
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          size="small"
          startIcon={<LinkIcon />}
          disabled={validUrls.length === 0}
        >
          Add {validUrls.length > 0 ? `${validUrls.length} link${validUrls.length > 1 ? 's' : ''}` : 'links'}
        </Button>
      </Stack>
    </Box>
  );
}

