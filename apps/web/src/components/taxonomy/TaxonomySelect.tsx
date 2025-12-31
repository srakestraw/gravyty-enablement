/**
 * Taxonomy Select Component
 * 
 * Single-select dropdown for taxonomy options (Product, Product Suite)
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
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { taxonomyApi } from '../../api/taxonomyClient';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';
import { TaxonomyManagerPanel } from './TaxonomyManagerPanel';
import type { TaxonomyGroupKey, TaxonomyOption } from '@gravyty/domain';

export interface TaxonomySelectProps {
  groupKey: TaxonomyGroupKey;
  value: string | undefined; // Taxonomy option ID
  onChange: (optionId: string | undefined) => void;
  parentId?: string; // For hierarchical taxonomies (e.g., product_suite depends on product)
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export function TaxonomySelect({
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

  // Fetch options with query filter (include archived for manager)
  const { options, loading, setOptions: setOptionsState } = useTaxonomyOptions(groupKey, {
    query: query || undefined,
    parent_id: parentId,
    include_archived: managerOpen, // Include archived when manager is open
  });

  // Find selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => opt.option_id === value) || null;
  }, [value, options]);

  // Handle create new option
  const handleCreateOption = async (label: string) => {
    if (!canCreate || !label.trim()) return;

    setCreating(true);
    try {
      const response = await taxonomyApi.createOption(groupKey, {
        label: label.trim(),
        parent_id: parentId,
      });

      if ('error' in response) {
        console.error('Failed to create taxonomy option:', response.error);
        return;
      }

      // Select the newly created option
      onChange(response.data.option.option_id);
      setQuery('');
    } catch (err) {
      console.error('Error creating taxonomy option:', err);
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
      } as TaxonomyOption);
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
      } as TaxonomyOption);
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
      onChange={(_, newValue) => {
        if (!newValue) {
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
        if (option.option_id === '__create__') {
          return (
            <Box
              component="li"
              {...props}
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
              component="li"
              {...props}
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
          <Box component="li" {...props}>
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
        <TaxonomyManagerPanel
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

