/**
 * AI Generation Tab Component
 * 
 * Tab content for AI-powered image generation
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { downloadAndUploadImage } from './utils/imageUpload';
import type { MediaRef } from '@gravyty/domain';

export interface AIGenerationTabProps {
  entityTitle?: string;
  entityShortDescription?: string;
  entityDescription?: string;
  entityType?: 'course' | 'asset' | 'role-playing';
  mediaType: 'cover' | 'video' | 'poster' | 'attachment';
  courseId?: string;
  lessonId?: string;
  temporary?: boolean;
  onImageGenerated: (mediaRef: MediaRef) => void;
  onClose: () => void;
}

export function AIGenerationTab({
  entityTitle,
  entityShortDescription,
  entityDescription,
  entityType = 'course',
  mediaType,
  courseId,
  lessonId,
  temporary,
  onImageGenerated,
  onClose,
}: AIGenerationTabProps) {
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [prompt, setPrompt] = useState('');
  const [suggestingPrompt, setSuggestingPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestPrompt = async () => {
    if (!entityTitle) {
      setError('Title is required to suggest a prompt');
      return;
    }

    setSuggestingPrompt(true);
    setError(null);

    try {
      const response = await lmsAdminApi.suggestImagePrompt({
        title: entityTitle,
        short_description: entityShortDescription,
        description: entityDescription,
        entity_type: entityType,
      });

      if ('data' in response) {
        setPrompt(response.data.suggested_prompt);
      } else {
        setError(response.error?.message || 'Failed to suggest prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest prompt');
    } finally {
      setSuggestingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);
    setRevisedPrompt(null);

    try {
      const response = await lmsAdminApi.generateImage({
        prompt: prompt.trim(),
        provider,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });

      if ('data' in response) {
        setGeneratedImageUrl(response.data.image_url);
        if (response.data.revised_prompt) {
          setRevisedPrompt(response.data.revised_prompt);
        }
      } else {
        setError(response.error?.message || 'Failed to generate image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseAsCover = async () => {
    if (!generatedImageUrl) return;

    setUploading(true);
    setError(null);

    try {
      console.log('[AIGenerationTab] Starting image download and upload...', {
        imageUrl: generatedImageUrl,
        filename: `ai-generated-${Date.now()}.png`,
        mediaType,
        courseId,
        temporary,
      });

      const filename = `ai-generated-${Date.now()}.png`;
      // For temporary media, don't pass 'new' as courseId - pass undefined
      const effectiveCourseId = (courseId === 'new' || temporary) ? undefined : courseId;
      const mediaRef = await downloadAndUploadImage(
        generatedImageUrl,
        filename,
        mediaType,
        effectiveCourseId,
        lessonId,
        temporary,
        true // Crop to 16:9
      );

      console.log('[AIGenerationTab] Image uploaded successfully:', mediaRef);

      // Close modal on success
      onImageGenerated(mediaRef);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      console.error('[AIGenerationTab] Error uploading image:', err);
      
      // Provide more helpful error messages
      let displayMessage = errorMessage;
      if (errorMessage.includes('Access Denied') || errorMessage.includes('ACCESS_DENIED')) {
        displayMessage = 'Access denied. Please check your permissions and try again.';
      } else if (errorMessage.includes('S3') || errorMessage.includes('S3_ERROR')) {
        displayMessage = 'Failed to upload to storage. Please try again.';
      } else if (errorMessage.includes('NOT_FOUND')) {
        displayMessage = 'Upload session expired. Please generate a new image and try again.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        displayMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(displayMessage);
      // Keep modal open on error so user can see the error and try again
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Provider Selector */}
        <FormControl fullWidth>
          <InputLabel>AI Provider</InputLabel>
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini')}
            label="AI Provider"
          >
            <MenuItem value="openai">OpenAI (DALL-E 3)</MenuItem>
            <MenuItem value="gemini">Google Gemini</MenuItem>
          </Select>
        </FormControl>

        {/* Prompt Input */}
        <TextField
          label="Image Prompt"
          multiline
          rows={6}
          fullWidth
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          helperText="Enter a detailed description of the image you want to generate"
        />

        {/* Suggest Prompt Button */}
        {entityTitle && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleSuggestPrompt}
            disabled={suggestingPrompt}
          >
            {suggestingPrompt ? 'Suggesting...' : 'Suggest Prompt from Details'}
          </Button>
        )}

        {/* Generate Button */}
        <Button
          variant="contained"
          onClick={handleGenerateImage}
          disabled={!prompt.trim() || generating}
          startIcon={generating ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          {generating ? 'Generating...' : 'Generate Image'}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Revised Prompt Display */}
        {revisedPrompt && (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Revised Prompt (by AI):
            </Typography>
            <Typography variant="body2">{revisedPrompt}</Typography>
          </Alert>
        )}

        {/* Generated Image Preview */}
        {generatedImageUrl && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Generated Image Preview
            </Typography>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: 800,
                aspectRatio: '16/9',
                mb: 2,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'grey.200',
              }}
            >
              <img
                src={generatedImageUrl}
                alt="Generated"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleUseAsCover}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              {uploading ? 'Uploading...' : 'Use as Cover Image'}
            </Button>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

