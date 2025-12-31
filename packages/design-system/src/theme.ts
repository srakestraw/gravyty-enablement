import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { loadTokensAndMapToTheme } from './tokens/mapTokensToTheme';

/**
 * Gravyty Design System Theme
 * 
 * Token-driven theme loaded from Figma variables.
 * Falls back to inferred values if tokens are not available.
 * 
 * Figma Design System: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev
 */

// Load tokens from figma.tokens.json
const tokenThemeOptions = loadTokensAndMapToTheme();

// Fallback theme options (used when tokens are missing)
const fallbackThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    // Primary: Blue palette (extracted from Figma screenshot - blue primary colors)
    primary: {
      main: '#2563eb', // Primary blue - inferred from Figma blue palette
      light: '#3b82f6', // Lighter blue
      dark: '#1e40af', // Darker blue
      contrastText: '#ffffff',
    },
    // Secondary: Neutral gray (common pattern for secondary actions)
    secondary: {
      main: '#6b7280', // Medium gray
      light: '#9ca3af', // Light gray
      dark: '#4b5563', // Dark gray
      contrastText: '#ffffff',
    },
    // Error: Red palette
    error: {
      main: '#dc2626', // Error red
      light: '#ef4444', // Light error
      dark: '#b91c1c', // Dark error
      contrastText: '#ffffff',
    },
    // Warning: Amber/orange palette
    warning: {
      main: '#f59e0b', // Warning amber
      light: '#fbbf24', // Light warning
      dark: '#d97706', // Dark warning
      contrastText: '#ffffff',
    },
    // Info: Blue palette (lighter than primary)
    info: {
      main: '#0ea5e9', // Info blue
      light: '#38bdf8', // Light info
      dark: '#0284c7', // Dark info
      contrastText: '#ffffff',
    },
    // Success: Green palette (extracted from Figma screenshot - green palette visible)
    success: {
      main: '#10b981', // Success green
      light: '#34d399', // Light success
      dark: '#059669', // Dark success
      contrastText: '#ffffff',
    },
    // Grey/Neutral: Grayscale palette (extracted from Figma screenshot)
    grey: {
      50: '#f9fafb', // Lightest gray
      100: '#f3f4f6', // Very light gray
      200: '#e5e7eb', // Light gray
      300: '#d1d5db', // Medium-light gray
      400: '#9ca3af', // Medium gray
      500: '#6b7280', // Base gray
      600: '#4b5563', // Medium-dark gray
      700: '#374151', // Dark gray
      800: '#1f2937', // Very dark gray
      900: '#111827', // Darkest gray
    },
    // Background: Surface colors
    background: {
      default: '#ffffff', // White background
      paper: '#ffffff', // Card/paper background
    },
    // Text: Contrast colors for readability
    text: {
      primary: '#111827', // Dark text (grey[900])
      secondary: '#6b7280', // Secondary text (grey[500])
      disabled: '#9ca3af', // Disabled text (grey[400])
    },
  },
  typography: {
    // Inter variable font family (extracted from Figma - "Inter is a variable font family")
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    // Typography scale based on Figma design system patterns
    h1: {
      fontSize: '2.5rem', // 40px
      fontWeight: 600, // Semi-bold
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem', // 32px
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem', // 28px
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '0em',
    },
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    body1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    body2: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      textTransform: 'none', // No uppercase transformation
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  // Spacing: Base unit 8px (common design system pattern, matches MUI default)
  // Token references: --space-xs, --space-md (from Figma code snippet)
  spacing: 8,
  shape: {
    // Border radius: Medium radius (--radius-md from Figma code snippet)
    borderRadius: 8, // 8px - common for modern UI
  },
  shadows: [
    'none',
    // Shadow levels based on elevation system
    // --shadow-sm from Figma code snippet
    '0px 1px 2px 0px rgba(0, 0, 0, 0.05)', // Elevation 1
    '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)', // Elevation 2
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)', // Elevation 3
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)', // Elevation 4
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)', // Elevation 5
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', // Elevation 6
    // Additional elevation levels for MUI compatibility
    '0px 1px 3px 0px rgba(0, 0, 0, 0.12), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.2)',
    '0px 1px 5px 0px rgba(0, 0, 0, 0.12), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 3px 1px -2px rgba(0, 0, 0, 0.2)',
    '0px 2px 4px -1px rgba(0, 0, 0, 0.12), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)',
    '0px 3px 5px -1px rgba(0, 0, 0, 0.12), 0px 5px 8px 0px rgba(0, 0, 0, 0.14), 0px 1px 14px 0px rgba(0, 0, 0, 0.12)',
    '0px 3px 5px -1px rgba(0, 0, 0, 0.12), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12)',
    '0px 4px 5px -2px rgba(0, 0, 0, 0.12), 0px 7px 10px 1px rgba(0, 0, 0, 0.14), 0px 2px 16px 1px rgba(0, 0, 0, 0.12)',
    '0px 5px 5px -3px rgba(0, 0, 0, 0.12), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12)',
    '0px 5px 6px -3px rgba(0, 0, 0, 0.12), 0px 9px 12px 1px rgba(0, 0, 0, 0.14), 0px 3px 16px 2px rgba(0, 0, 0, 0.12)',
    '0px 6px 6px -3px rgba(0, 0, 0, 0.12), 0px 10px 14px 1px rgba(0, 0, 0, 0.14), 0px 4px 18px 3px rgba(0, 0, 0, 0.12)',
    '0px 6px 7px -4px rgba(0, 0, 0, 0.12), 0px 11px 15px 1px rgba(0, 0, 0, 0.14), 0px 4px 20px 3px rgba(0, 0, 0, 0.12)',
    '0px 7px 8px -4px rgba(0, 0, 0, 0.12), 0px 12px 17px 2px rgba(0, 0, 0, 0.14), 0px 5px 22px 4px rgba(0, 0, 0, 0.12)',
    '0px 7px 9px -4px rgba(0, 0, 0, 0.12), 0px 13px 19px 2px rgba(0, 0, 0, 0.14), 0px 5px 24px 4px rgba(0, 0, 0, 0.12)',
    '0px 8px 9px -5px rgba(0, 0, 0, 0.12), 0px 14px 21px 2px rgba(0, 0, 0, 0.14), 0px 6px 26px 5px rgba(0, 0, 0, 0.12)',
    '0px 8px 10px -5px rgba(0, 0, 0, 0.12), 0px 15px 23px 2px rgba(0, 0, 0, 0.14), 0px 6px 28px 5px rgba(0, 0, 0, 0.12)',
    '0px 9px 11px -5px rgba(0, 0, 0, 0.12), 0px 16px 25px 2px rgba(0, 0, 0, 0.14), 0px 6px 30px 5px rgba(0, 0, 0, 0.12)',
    '0px 9px 12px -6px rgba(0, 0, 0, 0.12), 0px 17px 27px 2px rgba(0, 0, 0, 0.14), 0px 7px 32px 6px rgba(0, 0, 0, 0.12)',
    '0px 10px 13px -6px rgba(0, 0, 0, 0.12), 0px 18px 29px 2px rgba(0, 0, 0, 0.14), 0px 7px 34px 6px rgba(0, 0, 0, 0.12)',
    '0px 10px 14px -6px rgba(0, 0, 0, 0.12), 0px 19px 31px 2px rgba(0, 0, 0, 0.14), 0px 8px 36px 7px rgba(0, 0, 0, 0.12)',
  ],
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
};

// Merge token-based theme with fallbacks
// Token values take precedence, fallbacks used for missing tokens
const mergedThemeOptions: ThemeOptions = {
  ...fallbackThemeOptions,
  palette: {
    ...fallbackThemeOptions.palette,
    ...tokenThemeOptions.palette,
    // Deep merge palette colors
    ...(tokenThemeOptions.palette && {
      primary: { ...fallbackThemeOptions.palette?.primary, ...tokenThemeOptions.palette.primary },
      secondary: { ...fallbackThemeOptions.palette?.secondary, ...tokenThemeOptions.palette.secondary },
      success: { ...fallbackThemeOptions.palette?.success, ...tokenThemeOptions.palette.success },
      warning: { ...fallbackThemeOptions.palette?.warning, ...tokenThemeOptions.palette.warning },
      error: { ...fallbackThemeOptions.palette?.error, ...tokenThemeOptions.palette.error },
      info: { ...fallbackThemeOptions.palette?.info, ...tokenThemeOptions.palette.info },
    }),
  },
  typography: {
    ...fallbackThemeOptions.typography,
    ...tokenThemeOptions.typography,
  },
  spacing: tokenThemeOptions.spacing || fallbackThemeOptions.spacing,
  shape: {
    ...fallbackThemeOptions.shape,
    ...tokenThemeOptions.shape,
  },
  shadows: (() => {
    // Ensure we always have exactly 25 shadows (indices 0-24) for MUI compatibility
    // fallbackThemeOptions.shadows is always defined (we just created it above)
    const fallbackShadows = fallbackThemeOptions.shadows!;
    if (tokenThemeOptions.shadows && Array.isArray(tokenThemeOptions.shadows) && tokenThemeOptions.shadows.length > 0) {
      const tokenShadows = tokenThemeOptions.shadows;
      // If token shadows are incomplete, pad with fallback shadows
      if (tokenShadows.length < 25) {
        const padded = [
          ...tokenShadows,
          ...fallbackShadows.slice(tokenShadows.length),
        ];
        return padded.slice(0, 25) as typeof fallbackShadows;
      }
      // If token shadows have 25+, take first 25
      return tokenShadows.slice(0, 25) as typeof fallbackShadows;
    }
    // No token shadows or invalid: use fallback (guaranteed 25 shadows)
    return fallbackShadows.slice(0, 25) as typeof fallbackShadows;
  })(),
  breakpoints: fallbackThemeOptions.breakpoints,
};

export const theme: Theme = createTheme(mergedThemeOptions);

