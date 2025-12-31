/**
 * Taxonomy Multi-Select Component
 * 
 * Multi-select with chips for taxonomy options (Topic Tags)
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
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { taxonomyApi } from '../../api/taxonomyClient';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';
import { TaxonomyManagerPanel } from './TaxonomyManagerPanel';
import type { TaxonomyGroupKey, TaxonomyOption } from '@gravyty/domain';

export interface TaxonomyMultiSelectProps {
  groupKey: TaxonomyGroupKey;
  values: string[]; // Array of taxonomy option IDs
  onChange: (optionIds: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export function TaxonomyMultiSelect({
  groupKey,
  values,
  onChange,
  label,
  placeholder,
  disabled,
  error,
  helperText,
  fullWidth = true,
}: TaxonomyMultiSelectProps) {
  const { user } = useAuth();
  const canCreate = isAdmin(user?.role);
  const canManage = isAdmin(user?.role);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerAnchor, setManagerAnchor] = useState<HTMLElement | null>(null);

  // Fetch options with query filter (include archived for manager)
  const { options, loading, setOptions: setOptionsState } = useTaxonomyOptions(groupKey, {
    query: query || undefined,
    include_archived: managerOpen, // Include archived when manager is open
  });

  // Find selected options
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => values.includes(opt.option_id));
  }, [values, options]);

  // Handle create new option
  const handleCreateOption = async (label: string) => {
    if (!canCreate || !label.trim()) return;

    setCreating(true);
    try {
      const response = await taxonomyApi.createOption(groupKey, {
        label: label.trim(),
      });

      if ('error' in response) {
        console.error('Failed to create taxonomy option:', response.error);
        return;
      }

      // Add the newly created option to selection
      onChange([...values, response.data.option.option_id]);
      setQuery('');
    } catch (err) {
      console.error('Error creating taxonomy option:', err);
    } finally {
      setCreating(false);
    }
  };

  // Filter options: exclude archived unless selected
  const availableOptions = useMemo(() => {
    const selectedIds = new Set(values);
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
            {option.color && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: option.color,
                  display: 'inline-block',
                  mr: 1,
                  verticalAlign: 'middle',
                }}
              />
            )}
            {option.label}
            {option.archived_at && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (archived)
              </Typography>
            )}
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

