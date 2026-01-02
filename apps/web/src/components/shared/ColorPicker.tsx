/**
 * Color Picker Component
 * 
 * Shared color picker component with palette and custom color support.
 * Based on the metadata color picker pattern.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
} from '@mui/material';

export interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

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
const isPaletteColor = (color: string | null | undefined): boolean => {
  if (!color) return false;
  return COLOR_PALETTE.includes(color);
};

// Helper to validate hex color
const isValidHexColor = (hex: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(hex);
};

export function ColorPicker({
  value,
  onChange,
  label,
  helperText,
  disabled,
}: ColorPickerProps) {
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState<string>('#000000');

  // Initialize custom color from value if it's not a palette color
  useEffect(() => {
    if (value && !isPaletteColor(value)) {
      setCustomColor(value);
      setShowCustomColorPicker(true);
    } else {
      setShowCustomColorPicker(false);
    }
  }, [value]);

  const handlePaletteColorClick = (color: string) => {
    onChange(color);
    setShowCustomColorPicker(false);
  };

  const handleNoColorClick = () => {
    onChange(null);
    setShowCustomColorPicker(false);
  };

  const handleCustomColorClick = () => {
    setShowCustomColorPicker(true);
    if (!value || isPaletteColor(value)) {
      onChange(customColor);
    }
  };

  const handleColorInputChange = (hex: string) => {
    const upperHex = hex.toUpperCase();
    setCustomColor(upperHex);
    if (upperHex.length === 7 && isValidHexColor(upperHex)) {
      onChange(upperHex);
    }
  };

  const handleNativeColorChange = (hex: string) => {
    const upperHex = hex.toUpperCase();
    setCustomColor(upperHex);
    onChange(upperHex);
  };

  return (
    <Box>
      {label && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* No color option */}
        <Box
          onClick={() => !disabled && handleNoColorClick()}
          sx={{
            width: 32,
            height: 32,
            border: 2,
            borderColor: value === null || value === undefined ? 'primary.main' : 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            '&:hover': { borderColor: disabled ? 'divider' : 'primary.main' },
          }}
        >
          <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'divider' }} />
        </Box>

        {/* Palette colors */}
        {COLOR_PALETTE.map((color) => (
          <Box
            key={color}
            onClick={() => !disabled && handlePaletteColorClick(color)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: color,
              border: 2,
              borderColor: value === color ? 'primary.main' : 'transparent',
              cursor: disabled ? 'default' : 'pointer',
              '&:hover': { borderColor: disabled ? 'transparent' : 'primary.main' },
            }}
          />
        ))}

        {/* Custom color option */}
        <Box
          onClick={() => !disabled && handleCustomColorClick()}
          sx={{
            width: 32,
            height: 32,
            border: 2,
            borderColor:
              showCustomColorPicker || (value && !isPaletteColor(value))
                ? 'primary.main'
                : 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            '&:hover': { borderColor: disabled ? 'divider' : 'primary.main' },
            bgcolor:
              showCustomColorPicker || (value && !isPaletteColor(value))
                ? value && !isPaletteColor(value)
                  ? value
                  : customColor
                : 'transparent',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.primary' }}>
            +
          </Typography>
        </Box>
      </Box>

      {/* Custom color picker */}
      {showCustomColorPicker && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <input
            type="color"
            value={value && !isPaletteColor(value) ? value : customColor}
            onChange={(e) => !disabled && handleNativeColorChange(e.target.value)}
            disabled={disabled}
            style={{
              width: 50,
              height: 36,
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: disabled ? 'default' : 'pointer',
            }}
          />
          <TextField
            size="small"
            value={value && !isPaletteColor(value) ? value : customColor}
            onChange={(e) => !disabled && handleColorInputChange(e.target.value)}
            disabled={disabled}
            placeholder="#000000"
            sx={{ width: 120 }}
            inputProps={{
              maxLength: 7,
              pattern: '#[0-9A-Fa-f]{6}',
            }}
          />
        </Box>
      )}

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}

