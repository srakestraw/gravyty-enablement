/**
 * Metadata Multi-Select Component
 * 
 * Multi-select with chips for metadata options (Topic Tags)
 * Provides Notion-like UX: typeahead, chips, keyboard navigation, optional inline create
 */

import { useState, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Box,
  Typography,
  Popover,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import { metadataApi } from '../../api/metadataClient';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';
import { MetadataManagerPanel } from './MetadataManagerPanel';
import type { MetadataGroupKey, MetadataOption } from '@gravyty/domain';

export interface MetadataMultiSelectProps {
  groupKey: MetadataGroupKey;
  values: string[]; // Array of metadata option IDs
  onChange: (optionIds: string[]) => void;
  parentIds?: string[]; // Optional array of parent IDs for hierarchical filtering (e.g., filter products by Product Suite)
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export function MetadataMultiSelect({
  groupKey,
  values = [],
  onChange,
  parentIds,
  label,
  placeholder,
  disabled,
  error,
  helperText,
  fullWidth = true,
}: MetadataMultiSelectProps) {
  const { user } = useAuth();
  const canCreate = isAdmin(user?.role);
  const canManage = isAdmin(user?.role);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerAnchor, setManagerAnchor] = useState<HTMLElement | null>(null);

  // Fetch options with query filter (include archived for manager)
  // Pass parentIds to filter options hierarchically (e.g., products filtered by Product Suite)
  const { options, loading, setOptions: setOptionsState } = useMetadataOptions(groupKey, {
    query: query || undefined,
    include_archived: managerOpen, // Include archived when manager is open
    parentIds: parentIds, // Pass parent IDs for hierarchical filtering
  });

  // Find selected options
  const selectedOptions = useMemo(() => {
    const safeValues = values || [];
    return options.filter((opt) => safeValues.includes(opt.option_id));
  }, [values, options]);

  // Handle create new option
  const handleCreateOption = async (label: string) => {
    if (!canCreate || !label.trim()) return;

    setCreating(true);
    try {
      const response = await metadataApi.createOption(groupKey, {
        label: label.trim(),
      });

      if ('error' in response) {
        console.error('Failed to create metadata option:', response.error);
        return;
      }

      // Add the newly created option to selection
      onChange([...(values || []), response.data.option.option_id]);
      setQuery('');
    } catch (err) {
      console.error('Error creating metadata option:', err);
    } finally {
      setCreating(false);
    }
  };

  // Filter options: exclude archived unless selected
  const availableOptions = useMemo(() => {
    const safeValues = values || [];
    const selectedIds = new Set(safeValues);
    return options.filter((opt) => !opt.archived_at || selectedIds.has(opt.option_id));
  }, [options, values]);

  // Check if query matches any existing option
  const hasMatch = useMemo(() => {
    if (!query.trim()) return true;
    const lowerQuery = query.toLowerCase();
    return availableOptions.some(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        opt.slug.toLowerCase().includes(lowerQuery)
    );
  }, [query, availableOptions]);

  // Show "Create new" option when query doesn't match and user can create
  const optionsWithCreate = useMemo(() => {
    const baseOptions = [...availableOptions];
    
    // Add create option if needed
    if (query.trim() && !hasMatch && canCreate && !creating) {
      baseOptions.push({
        option_id: '__create__',
        group_key: groupKey,
        label: `Create "${query}"`,
        slug: '',
        sort_order: 0,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as MetadataOption);
    }
    
    // Add manage options row if user can manage
    if (canManage) {
      baseOptions.push({
        option_id: '__manage__',
        group_key: groupKey,
        label: 'Manage options',
        slug: '',
        sort_order: 999999,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as MetadataOption);
    }
    
    return baseOptions;
  }, [availableOptions, query, hasMatch, canCreate, canManage, creating, groupKey]);

  return (
    <>
    <Autocomplete
      multiple
      options={optionsWithCreate}
      getOptionLabel={(option) => {
        if (option.option_id === '__create__') {
          return option.label;
        }
        return option.label;
      }}
      value={selectedOptions}
      onChange={(_, newValue) => {
        // Filter out create and manage options
        const validOptions = newValue.filter(
          (opt) => opt.option_id !== '__create__' && opt.option_id !== '__manage__'
        );
        onChange(validOptions.map((opt) => opt.option_id));
      }}
      onInputChange={(_, newInputValue) => {
        setQuery(newInputValue);
      }}
      inputValue={query}
      loading={loading || creating}
      disabled={disabled || creating}
      fullWidth={fullWidth}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading || creating ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.option_id}
            label={option.label}
            color={option.color ? 'primary' : 'default'}
            sx={{
              ...(option.color && {
                bgcolor: option.color,
                color: 'white',
                '& .MuiChip-deleteIcon': {
                  color: 'white',
                },
              }),
            }}
          />
        ))
      }
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        
        if (option.option_id === '__create__') {
          return (
            <Box
              key={key}
              component="li"
              {...otherProps}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'primary.main',
                fontWeight: 500,
              }}
            >
              <AddIcon fontSize="small" />
              <Typography>{option.label}</Typography>
            </Box>
          );
        }

        if (option.option_id === '__manage__') {
          return (
            <ListItem
              key={key}
              component="li"
              {...otherProps}
              onClick={(e) => {
                e.stopPropagation();
                setManagerAnchor(e.currentTarget);
                setManagerOpen(true);
              }}
              sx={{
                borderTop: 1,
                borderColor: 'divider',
                mt: 0.5,
                pt: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Manage options"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              />
            </ListItem>
          );
        }

        return (
          <Box key={key} component="li" {...otherProps}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {option.color && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: option.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {option.label}
                </Typography>
                {option.short_description && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {option.short_description}
                  </Typography>
                )}
              </Box>
              {option.archived_at && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                  (archived)
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      isOptionEqualToValue={(option, value) => option.option_id === value.option_id}
      noOptionsText={loading ? 'Loading...' : 'No options found'}
    />
      {/* Manager Panel Popover */}
      <Popover
        open={managerOpen}
        anchorEl={managerAnchor}
        onClose={() => {
          setManagerOpen(false);
          setManagerAnchor(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { mt: 0.5 },
        }}
      >
        <MetadataManagerPanel
          groupKey={groupKey}
          options={options}
          onOptionsChange={(updatedOptions) => {
            setOptionsState(updatedOptions);
          }}
          onClose={() => {
            setManagerOpen(false);
            setManagerAnchor(null);
          }}
        />
      </Popover>
    </>
  );
}

