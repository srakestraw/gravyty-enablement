/**
 * Keywords Input Component
 * 
 * Tag input component with autocomplete for adding search keywords to assets
 */

import { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material';
import { getAssetKeywords } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';

export interface KeywordsInputProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function KeywordsInput({
  value = [],
  onChange,
  label = 'Keywords',
  placeholder = 'Type to add keywords...',
  helperText,
  error = false,
  fullWidth = true,
  disabled = false,
}: KeywordsInputProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Fetch existing keywords for autocomplete
  useEffect(() => {
    let cancelled = false;
    
    const fetchKeywords = async () => {
      setLoading(true);
      try {
        const response = await getAssetKeywords();
        if (!cancelled) {
          if (isErrorResponse(response)) {
            console.error('Failed to fetch keywords:', response.error);
            setOptions([]);
          } else {
            setOptions(response.data.keywords || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching keywords:', err);
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchKeywords();

    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize keyword: trim, lowercase, remove empty
  const normalizeKeyword = (keyword: string): string | null => {
    const normalized = keyword.trim().toLowerCase();
    return normalized || null;
  };

  const handleChange = (_: unknown, newValue: string[]) => {
    // Normalize all keywords and remove duplicates
    const normalized = newValue
      .map(normalizeKeyword)
      .filter((kw): kw is string => kw !== null);
    
    const unique = Array.from(new Set(normalized));
    onChange(unique);
  };

  const handleInputChange = (_: unknown, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  // Filter options based on input (case-insensitive)
  const filteredOptions = inputValue
    ? options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(option.toLowerCase())
      )
    : options.filter(option => !value.includes(option.toLowerCase()));

  return (
    <Autocomplete
      multiple
      freeSolo
      options={filteredOptions}
      value={value}
      onChange={handleChange}
      onInputChange={handleInputChange}
      inputValue={inputValue}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
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
            key={option}
            label={option}
            size="small"
          />
        ))
      }
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option;
        }
        return '';
      }}
      filterOptions={(options, params) => {
        const { inputValue } = params;
        const filtered = options.filter(option =>
          option.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(option.toLowerCase())
        );
        
        // If input doesn't match any option, allow free-form entry
        if (inputValue && !filtered.some(opt => opt.toLowerCase() === inputValue.toLowerCase())) {
          return filtered;
        }
        
        return filtered;
      }}
    />
  );
}

