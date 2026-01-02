/**
 * Admin Metadata Detail Page
 * 
 * Detail page for managing options within a specific metadata key
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
  Autocomplete,
  Select,
  FormControl,
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
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import { metadataApi } from '../../../api/metadataClient';
import type { MetadataGroupKey, MetadataOption } from '@gravyty/domain';
import { track } from '../../../lib/telemetry';

const METADATA_KEY_LABELS: Record<MetadataGroupKey, string> = {
  product: 'Product',
  product_suite: 'Product Suite',
  topic_tag: 'Topic Tags',
  badge: 'Badges',
  audience: 'Audience',
};

type SortOption = 'default' | 'alphabetical';

export function AdminMetadataDetailPage() {
  const { key } = useParams<{ key: MetadataGroupKey }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<string | null | undefined>(undefined);
  const [editingCustomColor, setEditingCustomColor] = useState<string>('#000000');
  const [showEditingColorPicker, setShowEditingColorPicker] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; optionId: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newColor, setNewColor] = useState<string | undefined>(undefined);
  const [newCustomColor, setNewCustomColor] = useState<string>('#000000');
  const [showNewColorPicker, setShowNewColorPicker] = useState(false);
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
  const [colorMenuAnchor, setColorMenuAnchor] = useState<{ element: HTMLElement; optionId: string } | null>(null);
  const [menuCustomColor, setMenuCustomColor] = useState<string>('#000000');
  const [showMenuColorPicker, setShowMenuColorPicker] = useState(false);

  const COLOR_PALETTE = [
    '#092362', // dark blue
    '#1976d2', // blue
    '#388e3c', // green
    '#f57c00', // orange
    '#d32f2f', // red
    '#7b1fa2', // purple
    '#0288d1', // light blue
    '#c2185b', // pink
    '#5d4037', // brown
    '#00838F', // teal
  ];

  // Helper to check if a color is in the palette
  const isPaletteColor = (color: string | undefined): boolean => {
    if (!color) return false;
    return COLOR_PALETTE.includes(color);
  };

  // Helper to validate hex color
  const isValidHexColor = (hex: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(hex);
  };

  if (!key || !['product', 'product_suite', 'topic_tag', 'badge', 'audience'].includes(key)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid metadata key</Alert>
      </Box>
    );
  }

  const { options, loading, error, refetch, setOptions } = useMetadataOptions(key, {
    include_archived: true,
  });

  // Fetch Product Suites when viewing Products
  const { options: productSuites } = useMetadataOptions('product_suite', {
    include_archived: false,
  });

  // Track page view
  useEffect(() => {
    track('lms_metadata_options_viewed', { key });
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
      const response = await metadataApi.createOption(key, {
        label: newLabel.trim(),
        parent_id: key === 'product' ? (newParentId || undefined) : undefined,
        color: newColor,
      });

      if ('error' in response) {
        alert(`Failed to create option: ${response.error.message}`);
        return;
      }

      track('lms_metadata_option_created', { key, option_id: response.data.option.option_id });
      setNewLabel('');
      setNewParentId(null);
      setNewColor(undefined);
      setNewCustomColor('#000000');
      setShowNewColorPicker(false);
      setCreateDialogOpen(false);
      refetch();
    } catch (err) {
      console.error('Error creating option:', err);
      alert('Failed to create option');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (option: MetadataOption) => {
    setEditingId(option.option_id);
    setEditingLabel(option.label);
    setEditingParentId(option.parent_id || null);
    // Use null to represent "no color", undefined means "don't update"
    setEditingColor(option.color ?? null);
    setEditingCustomColor(option.color && !isPaletteColor(option.color) ? option.color : '#000000');
    setShowEditingColorPicker(false);
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
      const updates: any = {
        label: editingLabel.trim(),
        color: editingColor, // null to clear, string to set
      };
      if (key === 'product') {
        updates.parent_id = editingParentId || null;
      }
      const response = await metadataApi.updateOption(optionId, updates);

      if ('error' in response) {
        alert(`Failed to update option: ${response.error.message}`);
        return;
      }

      track('lms_metadata_option_renamed', { key, option_id: optionId });
      setEditingId(null);
      setEditingLabel('');
      setEditingParentId(null);
      setEditingColor(undefined);
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
    setEditingParentId(null);
    setEditingColor(undefined); // Reset to undefined (not editing)
    setEditingCustomColor('#000000');
    setShowEditingColorPicker(false);
  };

  const handleArchive = async (optionId: string) => {
    setSaving(optionId);
    try {
      const response = await metadataApi.updateOption(optionId, {
        archived_at: new Date().toISOString(),
      });

      if ('error' in response) {
        alert(`Failed to archive option: ${response.error.message}`);
        return;
      }

      track('lms_metadata_option_archived', { key, option_id: optionId });
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
      const response = await metadataApi.updateOption(optionId, {
        archived_at: '' as any,
      });

      if ('error' in response) {
        alert(`Failed to restore option: ${response.error.message}`);
        return;
      }

      track('lms_metadata_option_restored', { key, option_id: optionId });
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
        metadataApi.updateOption(optionId, { sort_order: newOrder }),
        metadataApi.updateOption(targetOption.option_id, { sort_order: tempOrder }),
      ]);

      track('lms_metadata_option_reordered', { key });
      refetch();
    } catch (err) {
      console.error('Error reordering option:', err);
      alert('Failed to reorder option');
    } finally {
      setSaving(null);
    }
  };

  const handleColorChange = async (optionId: string, color: string | undefined) => {
    setSaving(optionId);
    setColorMenuAnchor(null);
    try {
      const response = await metadataApi.updateOption(optionId, { color });

      if ('error' in response) {
        alert(`Failed to update color: ${response.error.message}`);
        return;
      }

      track('lms_metadata_option_color_changed', { key, option_id: optionId });
      refetch();
    } catch (err) {
      console.error('Error updating color:', err);
      alert('Failed to update color');
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

  const displayLabel = METADATA_KEY_LABELS[key];

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
          onClick={() => navigate('/enablement/admin/metadata')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          Metadata
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
              {key === 'product' && <TableCell>Product Suite</TableCell>}
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={key === 'product' ? 5 : 4} align="center" sx={{ py: 4 }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            sx={{ minWidth: 200, flex: 1 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={editingColor === null ? '' : (editingColor && !isPaletteColor(editingColor) ? 'custom' : (editingColor || ''))}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setShowEditingColorPicker(true);
                                  if (!editingColor || editingColor === null || isPaletteColor(editingColor)) {
                                    setEditingColor(editingCustomColor);
                                  }
                                } else {
                                  setShowEditingColorPicker(false);
                                  // Empty string means "no color" -> set to null
                                  setEditingColor(e.target.value === '' ? null : (e.target.value || null));
                                }
                              }}
                              disabled={isSaving}
                              renderValue={(value) => {
                                const displayColor = value === 'custom' ? (editingColor && editingColor !== null && !isPaletteColor(editingColor) ? editingColor : null) : (value || null);
                                if (!displayColor || displayColor === '') {
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Box sx={{ width: 14, height: 14, border: 1, borderColor: 'divider' }} />
                                      <Typography variant="body2">No color</Typography>
                                    </Box>
                                  );
                                }
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box
                                      sx={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        bgcolor: displayColor,
                                      }}
                                    />
                                    <Typography variant="body2">{displayColor}</Typography>
                                  </Box>
                                );
                              }}
                            >
                              <MenuItem value="">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider' }} />
                                  <Typography>No color</Typography>
                                </Box>
                              </MenuItem>
                              {COLOR_PALETTE.map((color) => (
                                <MenuItem key={color} value={color}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        bgcolor: color,
                                      }}
                                    />
                                    <Typography>{color}</Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                              <MenuItem value="custom">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider', borderRadius: '50%' }} />
                                  <Typography>Custom...</Typography>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                          {showEditingColorPicker && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <input
                                type="color"
                                value={editingColor && editingColor !== null && !isPaletteColor(editingColor) ? editingColor : editingCustomColor}
                                onChange={(e) => {
                                  const hex = e.target.value.toUpperCase();
                                  setEditingColor(hex);
                                  setEditingCustomColor(hex);
                                }}
                                style={{
                                  width: 40,
                                  height: 32,
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                                disabled={isSaving}
                              />
                              <TextField
                                size="small"
                                value={editingColor && editingColor !== null && !isPaletteColor(editingColor) ? editingColor : editingCustomColor}
                                onChange={(e) => {
                                  const hex = e.target.value.toUpperCase();
                                  if (hex.startsWith('#') && hex.length <= 7) {
                                    setEditingCustomColor(hex);
                                    if (hex.length === 7 && isValidHexColor(hex)) {
                                      setEditingColor(hex);
                                    }
                                  }
                                }}
                                placeholder="#000000"
                                disabled={isSaving}
                                sx={{ width: 90 }}
                                inputProps={{
                                  maxLength: 7,
                                  pattern: '#[0-9A-Fa-f]{6}',
                                }}
                              />
                            </Box>
                          )}
                        </Box>
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
                          {option.color && (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: option.color,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {option.label}
                        </Box>
                      )}
                    </TableCell>
                    {key === 'product' && (
                      <TableCell>
                        {isEditing ? (
                          <Autocomplete
                            size="small"
                            options={productSuites}
                            getOptionLabel={(option) => option.label}
                            value={productSuites.find((ps) => ps.option_id === editingParentId) || null}
                            onChange={(_, newValue) => {
                              setEditingParentId(newValue?.option_id || null);
                            }}
                            renderOption={(props, suite) => (
                              <Box component="li" {...props}>
                                {suite.color && (
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: suite.color,
                                      display: 'inline-block',
                                      mr: 1,
                                      verticalAlign: 'middle',
                                    }}
                                  />
                                )}
                                {suite.label}
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select Product Suite"
                                sx={{ minWidth: 200 }}
                              />
                            )}
                            disabled={isSaving}
                          />
                        ) : (
                          option.parent_id ? (
                            (() => {
                              const parentSuite = productSuites.find((ps) => ps.option_id === option.parent_id);
                              return parentSuite ? (
                                <Chip
                                  label={parentSuite.label}
                                  size="small"
                                  sx={{
                                    bgcolor: parentSuite.color || 'action.selected',
                                    color: parentSuite.color ? '#fff' : 'text.primary',
                                    fontWeight: 500,
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">Unknown</Typography>
                              );
                            })()
                          ) : (
                            <Typography variant="body2" color="text.secondary">None</Typography>
                          )
                        )}
                      </TableCell>
                    )}
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
                  onClick={(e) => {
                    setColorMenuAnchor({ element: e.currentTarget, optionId: menuAnchor.optionId });
                    setMenuAnchor(null);
                  }}
                >
                  <PaletteIcon fontSize="small" sx={{ mr: 1 }} />
                  Set Color
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
                      const response = await metadataApi.getUsage(key, menuAnchor.optionId);
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
                  const response = await metadataApi.deleteOption(key, deleteDialogOpen);
                  if ('error' in response) {
                    alert(`Failed to delete option: ${response.error.message}`);
                    return;
                  }
                  track('lms_metadata_option_deleted', { key, option_id: deleteDialogOpen });
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
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setNewLabel('');
          setNewParentId(null);
          setNewColor(undefined);
          setNewCustomColor('#000000');
          setShowNewColorPicker(false);
        }}
        maxWidth="sm"
        fullWidth
      >
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
          {key === 'product' && (
            <Autocomplete
              options={productSuites}
              getOptionLabel={(option) => option.label}
              value={productSuites.find((ps) => ps.option_id === newParentId) || null}
              onChange={(_, newValue) => {
                setNewParentId(newValue?.option_id || null);
              }}
              renderOption={(props, suite) => (
                <Box component="li" {...props}>
                  {suite.color && (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: suite.color,
                        display: 'inline-block',
                        mr: 1,
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                  {suite.label}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product Suite"
                  placeholder="Select Product Suite (optional)"
                  sx={{ mt: 2 }}
                />
              )}
            />
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Color (optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box
                onClick={() => {
                  setNewColor(undefined);
                  setShowNewColorPicker(false);
                }}
                sx={{
                  width: 32,
                  height: 32,
                  border: 2,
                  borderColor: newColor === undefined ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider' }} />
              </Box>
              {COLOR_PALETTE.map((color) => (
                <Box
                  key={color}
                  onClick={() => {
                    setNewColor(color);
                    setShowNewColorPicker(false);
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: color,
                    border: 2,
                    borderColor: newColor === color ? 'primary.main' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                />
              ))}
              <Box
                onClick={() => {
                  setShowNewColorPicker(true);
                  if (!newColor || isPaletteColor(newColor)) {
                    setNewColor(newCustomColor);
                  }
                }}
                sx={{
                  width: 32,
                  height: 32,
                  border: 2,
                  borderColor: showNewColorPicker || (newColor && !isPaletteColor(newColor)) ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                  bgcolor: showNewColorPicker || (newColor && !isPaletteColor(newColor)) ? (newColor || '#f5f5f5') : 'transparent',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>+</Typography>
              </Box>
            </Box>
            {showNewColorPicker && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <input
                  type="color"
                  value={newColor && !isPaletteColor(newColor) ? newColor : newCustomColor}
                  onChange={(e) => {
                    const hex = e.target.value.toUpperCase();
                    setNewColor(hex);
                    setNewCustomColor(hex);
                  }}
                  style={{
                    width: 50,
                    height: 36,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <TextField
                  size="small"
                  value={newColor && !isPaletteColor(newColor) ? newColor : newCustomColor}
                  onChange={(e) => {
                    const hex = e.target.value.toUpperCase();
                    if (hex.startsWith('#') && hex.length <= 7) {
                      setNewCustomColor(hex);
                      if (hex.length === 7 && isValidHexColor(hex)) {
                        setNewColor(hex);
                      }
                    }
                  }}
                  placeholder="#000000"
                  sx={{ width: 100 }}
                  inputProps={{
                    maxLength: 7,
                    pattern: '#[0-9A-Fa-f]{6}',
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setNewLabel('');
              setNewParentId(null);
              setNewColor(undefined);
            }}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newLabel.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Color Picker Menu */}
      <Menu
        anchorEl={colorMenuAnchor?.element}
        open={!!colorMenuAnchor}
        onClose={() => {
          setColorMenuAnchor(null);
          setShowMenuColorPicker(false);
        }}
      >
        <MenuItem onClick={() => colorMenuAnchor && handleColorChange(colorMenuAnchor.optionId, undefined)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider' }} />
            <Typography>No color</Typography>
          </Box>
        </MenuItem>
        {COLOR_PALETTE.map((color) => (
          <MenuItem
            key={color}
            onClick={() => {
              if (colorMenuAnchor) {
                handleColorChange(colorMenuAnchor.optionId, color);
                setShowMenuColorPicker(false);
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color }} />
              <Typography>{color}</Typography>
            </Box>
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            setShowMenuColorPicker(true);
            if (colorMenuAnchor) {
              const option = filteredOptions.find((o) => o.option_id === colorMenuAnchor.optionId);
              if (option?.color && !isPaletteColor(option.color)) {
                setMenuCustomColor(option.color);
              }
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider', borderRadius: '50%' }} />
            <Typography>Custom...</Typography>
          </Box>
        </MenuItem>
        {showMenuColorPicker && colorMenuAnchor && (
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <input
                type="color"
                value={menuCustomColor}
                onChange={(e) => {
                  const hex = e.target.value.toUpperCase();
                  setMenuCustomColor(hex);
                }}
                style={{
                  width: 40,
                  height: 32,
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <TextField
                size="small"
                value={menuCustomColor}
                onChange={(e) => {
                  const hex = e.target.value.toUpperCase();
                  if (hex.startsWith('#') && hex.length <= 7) {
                    setMenuCustomColor(hex);
                  }
                }}
                placeholder="#000000"
                sx={{ flex: 1 }}
                inputProps={{
                  maxLength: 7,
                  pattern: '#[0-9A-Fa-f]{6}',
                }}
              />
            </Box>
            <Button
              size="small"
              variant="contained"
              fullWidth
              onClick={() => {
                if (colorMenuAnchor && isValidHexColor(menuCustomColor)) {
                  handleColorChange(colorMenuAnchor.optionId, menuCustomColor);
                  setShowMenuColorPicker(false);
                }
              }}
              disabled={!isValidHexColor(menuCustomColor)}
            >
              Apply
            </Button>
          </Box>
        )}
      </Menu>
    </Box>
  );
}

