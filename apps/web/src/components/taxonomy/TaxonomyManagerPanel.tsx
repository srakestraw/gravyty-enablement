/**
 * Taxonomy Manager Panel
 * 
 * Inline management panel for taxonomy options (rename, reorder, archive, color)
 * Used inside the TaxonomySelect/TaxonomyMultiSelect popover
 */

import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Typography,
  Divider,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Palette as PaletteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { taxonomyApi } from '../../api/taxonomyClient';
import type { TaxonomyOption, TaxonomyGroupKey } from '@gravyty/domain';

const COLOR_PALETTE = [
  '#1976d2', // blue
  '#388e3c', // green
  '#f57c00', // orange
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0288d1', // light blue
  '#c2185b', // pink
  '#5d4037', // brown
];

export interface TaxonomyManagerPanelProps {
  groupKey: TaxonomyGroupKey;
  options: TaxonomyOption[];
  parentId?: string;
  onOptionsChange: (options: TaxonomyOption[]) => void;
  onClose: () => void;
}

export function TaxonomyManagerPanel({
  groupKey,
  options,
  parentId,
  onOptionsChange,
  onClose,
}: TaxonomyManagerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [colorMenuAnchor, setColorMenuAnchor] = useState<{ id: string; anchor: HTMLElement } | null>(null);

  // Sort options by sort_order
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.sort_order - b.sort_order);
  }, [options]);

  // Start editing
  const handleStartEdit = (option: TaxonomyOption) => {
    setEditingId(option.option_id);
    setEditLabel(option.label);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  // Save edit
  const handleSaveEdit = async (optionId: string) => {
    if (!editLabel.trim()) return;

    setUpdating((prev) => new Set(prev).add(optionId));
    const originalOption = options.find((o) => o.option_id === optionId);
    if (!originalOption) return;

    // Optimistic update
    const optimisticOptions = options.map((opt) =>
      opt.option_id === optionId ? { ...opt, label: editLabel.trim() } : opt
    );
    onOptionsChange(optimisticOptions);

    try {
      const response = await taxonomyApi.updateOption(optionId, {
        label: editLabel.trim(),
      });

      if ('error' in response) {
        // Rollback on error
        onOptionsChange(options);
        console.error('Failed to update option:', response.error);
      } else {
        // Update with server response
        const updatedOptions = options.map((opt) =>
          opt.option_id === optionId ? response.data.option : opt
        );
        onOptionsChange(updatedOptions);
      }
    } catch (err) {
      // Rollback on error
      onOptionsChange(options);
      console.error('Error updating option:', err);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
      setEditingId(null);
      setEditLabel('');
    }
  };

  // Create new option
  const handleCreate = async () => {
    if (!newLabel.trim() || creating) return;

    setCreating(true);
    try {
      const response = await taxonomyApi.createOption(groupKey, {
        label: newLabel.trim(),
        parent_id: parentId,
      });

      if ('error' in response) {
        console.error('Failed to create option:', response.error);
      } else {
        // Add new option to list
        onOptionsChange([...options, response.data.option]);
        setNewLabel('');
      }
    } catch (err) {
      console.error('Error creating option:', err);
    } finally {
      setCreating(false);
    }
  };

  // Archive/unarchive option
  const handleToggleArchive = async (option: TaxonomyOption) => {
    const optionId = option.option_id;
    setUpdating((prev) => new Set(prev).add(optionId));

    // Optimistic update
    const optimisticOptions = options.map((opt) =>
      opt.option_id === optionId
        ? { ...opt, archived_at: option.archived_at ? undefined : new Date().toISOString() }
        : opt
    );
    onOptionsChange(optimisticOptions);

    try {
      const response = await taxonomyApi.updateOption(optionId, {
        archived_at: option.archived_at ? undefined : new Date().toISOString(),
      });

      if ('error' in response) {
        // Rollback
        onOptionsChange(options);
        console.error('Failed to update option:', response.error);
      } else {
        const updatedOptions = options.map((opt) =>
          opt.option_id === optionId ? response.data.option : opt
        );
        onOptionsChange(updatedOptions);
      }
    } catch (err) {
      // Rollback
      onOptionsChange(options);
      console.error('Error updating option:', err);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
    }
  };

  // Reorder option
  const handleReorder = async (optionId: string, direction: 'up' | 'down') => {
    const optionIndex = sortedOptions.findIndex((opt) => opt.option_id === optionId);
    if (optionIndex === -1) return;

    const newIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
    if (newIndex < 0 || newIndex >= sortedOptions.length) return;

    const option = sortedOptions[optionIndex];
    const targetOption = sortedOptions[newIndex];

    setUpdating((prev) => new Set(prev).add(optionId).add(targetOption.option_id));

    // Optimistic update: swap sort_order
    const optimisticOptions = options.map((opt) => {
      if (opt.option_id === optionId) return { ...opt, sort_order: targetOption.sort_order };
      if (opt.option_id === targetOption.option_id) return { ...opt, sort_order: option.sort_order };
      return opt;
    });
    onOptionsChange(optimisticOptions);

    try {
      // Update both options
      await Promise.all([
        taxonomyApi.updateOption(optionId, { sort_order: targetOption.sort_order }),
        taxonomyApi.updateOption(targetOption.option_id, { sort_order: option.sort_order }),
      ]);

      // Refetch to get updated list (or update manually)
      const updatedOptions = options.map((opt) => {
        if (opt.option_id === optionId) return { ...opt, sort_order: targetOption.sort_order };
        if (opt.option_id === targetOption.option_id) return { ...opt, sort_order: option.sort_order };
        return opt;
      });
      onOptionsChange(updatedOptions);
    } catch (err) {
      // Rollback
      onOptionsChange(options);
      console.error('Error reordering options:', err);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        next.delete(targetOption.option_id);
        return next;
      });
    }
  };

  // Update color
  const handleColorChange = async (optionId: string, color: string | undefined) => {
    setUpdating((prev) => new Set(prev).add(optionId));
    setColorMenuAnchor(null);

    const originalOption = options.find((o) => o.option_id === optionId);
    if (!originalOption) return;

    // Optimistic update
    const optimisticOptions = options.map((opt) =>
      opt.option_id === optionId ? { ...opt, color } : opt
    );
    onOptionsChange(optimisticOptions);

    try {
      const response = await taxonomyApi.updateOption(optionId, { color });

      if ('error' in response) {
        // Rollback
        onOptionsChange(options);
        console.error('Failed to update color:', response.error);
      } else {
        const updatedOptions = options.map((opt) =>
          opt.option_id === optionId ? response.data.option : opt
        );
        onOptionsChange(updatedOptions);
      }
    } catch (err) {
      // Rollback
      onOptionsChange(options);
      console.error('Error updating color:', err);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
    }
  };

  return (
    <Box sx={{ width: 320, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Manage Options
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Add new option */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add new option"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreate();
            }
          }}
          InputProps={{
            endAdornment: (
              <IconButton
                size="small"
                onClick={handleCreate}
                disabled={!newLabel.trim() || creating}
              >
                {creating ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
              </IconButton>
            ),
          }}
        />
      </Box>

      {/* Options list */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense>
          {sortedOptions.map((option, index) => {
            const isEditing = editingId === option.option_id;
            const isUpdating = updating.has(option.option_id);
            const isArchived = !!option.archived_at;

            return (
              <ListItem
                key={option.option_id}
                sx={{
                  bgcolor: isArchived ? 'action.disabledBackground' : 'transparent',
                  opacity: isArchived ? 0.6 : 1,
                }}
              >
                {/* Color dot */}
                {option.color && (
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: option.color,
                      mr: 1,
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Edit input or label */}
                {isEditing ? (
                  <TextField
                    size="small"
                    fullWidth
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(option.option_id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                    disabled={isUpdating}
                    InputProps={{
                      endAdornment: isUpdating ? (
                        <CircularProgress size={16} />
                      ) : (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleSaveEdit(option.option_id)}
                            disabled={!editLabel.trim()}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelEdit}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ),
                    }}
                  />
                ) : (
                  <>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{option.label}</Typography>
                          {isArchived && (
                            <Chip label="Archived" size="small" color="default" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {/* Reorder buttons */}
                        <Tooltip title="Move up">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === 0 || isUpdating}
                              onClick={() => handleReorder(option.option_id, 'up')}
                            >
                              <ArrowUpIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move down">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === sortedOptions.length - 1 || isUpdating}
                              onClick={() => handleReorder(option.option_id, 'down')}
                            >
                              <ArrowDownIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Color picker */}
                        <Tooltip title="Set color">
                          <IconButton
                            size="small"
                            onClick={(e) => setColorMenuAnchor({ id: option.option_id, anchor: e.currentTarget })}
                            disabled={isUpdating}
                          >
                            <PaletteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Edit */}
                        <Tooltip title="Rename">
                          <IconButton
                            size="small"
                            onClick={() => handleStartEdit(option)}
                            disabled={isUpdating}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Archive/Unarchive */}
                        <Tooltip title={isArchived ? 'Unarchive' : 'Archive'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleArchive(option)}
                            disabled={isUpdating}
                          >
                            {isArchived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </>
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Color picker menu */}
      <Menu
        anchorEl={colorMenuAnchor?.anchor}
        open={!!colorMenuAnchor}
        onClose={() => setColorMenuAnchor(null)}
      >
        <MenuItem onClick={() => colorMenuAnchor && handleColorChange(colorMenuAnchor.id, undefined)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider' }} />
            <Typography>No color</Typography>
          </Box>
        </MenuItem>
        {COLOR_PALETTE.map((color) => (
          <MenuItem
            key={color}
            onClick={() => colorMenuAnchor && handleColorChange(colorMenuAnchor.id, color)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color }} />
              <Typography>{color}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

