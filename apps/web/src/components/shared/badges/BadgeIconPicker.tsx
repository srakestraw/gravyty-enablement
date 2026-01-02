/**
 * Badge Icon Picker Component
 * 
 * Searchable icon picker for selecting MUI icons for badges.
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  InputAdornment,
  Paper,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  BADGE_ICON_KEYS,
  badgeIconMap,
  badgeIconLabels,
  getBadgeIcon,
  getBadgeIconLabel,
  type BadgeIconKey,
} from './badgeIconRegistry';

export interface BadgeIconPickerProps {
  value: string | null | undefined;
  onChange: (iconKey: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export function BadgeIconPicker({ value, onChange, label = 'Icon', disabled }: BadgeIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIcon = value ? getBadgeIcon(value) : null;
  const selectedLabel = value ? getBadgeIconLabel(value) : 'No icon';

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return BADGE_ICON_KEYS;
    }
    const query = searchQuery.toLowerCase();
    return BADGE_ICON_KEYS.filter((key) => {
      const label = badgeIconLabels[key].toLowerCase();
      const keyLower = key.toLowerCase();
      return label.includes(query) || keyLower.includes(query);
    });
  }, [searchQuery]);

  const handleSelect = (iconKey: BadgeIconKey) => {
    onChange(iconKey);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <Box>
        <TextField
          fullWidth
          label={label}
          value={selectedLabel}
          onClick={() => !disabled && setOpen(true)}
          InputProps={{
            readOnly: true,
            endAdornment: selectedIcon ? (
              <InputAdornment position="end">
                {selectedIcon && (
                  <Box component={selectedIcon} sx={{ color: 'text.secondary', fontSize: 20 }} />
                )}
              </InputAdornment>
            ) : null,
          }}
          disabled={disabled}
          sx={{
            cursor: disabled ? 'default' : 'pointer',
            '& .MuiInputBase-input': {
              cursor: disabled ? 'default' : 'pointer',
            },
          }}
        />
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Select Badge Icon</Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              autoFocus
            />
          </Box>

          {filteredIcons.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No icons found matching "{searchQuery}"</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 1,
                maxHeight: '60vh',
                overflowY: 'auto',
                p: 1,
              }}
            >
              {filteredIcons.map((iconKey) => {
                const IconComponent = badgeIconMap[iconKey];
                const isSelected = value === iconKey;
                return (
                  <Tooltip key={iconKey} title={badgeIconLabels[iconKey]} arrow>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        minHeight: 80,
                      }}
                      onClick={() => handleSelect(iconKey)}
                    >
                      <IconComponent sx={{ fontSize: 32, mb: 0.5 }} />
                      <Typography variant="caption" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
                        {badgeIconLabels[iconKey]}
                      </Typography>
                    </Paper>
                  </Tooltip>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClear} color="inherit">
            Clear Icon
          </Button>
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

