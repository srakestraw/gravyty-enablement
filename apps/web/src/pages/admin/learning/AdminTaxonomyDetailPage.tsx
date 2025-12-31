/**
 * Admin Taxonomy Detail Page
 * 
 * Detail page for managing options within a specific taxonomy key
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
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
  Breadcrumbs,
  Link,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { useTaxonomyOptions } from '../../../hooks/useTaxonomyOptions';
import { taxonomyApi } from '../../../api/taxonomyClient';
import type { TaxonomyGroupKey, TaxonomyOption } from '@gravyty/domain';
import { track } from '../../../lib/telemetry';

const TAXONOMY_KEY_LABELS: Record<TaxonomyGroupKey, string> = {
  product: 'Product',
  product_suite: 'Product Suite',
  topic_tag: 'Topic Tags',
};

type SortOption = 'default' | 'alphabetical';

export function AdminTaxonomyDetailPage() {
  const { key } = useParams<{ key: TaxonomyGroupKey }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; optionId: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<{
    used_by_courses: number;
    used_by_resources: number;
    sample_course_ids?: string[];
    sample_resource_ids?: string[];
  } | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!key || !['product', 'product_suite', 'topic_tag'].includes(key)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid taxonomy key</Alert>
      </Box>
    );
  }

  const { options, loading, error, refetch, setOptions } = useTaxonomyOptions(key, {
    include_archived: true,
  });

  // Track page view
  useEffect(() => {
    track('lms_taxonomy_options_viewed', { key });
  }, [key]);

  // Filter and sort options
  const filteredOptions = useMemo(() => {
    let filtered = options;

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        opt.slug.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by archived status
    if (!showArchived) {
      filtered = filtered.filter((opt) => !opt.archived_at);
    }

    // Sort
    if (sortBy === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.label.localeCompare(b.label));
    } else {
      // Default: sort by sort_order, then label
      filtered = [...filtered].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.label.localeCompare(b.label);
      });
    }

    return filtered;
  }, [options, searchQuery, showArchived, sortBy]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;

    // Check for duplicate labels (case-insensitive)
    const duplicate = options.find(
      (opt) => opt.label.toLowerCase() === newLabel.trim().toLowerCase() && !opt.archived_at
    );
    if (duplicate) {
      alert('An option with this label already exists');
      return;
    }

    setCreating(true);
    try {
      const response = await taxonomyApi.createOption(key, {
        label: newLabel.trim(),
      });

      if ('error' in response) {
        alert(`Failed to create option: ${response.error.message}`);
        return;
      }

      track('lms_taxonomy_option_created', { key, option_id: response.data.option.option_id });
      setNewLabel('');
      setCreateDialogOpen(false);
      refetch();
    } catch (err) {
      console.error('Error creating option:', err);
      alert('Failed to create option');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (option: TaxonomyOption) => {
    setEditingId(option.option_id);
    setEditingLabel(option.label);
  };

  const handleSaveEdit = async (optionId: string) => {
    if (!editingLabel.trim()) return;

    // Check for duplicate labels (case-insensitive, excluding current option)
    const duplicate = options.find(
      (opt) =>
        opt.option_id !== optionId &&
        opt.label.toLowerCase() === editingLabel.trim().toLowerCase() &&
        !opt.archived_at
    );
    if (duplicate) {
      alert('An option with this label already exists');
      return;
    }

    setSaving(optionId);
    try {
      const response = await taxonomyApi.updateOption(optionId, {
        label: editingLabel.trim(),
      });

      if ('error' in response) {
        alert(`Failed to update option: ${response.error.message}`);
        return;
      }

      track('lms_taxonomy_option_renamed', { key, option_id: optionId });
      setEditingId(null);
      setEditingLabel('');
      refetch();
    } catch (err) {
      console.error('Error updating option:', err);
      alert('Failed to update option');
    } finally {
      setSaving(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingLabel('');
  };

  const handleArchive = async (optionId: string) => {
    setSaving(optionId);
    try {
      const response = await taxonomyApi.updateOption(optionId, {
        archived_at: new Date().toISOString(),
      });

      if ('error' in response) {
        alert(`Failed to archive option: ${response.error.message}`);
        return;
      }

      track('lms_taxonomy_option_archived', { key, option_id: optionId });
      refetch();
    } catch (err) {
      console.error('Error archiving option:', err);
      alert('Failed to archive option');
    } finally {
      setSaving(null);
    }
  };

  const handleRestore = async (optionId: string) => {
    setSaving(optionId);
    try {
      // Send empty string to unarchive - backend converts falsy values to null
      const response = await taxonomyApi.updateOption(optionId, {
        archived_at: '' as any,
      });

      if ('error' in response) {
        alert(`Failed to restore option: ${response.error.message}`);
        return;
      }

      track('lms_taxonomy_option_restored', { key, option_id: optionId });
      refetch();
    } catch (err) {
      console.error('Error restoring option:', err);
      alert('Failed to restore option');
    } finally {
      setSaving(null);
    }
  };

  const handleMove = async (optionId: string, direction: 'up' | 'down') => {
    const currentIndex = filteredOptions.findIndex((opt) => opt.option_id === optionId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredOptions.length) return;

    const currentOption = filteredOptions[currentIndex];
    const targetOption = filteredOptions[targetIndex];

    // Swap sort_order values
    const tempOrder = currentOption.sort_order;
    const newOrder = targetOption.sort_order;

    setSaving(optionId);
    try {
      // Update both options
      await Promise.all([
        taxonomyApi.updateOption(optionId, { sort_order: newOrder }),
        taxonomyApi.updateOption(targetOption.option_id, { sort_order: tempOrder }),
      ]);

      track('lms_taxonomy_option_reordered', { key });
      refetch();
    } catch (err) {
      console.error('Error reordering option:', err);
      alert('Failed to reorder option');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const displayLabel = TAXONOMY_KEY_LABELS[key];

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/enablement/admin/learning')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          Learning Admin
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/enablement/admin/learning/taxonomy')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          Taxonomy
        </Link>
        <Typography color="text.primary">{displayLabel}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{displayLabel}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add option
        </Button>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search options..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <FormControlLabel
          control={
            <Switch checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          }
          label="Show archived"
        />
        <TextField
          select
          label="Sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          size="small"
          SelectProps={{ native: true }}
          sx={{ minWidth: 150 }}
        >
          <option value="default">Default order</option>
          <option value="alphabetical">A-Z</option>
        </TextField>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>Order</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  {searchQuery ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No matches for &quot;{searchQuery}&quot;
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setNewLabel(searchQuery);
                          setCreateDialogOpen(true);
                        }}
                      >
                        Add &quot;{searchQuery}&quot;
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No options yet
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        Add option
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredOptions.map((option, index) => {
                const isEditing = editingId === option.option_id;
                const isArchived = !!option.archived_at;
                const isSaving = saving === option.option_id;

                return (
                  <TableRow key={option.option_id}>
                    <TableCell>
                      {sortBy === 'default' && !searchQuery && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            disabled={index === 0 || isSaving}
                            onClick={() => handleMove(option.option_id, 'up')}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={index === filteredOptions.length - 1 || isSaving}
                            onClick={() => handleMove(option.option_id, 'down')}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(option.option_id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          size="small"
                          disabled={isSaving}
                          sx={{ minWidth: 200 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          onClick={() => handleStartEdit(option)}
                        >
                          {option.label}
                          <EditIcon fontSize="small" sx={{ opacity: 0.5 }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isArchived ? 'Archived' : 'Active'}
                        color={isArchived ? 'default' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            onClick={() => handleSaveEdit(option.option_id)}
                            disabled={isSaving}
                          >
                            Save
                          </Button>
                          <Button size="small" onClick={handleCancelEdit} disabled={isSaving}>
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchor({ element: e.currentTarget, optionId: option.option_id })}
                          disabled={isSaving}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        {menuAnchor && (
          <>
            {filteredOptions.find((opt) => opt.option_id === menuAnchor.optionId)?.archived_at ? (
              <MenuItem
                onClick={() => {
                  handleRestore(menuAnchor.optionId);
                  setMenuAnchor(null);
                }}
              >
                <UnarchiveIcon fontSize="small" sx={{ mr: 1 }} />
                Restore
              </MenuItem>
            ) : (
              <>
                <MenuItem
                  onClick={() => {
                    const option = filteredOptions.find((opt) => opt.option_id === menuAnchor.optionId);
                    if (option) {
                      handleStartEdit(option);
                    }
                    setMenuAnchor(null);
                  }}
                >
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Rename
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleArchive(menuAnchor.optionId);
                    setMenuAnchor(null);
                  }}
                >
                  <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
                  Archive
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    setCheckingUsage(true);
                    try {
                      const response = await taxonomyApi.getUsage(key, menuAnchor.optionId);
                      if ('error' in response) {
                        alert(`Failed to check usage: ${response.error.message}`);
                        return;
                      }
                      setDeleteUsage(response.data);
                      setDeleteDialogOpen(menuAnchor.optionId);
                    } catch (err) {
                      console.error('Error checking usage:', err);
                      alert('Failed to check usage');
                    } finally {
                      setCheckingUsage(false);
                      setMenuAnchor(null);
                    }
                  }}
                  disabled={checkingUsage}
                >
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(null);
          setDeleteUsage(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Option</DialogTitle>
        <DialogContent>
          {deleteUsage && deleteUsage.used_by_courses + deleteUsage.used_by_resources > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This option is currently in use and cannot be deleted.
              </Alert>
              <Typography variant="body2" gutterBottom>
                <strong>Usage:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Used by {deleteUsage.used_by_courses} course(s)
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • Used by {deleteUsage.used_by_resources} resource(s)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                To delete this option, you must first:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                <li>Archive the option instead (keeps references intact)</li>
                <li>Or migrate all references to another option</li>
              </Typography>
            </>
          ) : (
            <Typography variant="body2">
              Are you sure you want to delete this option? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(null);
              setDeleteUsage(null);
            }}
            disabled={deleting}
          >
            {deleteUsage && deleteUsage.used_by_courses + deleteUsage.used_by_resources > 0
              ? 'Close'
              : 'Cancel'}
          </Button>
          {deleteUsage && deleteUsage.used_by_courses + deleteUsage.used_by_resources === 0 && (
            <Button
              onClick={async () => {
                if (!deleteDialogOpen) return;
                setDeleting(true);
                try {
                  const response = await taxonomyApi.deleteOption(key, deleteDialogOpen);
                  if ('error' in response) {
                    alert(`Failed to delete option: ${response.error.message}`);
                    return;
                  }
                  track('lms_taxonomy_option_deleted', { key, option_id: deleteDialogOpen });
                  setDeleteDialogOpen(null);
                  setDeleteUsage(null);
                  refetch();
                } catch (err) {
                  console.error('Error deleting option:', err);
                  alert('Failed to delete option');
                } finally {
                  setDeleting(false);
                }
              }}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          {deleteUsage && deleteUsage.used_by_courses + deleteUsage.used_by_resources > 0 && (
            <Button
              onClick={async () => {
                if (!deleteDialogOpen) return;
                handleArchive(deleteDialogOpen);
                setDeleteDialogOpen(null);
                setDeleteUsage(null);
              }}
              variant="contained"
            >
              Archive Instead
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Option</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Label"
            fullWidth
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !creating) {
                handleCreate();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newLabel.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

