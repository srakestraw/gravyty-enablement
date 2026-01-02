/**
 * Badge Icon Picker Button Component
 * 
 * Button-based icon picker with preview and "Choose icon" action.
 * Opens the icon picker dialog when clicked.
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
  type BadgeIconKey,
} from './badgeIconRegistry';

export interface BadgeIconPickerButtonProps {
  value: string | null | undefined;
  onChange: (iconKey: string | null) => void;
  disabled?: boolean;
}

export function BadgeIconPickerButton({ value, onChange, disabled }: BadgeIconPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIcon = value ? getBadgeIcon(value) : null;
  const IconComponent = selectedIcon || getBadgeIcon('EmojiEventsOutlined'); // Fallback

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Icon Preview */}
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          <IconComponent sx={{ fontSize: 24, color: 'text.secondary' }} />
        </Box>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => !disabled && setOpen(true)}
            disabled={disabled}
          >
            Choose icon
          </Button>
          {value && (
            <Button
              variant="outlined"
              onClick={() => !disabled && handleClear()}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* Icon Picker Dialog */}
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
                const IconComp = badgeIconMap[iconKey];
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
                      <IconComp sx={{ fontSize: 32, mb: 0.5 }} />
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

