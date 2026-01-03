/**
 * Prompt Helper Form Component
 * 
 * Form for creating/editing prompt helpers
 */

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type {
  PromptHelper,
  CreatePromptHelper,
  UpdatePromptHelper,
  PromptHelperAppliesTo,
  CompositionMode,
  RteActionType,
} from '@gravyty/domain';

export interface PromptHelperFormProps {
  helper?: PromptHelper;
  onSubmit: (data: CreatePromptHelper | UpdatePromptHelper) => void;
  onCancel?: () => void;
  errors?: Record<string, string>;
}

export function PromptHelperForm({ helper, onSubmit, onCancel, errors }: PromptHelperFormProps) {
  const [name, setName] = useState(helper?.name || '');
  const [description, setDescription] = useState(helper?.description || '');
  const [appliesTo, setAppliesTo] = useState<PromptHelperAppliesTo[]>(helper?.applies_to || []);
  const [compositionMode, setCompositionMode] = useState<CompositionMode>(helper?.composition_mode || 'template');
  const [prefixText, setPrefixText] = useState(helper?.prefix_text || '');
  const [templateText, setTemplateText] = useState(helper?.template_text || '');
  const [suffixText, setSuffixText] = useState(helper?.suffix_text || '');
  const [negativeText, setNegativeText] = useState(helper?.negative_text || '');
  const [allowedVariables, setAllowedVariables] = useState<string[]>(helper?.allowed_variables || []);
  
  // RTE Action Instructions
  const [rteInstructions, setRteInstructions] = useState<Record<string, string>>(
    helper?.rte_action_instructions || {}
  );
  
  // Provider Overrides
  const [openaiOverride, setOpenaiOverride] = useState(helper?.provider_overrides?.openai || '');
  const [geminiOverride, setGeminiOverride] = useState(helper?.provider_overrides?.gemini || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: CreatePromptHelper | UpdatePromptHelper = {
      name,
      description,
      applies_to: appliesTo,
      composition_mode: compositionMode,
      prefix_text: prefixText || undefined,
      template_text: templateText || undefined,
      suffix_text: suffixText || undefined,
      negative_text: negativeText || undefined,
      rte_action_instructions: appliesTo.includes('rte') && Object.keys(rteInstructions).length > 0
        ? rteInstructions
        : undefined,
      provider_overrides: (openaiOverride || geminiOverride)
        ? {
            openai: openaiOverride || undefined,
            gemini: geminiOverride || undefined,
          }
        : undefined,
      allowed_variables: allowedVariables,
    };
    
    onSubmit(formData);
  };

  const handleAppliesToChange = (value: PromptHelperAppliesTo) => {
    if (appliesTo.includes(value)) {
      setAppliesTo(appliesTo.filter(v => v !== value));
    } else {
      setAppliesTo([...appliesTo, value]);
    }
  };

  const handleRteInstructionChange = (action: RteActionType, value: string) => {
    setRteInstructions({ ...rteInstructions, [action]: value });
  };

  const availableVariables = [
    'course.title',
    'course.audience',
    'course.level',
    'course.duration',
    'course.objectives',
    'course.topics',
    'org.name',
    ...(appliesTo.includes('cover_image') ? ['cover.subject', 'cover.metaphor', 'cover.must_include', 'cover.avoid'] : []),
    ...(appliesTo.includes('rte') ? ['selection.text', 'doc.context', 'user.instruction', 'action.name'] : []),
  ];

  const handleVariableToggle = (variable: string) => {
    if (allowedVariables.includes(variable)) {
      setAllowedVariables(allowedVariables.filter(v => v !== variable));
    } else {
      setAllowedVariables([...allowedVariables, variable]);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          error={!!errors?.name}
          helperText={errors?.name}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          multiline
          rows={2}
          error={!!errors?.description}
          helperText={errors?.description}
        />

        <FormControl fullWidth error={!!errors?.applies_to}>
          <InputLabel>Applies To</InputLabel>
          <Select
            multiple
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as PromptHelperAppliesTo[])}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                {selected.map((value) => (
                  <Box
                    key={value}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 24,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      backgroundColor: 'transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value.replace('_', ' ')}
                  </Box>
                ))}
              </Box>
            )}
          >
            <MenuItem value="cover_image">Cover Image</MenuItem>
            <MenuItem value="description">Description</MenuItem>
            <MenuItem value="rte">RTE AI Assistant</MenuItem>
          </Select>
          <FormHelperText>{errors?.applies_to}</FormHelperText>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Composition Mode</InputLabel>
          <Select
            value={compositionMode}
            onChange={(e) => setCompositionMode(e.target.value as CompositionMode)}
            label="Composition Mode"
          >
            <MenuItem value="template">Template</MenuItem>
            <MenuItem value="style_pack">Style Pack</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
          </Select>
          <FormHelperText>
            Template: fills prompt input. Style Pack: hidden prefix/suffix. Hybrid: both.
          </FormHelperText>
        </FormControl>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Prompt Content</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label="Prefix (optional)"
                value={prefixText}
                onChange={(e) => setPrefixText(e.target.value)}
                fullWidth
                multiline
                rows={3}
                helperText="Text added before the template"
              />
              <TextField
                label="Template"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                fullWidth
                multiline
                rows={6}
                helperText="Main prompt template with variables (e.g., {{course.title}})"
              />
              <TextField
                label="Suffix (optional)"
                value={suffixText}
                onChange={(e) => setSuffixText(e.target.value)}
                fullWidth
                multiline
                rows={3}
                helperText="Text added after the template"
              />
              <TextField
                label="Negative Guidance (optional)"
                value={negativeText}
                onChange={(e) => setNegativeText(e.target.value)}
                fullWidth
                multiline
                rows={2}
                helperText="What to avoid (e.g., 'Avoid: photorealistic, 3D')"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {appliesTo.includes('rte') && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>RTE Action Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {(['shorten', 'expand', 'rewrite', 'tone_shift', 'summarize'] as RteActionType[]).map((action) => (
                  <TextField
                    key={action}
                    label={`${action.charAt(0).toUpperCase() + action.slice(1)} Instructions`}
                    value={rteInstructions[action] || ''}
                    onChange={(e) => handleRteInstructionChange(action, e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText={`Instructions for ${action} action`}
                  />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Provider Overrides (optional)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label="OpenAI Additions"
                value={openaiOverride}
                onChange={(e) => setOpenaiOverride(e.target.value)}
                fullWidth
                multiline
                rows={2}
                helperText="Additional text for OpenAI only"
              />
              <TextField
                label="Gemini Additions"
                value={geminiOverride}
                onChange={(e) => setGeminiOverride(e.target.value)}
                fullWidth
                multiline
                rows={2}
                helperText="Additional text for Gemini only"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Allowed Variables</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Select which variables this helper can use:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableVariables.map((variable) => (
                  <Chip
                    key={variable}
                    label={variable}
                    onClick={() => handleVariableToggle(variable)}
                    color={allowedVariables.includes(variable) ? 'primary' : 'default'}
                    variant={allowedVariables.includes(variable) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {allowedVariables.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No restrictions: helper can use any variable. Select variables to restrict usage.
                </Alert>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </form>
  );
}


