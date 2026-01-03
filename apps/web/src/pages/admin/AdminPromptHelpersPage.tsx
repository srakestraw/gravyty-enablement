/**
 * Admin Prompt Helpers Page
 * 
 * Manage AI prompt helpers: list, create, edit, publish, archive, set defaults
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as DuplicateIcon,
  Archive as ArchiveIcon,
  Star as StarIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { promptHelpersApi } from '../../api/promptHelpersClient';
import { isErrorResponse } from '../../lib/apiClient';
import type { PromptHelper, PromptHelperStatus, PromptHelperAppliesTo } from '@gravyty/domain';

export function AdminPromptHelpersPage() {
  const navigate = useNavigate();
  const [helpers, setHelpers] = useState<PromptHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; helper: PromptHelper } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteHelper, setDeleteHelper] = useState<PromptHelper | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<PromptHelperStatus | 'all'>('all');
  const [appliesToFilter, setAppliesToFilter] = useState<PromptHelperAppliesTo | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<'openai' | 'gemini' | 'both' | 'all'>('all');

  const loadHelpers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await promptHelpersApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        applies_to: appliesToFilter !== 'all' ? appliesToFilter : undefined,
        provider_support: providerFilter !== 'all' ? providerFilter : undefined,
      });
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        setHelpers(response.data.helpers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt helpers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHelpers();
  }, [statusFilter, appliesToFilter, providerFilter]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, helper: PromptHelper) => {
    setMenuAnchor({ el: event.currentTarget, helper });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDuplicate = async (helper: PromptHelper) => {
    handleMenuClose();
    try {
      const duplicateData = {
        name: `${helper.name} (Copy)`,
        description: helper.description,
        applies_to: helper.applies_to,
        composition_mode: helper.composition_mode,
        prefix_text: helper.prefix_text,
        template_text: helper.template_text,
        suffix_text: helper.suffix_text,
        negative_text: helper.negative_text,
        rte_action_instructions: helper.rte_action_instructions,
        provider_overrides: helper.provider_overrides,
        allowed_variables: helper.allowed_variables,
        is_default_for: [],
        is_system: false,
      };
      
      const response = await promptHelpersApi.create(duplicateData);
      if (isErrorResponse(response)) {
        alert(response.error.message);
      } else {
        loadHelpers();
      }
    } catch (err) {
      alert('Failed to duplicate helper');
    }
  };

  const handleArchive = async (helper: PromptHelper) => {
    handleMenuClose();
    if (!confirm(`Archive "${helper.name}"?`)) return;
    
    try {
      const response = await promptHelpersApi.archive(helper.helper_id);
      if (isErrorResponse(response)) {
        alert(response.error.message);
      } else {
        loadHelpers();
      }
    } catch (err) {
      alert('Failed to archive helper');
    }
  };

  const handleSetDefault = async (helper: PromptHelper) => {
    handleMenuClose();
    // For now, set as default for all contexts it applies to
    const contexts: any[] = [];
    if (helper.applies_to.includes('cover_image')) {
      contexts.push('cover_image');
    }
    if (helper.applies_to.includes('description')) {
      contexts.push('description');
    }
    if (helper.applies_to.includes('rte')) {
      contexts.push('rte_shorten', 'rte_expand', 'rte_rewrite');
    }
    
    try {
      const response = await promptHelpersApi.setDefault(helper.helper_id, contexts);
      if (isErrorResponse(response)) {
        alert(response.error.message);
      } else {
        loadHelpers();
      }
    } catch (err) {
      alert('Failed to set default');
    }
  };

  const getAppliesToBadges = (appliesTo: PromptHelperAppliesTo[]) => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {appliesTo.map(ctx => (
          <Chip 
            key={ctx} 
            label={ctx.replace('_', ' ')} 
            size="small" 
            variant="outlined"
            sx={{ 
              height: 'auto',
              '& .MuiChip-label': {
                padding: '4px 8px',
                whiteSpace: 'nowrap',
              }
            }} 
          />
        ))}
      </Box>
    );
  };

  const getDefaultBadge = (defaults: string[]) => {
    if (defaults.length === 0) return null;
    // Format: "Default - cover image" or "Default - cover image, description"
    const labels = defaults.map(ctx => ctx.replace('_', ' '));
    const label = labels.length === 1 
      ? `Default - ${labels[0]}`
      : `Default - ${labels.join(', ')}`;
    return (
      <Chip 
        label={label} 
        size="small" 
        color="primary" 
        sx={{ ml: 1 }}
      />
    );
  };

  const handleDeleteClick = (helper: PromptHelper) => {
    handleMenuClose();
    setDeleteHelper(helper);
    setDeleteConfirmationText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteHelper(null);
    setDeleteConfirmationText('');
  };

  const handleDelete = async () => {
    if (!deleteHelper) return;
    
    const isDeleteConfirmed = deleteConfirmationText === deleteHelper.name;
    if (!isDeleteConfirmed) return;

    setDeleting(true);
    try {
      const response = await promptHelpersApi.delete(deleteHelper.helper_id);
      if (isErrorResponse(response)) {
        // Handle 409 Conflict with helpful message
        if (response.error.code === 'CONFLICT') {
          alert(response.error.message);
        } else {
          alert(response.error.message);
        }
      } else {
        handleDeleteDialogClose();
        // Show success message
        alert('Helper deleted');
        // Refresh list
        loadHelpers();
      }
    } catch (err) {
      alert('Failed to delete helper');
    } finally {
      setDeleting(false);
    }
  };

  const handleRowClick = (helper: PromptHelper, event: React.MouseEvent) => {
    // Don't navigate if clicking on the kebab menu
    const target = event.target as HTMLElement;
    if (target.closest('button[aria-label*="more"]') || target.closest('.MuiIconButton-root')) {
      return;
    }
    navigate(`/enablement/admin/prompt-helpers/${helper.helper_id}`);
  };

  const getProviderSupport = (helper: PromptHelper): string => {
    if (!helper.provider_overrides) return 'Both';
    if (helper.provider_overrides.openai && helper.provider_overrides.gemini) return 'Both';
    if (helper.provider_overrides.openai) return 'OpenAI';
    if (helper.provider_overrides.gemini) return 'Gemini';
    return 'Both';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">AI Prompt Helpers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/enablement/admin/prompt-helpers/new')}
        >
          Create Helper
        </Button>
      </Box>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Applies To</InputLabel>
          <Select
            value={appliesToFilter}
            label="Applies To"
            onChange={(e) => setAppliesToFilter(e.target.value as any)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="cover_image">Cover Image</MenuItem>
            <MenuItem value="description">Description</MenuItem>
            <MenuItem value="rte">RTE</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Provider</InputLabel>
          <Select
            value={providerFilter}
            label="Provider"
            onChange={(e) => setProviderFilter(e.target.value as any)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="openai">OpenAI</MenuItem>
            <MenuItem value="gemini">Gemini</MenuItem>
            <MenuItem value="both">Both</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Applies To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Provider Support</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {helpers.length > 0 ? (
              helpers.map((helper) => (
                <TableRow 
                  key={helper.helper_id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={(e) => handleRowClick(helper, e)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {helper.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {helper.description}
                        </Typography>
                      </Box>
                      {getDefaultBadge(helper.is_default_for)}
                    </Box>
                  </TableCell>
                  <TableCell>{getAppliesToBadges(helper.applies_to)}</TableCell>
                  <TableCell>
                    <Chip
                      label={helper.status}
                      color={
                        helper.status === 'published' ? 'success' :
                        helper.status === 'archived' ? 'default' : 'warning'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getProviderSupport(helper)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(helper.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, helper)}
                      aria-label="more actions"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No prompt helpers found. Create your first helper to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          navigate(`/enablement/admin/prompt-helpers/${menuAnchor?.helper.helper_id}`);
        }}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          navigate(`/enablement/admin/prompt-helpers/${menuAnchor?.helper.helper_id}/versions`);
        }}>
          <HistoryIcon sx={{ mr: 1 }} fontSize="small" />
          View Versions
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDuplicate(menuAnchor.helper)}>
          <DuplicateIcon sx={{ mr: 1 }} fontSize="small" />
          Duplicate
        </MenuItem>
        {menuAnchor?.helper.status === 'published' && (
          <MenuItem onClick={() => menuAnchor && handleSetDefault(menuAnchor.helper)}>
            <StarIcon sx={{ mr: 1 }} fontSize="small" />
            Set Default
          </MenuItem>
        )}
        {menuAnchor?.helper.status !== 'archived' && (
          <MenuItem onClick={() => menuAnchor && handleArchive(menuAnchor.helper)}>
            <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />
            Archive
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => menuAnchor && handleDeleteClick(menuAnchor.helper)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete helper?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete "{deleteHelper?.name || 'this helper'}"? This cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            To confirm, please type the helper name: <strong>{deleteHelper?.name || ''}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Helper Name"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            error={deleteConfirmationText !== '' && deleteConfirmationText !== deleteHelper?.name}
            helperText={
              deleteConfirmationText !== '' && deleteConfirmationText !== deleteHelper?.name
                ? 'Name does not match'
                : ''
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirmationText === deleteHelper?.name && !deleting) {
                handleDelete();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteConfirmationText !== deleteHelper?.name || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

