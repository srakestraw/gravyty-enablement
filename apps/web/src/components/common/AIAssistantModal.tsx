/**
 * AI Assistant Modal Component
 * 
 * Modal for AI-powered text generation and refinement in rich text editors
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { lmsAdminApi } from '../../api/lmsAdminClient';
import { isErrorResponse } from '../../lib/apiClient';

export interface AIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (content: string) => void;
  context?: string; // e.g., "course description", "lesson content"
  existingContent?: string; // Current editor content
}

export function AIAssistantModal({
  open,
  onClose,
  onApply,
  context,
  existingContent,
}: AIAssistantModalProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'generate' | 'shorten' | 'longer' | null>(null);

  const handleClose = () => {
    setPrompt('');
    setResponse(null);
    setError(null);
    setActionType(null);
    onClose();
  };

  const handleGenerate = async (modifyType?: 'shorten' | 'longer') => {
    if (!modifyType && !prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (modifyType && !response && !existingContent) {
      setError('No content available to modify');
      return;
    }

    setLoading(true);
    setError(null);
    setActionType(modifyType || 'generate');

    try {
      let finalPrompt = prompt.trim();
      
      // Modify prompt for shorten/longer operations
      if (modifyType === 'shorten') {
        const contentToModify = response || existingContent || '';
        finalPrompt = `Make the following text shorter while preserving key information:\n\n${contentToModify}`;
      } else if (modifyType === 'longer') {
        const contentToModify = response || existingContent || '';
        finalPrompt = `Expand the following text with more detail and examples:\n\n${contentToModify}`;
      }

      const apiResponse = await lmsAdminApi.chatCompletion({
        prompt: finalPrompt,
        context: context,
        existing_content: modifyType && response ? response : existingContent,
      });

      if (isErrorResponse(apiResponse)) {
        setError(apiResponse.error?.message || 'Failed to generate content');
      } else {
        setResponse(apiResponse.data.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (prompt.trim()) {
      handleGenerate();
    }
  };

  const handleShorten = () => {
    if (response || existingContent) {
      handleGenerate('shorten');
    }
  };

  const handleLonger = () => {
    if (response || existingContent) {
      handleGenerate('longer');
    }
  };

  const handleApply = () => {
    if (response) {
      onApply(response);
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">AI Assistant</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* Prompt Input */}
          <TextField
            label="Enter your prompt"
            placeholder="e.g., Write a course description about..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            multiline
            rows={3}
            fullWidth
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading && prompt.trim()) {
                handleGenerate();
              }
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              startIcon={loading && actionType === 'generate' ? <CircularProgress size={16} /> : undefined}
            >
              Generate
            </Button>
            {response && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleRefresh}
                  disabled={loading || !prompt.trim()}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleShorten}
                  disabled={loading || actionType === 'shorten'}
                  startIcon={loading && actionType === 'shorten' ? <CircularProgress size={16} /> : undefined}
                >
                  Shorten
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleLonger}
                  disabled={loading || actionType === 'longer'}
                  startIcon={loading && actionType === 'longer' ? <CircularProgress size={16} /> : undefined}
                >
                  Longer
                </Button>
              </>
            )}
            {!response && existingContent && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => handleGenerate('shorten')}
                  disabled={loading || actionType === 'shorten'}
                  startIcon={loading && actionType === 'shorten' ? <CircularProgress size={16} /> : undefined}
                >
                  Shorten Existing
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleGenerate('longer')}
                  disabled={loading || actionType === 'longer'}
                  startIcon={loading && actionType === 'longer' ? <CircularProgress size={16} /> : undefined}
                >
                  Expand Existing
                </Button>
              </>
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Response Display */}
          {response && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'background.default',
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              <Typography
                variant="body1"
                component="div"
                sx={{
                  whiteSpace: 'pre-wrap',
                }}
              >
                {response}
              </Typography>
            </Paper>
          )}

          {/* Loading State */}
          {loading && !response && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!response}
          startIcon={<CheckCircleIcon />}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

