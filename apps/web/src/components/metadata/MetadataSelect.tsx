/**
 * Metadata Select Component
 * 
 * Single-select dropdown for metadata options (Product, Product Suite)
 * Provides Notion-like UX: typeahead, keyboard navigation, optional inline create
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Popover,
  ListItem,
  ListItemButton,
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

export interface MetadataSelectProps {
  groupKey: MetadataGroupKey;
  value: string | undefined; // Metadata option ID
  onChange: (optionId: string | undefined) => void;
  parentId?: string; // For hierarchical metadata (e.g., product_suite depends on product)
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export function MetadataSelect({
  groupKey,
  value,
  onChange,
  parentId,
  label,
  placeholder,
  disabled,
  error,
  helperText,
  fullWidth = true,
}: TaxonomySelectProps) {
  const { user } = useAuth();
  const canCreate = isAdmin(user?.role);
  const canManage = isAdmin(user?.role);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerAnchor, setManagerAnchor] = useState<HTMLElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Debug: Log component props
  useEffect(() => {
    console.log(`[MetadataSelect:${groupKey}] Component rendered:`, {
      groupKey,
      value,
      parentId,
      label,
      disabled,
      timestamp: new Date().toISOString(),
    });
  }, [groupKey, value, parentId, label, disabled]);

  // Memoize params to ensure stable reference for hook dependencies
  const params = useMemo(() => {
    const p = {
      query: query || undefined,
      parent_id: parentId,
      include_archived: managerOpen, // Include archived when manager is open
    };
    console.log(`[MetadataSelect:${groupKey}] Params memoized:`, {
      params: p,
      parentId,
      query,
      managerOpen,
      timestamp: new Date().toISOString(),
    });
    return p;
  }, [query, parentId, managerOpen, groupKey]);

  // Fetch options with query filter (include archived for manager)
  const { options, loading, setOptions: setOptionsState } = useMetadataOptions(groupKey, params);

  // Debug: Log options received
  useEffect(() => {
    console.log(`[MetadataSelect:${groupKey}] Options received:`, {
      groupKey,
      parentId,
      optionsCount: options.length,
      options: options.map(opt => ({ id: opt.option_id, label: opt.label, parent_id: opt.parent_id })),
      loading,
      value,
      timestamp: new Date().toISOString(),
    });
  }, [options, loading, groupKey, parentId, value]);

  // Find selected option
  // If value exists but isn't in options yet (e.g., during loading or filtering),
  // keep showing it as selected to prevent clearing the value
  const selectedOption = useMemo(() => {
    if (!value) return null;
    const found = options.find((opt) => opt.option_id === value);
    // If found, return it; if not found but value exists and we're loading, 
    // return a placeholder to prevent Autocomplete from clearing the value
    if (found) return found;
    // If value exists but not in options and we're not loading, return null
    // (this allows clearing if the option was actually removed)
    if (!loading && value) return null;
    // During loading, return null but don't clear - Autocomplete will handle this
    return null;
  }, [value, options, loading]);

  // Handle create new option
  const handleCreateOption = async (label: string) => {
    if (!canCreate || !label.trim()) return;

    setCreating(true);
    try {
      const response = await metadataApi.createOption(groupKey, {
        label: label.trim(),
        parent_id: parentId,
      });

      if ('error' in response) {
        console.error('Failed to create metadata option:', response.error);
        return;
      }

      // Select the newly created option
      onChange(response.data.option.option_id);
      setQuery('');
    } catch (err) {
      console.error('Error creating metadata option:', err);
    } finally {
      setCreating(false);
    }
  };

  // Filter options: exclude archived unless selected
  const availableOptions = useMemo(() => {
    return options.filter((opt) => !opt.archived_at || opt.option_id === value);
  }, [options, value]);

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
      options={optionsWithCreate}
      getOptionLabel={(option) => {
        if (option.option_id === '__create__') {
          return option.label;
        }
        return option.label;
      }}
      value={selectedOption}
      onOpen={() => {
        console.log(`[MetadataSelect:${groupKey}] Autocomplete opened:`, {
          groupKey,
          value,
          parentId,
          optionsCount: options.length,
          disabled,
          timestamp: new Date().toISOString(),
        });
      }}
      onClose={(event, reason) => {
        console.log(`[MetadataSelect:${groupKey}] Autocomplete closed:`, {
          groupKey,
          value,
          parentId,
          reason,
          optionsCount: options.length,
          timestamp: new Date().toISOString(),
        });
      }}
      onChange={(_, newValue, reason) => {
        console.log(`[MetadataSelect:${groupKey}] Autocomplete onChange:`, {
          groupKey,
          newValue: newValue ? { id: newValue.option_id, label: newValue.label } : null,
          reason,
          currentValue: value,
          selectedOption: selectedOption ? { id: selectedOption.option_id, label: selectedOption.label } : null,
          parentId,
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack,
        });
        if (!newValue) {
          console.log(`[MetadataSelect:${groupKey}] Clearing value (newValue is null)`);
          onChange(undefined);
          return;
        }

        if (newValue.option_id === '__create__') {
          // Extract label from "Create \"label\"" format
          const match = newValue.label.match(/^Create "(.+)"$/);
          if (match) {
            handleCreateOption(match[1]);
          }
          return;
        }

        if (newValue.option_id === '__manage__') {
          // Don't select, just open manager (handled in renderOption)
          return;
        }

        console.log(`[MetadataSelect:${groupKey}] Calling onChange with option ID:`, newValue.option_id);
        onChange(newValue.option_id);
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
          parentId={parentId}
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

