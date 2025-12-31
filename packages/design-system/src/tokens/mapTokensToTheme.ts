/**
 * Token Mapping: Figma Variables → MUI Theme
 * 
 * Maps normalized tokens from figma.tokens.json to MUI theme structure
 */

import type { ThemeOptions } from '@mui/material/styles';

interface NormalizedTokens {
  palette?: {
    primary?: { main?: string; light?: string; dark?: string; contrastText?: string };
    secondary?: { main?: string; light?: string; dark?: string; contrastText?: string };
    success?: { main?: string; light?: string; dark?: string; contrastText?: string };
    warning?: { main?: string; light?: string; dark?: string; contrastText?: string };
    error?: { main?: string; light?: string; dark?: string; contrastText?: string };
    info?: { main?: string; light?: string; dark?: string; contrastText?: string };
    grey?: Record<string, string>;
    text?: { primary?: string; secondary?: string; disabled?: string };
    background?: { default?: string; paper?: string };
    divider?: string;
  };
  typography?: {
    fontFamily?: string;
    h1?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    h2?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    h3?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    h4?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    h5?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    h6?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    subtitle1?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    subtitle2?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    body1?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    body2?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    button?: { fontSize?: string; fontWeight?: number; textTransform?: string; letterSpacing?: string };
    caption?: { fontSize?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: string };
    overline?: { fontSize?: string; fontWeight?: number; textTransform?: string; letterSpacing?: string };
  };
  spacing?: {
    base?: number;
    scale?: Record<string, number>;
  };
  radius?: {
    default?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  shadows?: Record<string, string>;
}

interface TokenFile {
  normalized?: NormalizedTokens;
}

/**
 * Resolves token aliases/references
 * If a value starts with '{' it might be a reference - for now, return as-is
 */
function resolveTokenValue(value: any): any {
  if (typeof value === 'string' && value.startsWith('{')) {
    // TODO: Implement alias resolution if needed
    return value;
  }
  return value;
}

/**
 * Maps normalized tokens to MUI theme options
 */
export function mapTokensToTheme(tokens: TokenFile): ThemeOptions {
  const normalized = tokens.normalized || {};
  const palette = normalized.palette || {};
  const typography = normalized.typography || {};
  const spacing = normalized.spacing || {};
  const radius = normalized.radius || {};
  const shadows = normalized.shadows || {};

  // Build palette
  const themePalette: ThemeOptions['palette'] = {
    mode: 'light',
  };

  // Map color tokens
  if (palette.primary) {
    themePalette.primary = {
      main: resolveTokenValue(palette.primary.main) || '#2563eb', // TODO: Fallback - replace with token
      light: resolveTokenValue(palette.primary.light) || '#3b82f6',
      dark: resolveTokenValue(palette.primary.dark) || '#1e40af',
      contrastText: resolveTokenValue(palette.primary.contrastText) || '#ffffff',
    };
  }

  if (palette.secondary) {
    themePalette.secondary = {
      main: resolveTokenValue(palette.secondary.main) || '#6b7280',
      light: resolveTokenValue(palette.secondary.light) || '#9ca3af',
      dark: resolveTokenValue(palette.secondary.dark) || '#4b5563',
      contrastText: resolveTokenValue(palette.secondary.contrastText) || '#ffffff',
    };
  }

  if (palette.success) {
    themePalette.success = {
      main: resolveTokenValue(palette.success.main) || '#10b981',
      light: resolveTokenValue(palette.success.light) || '#34d399',
      dark: resolveTokenValue(palette.success.dark) || '#059669',
      contrastText: resolveTokenValue(palette.success.contrastText) || '#ffffff',
    };
  }

  if (palette.warning) {
    themePalette.warning = {
      main: resolveTokenValue(palette.warning.main) || '#f59e0b',
      light: resolveTokenValue(palette.warning.light) || '#fbbf24',
      dark: resolveTokenValue(palette.warning.dark) || '#d97706',
      contrastText: resolveTokenValue(palette.warning.contrastText) || '#ffffff',
    };
  }

  if (palette.error) {
    themePalette.error = {
      main: resolveTokenValue(palette.error.main) || '#dc2626',
      light: resolveTokenValue(palette.error.light) || '#ef4444',
      dark: resolveTokenValue(palette.error.dark) || '#b91c1c',
      contrastText: resolveTokenValue(palette.error.contrastText) || '#ffffff',
    };
  }

  if (palette.info) {
    themePalette.info = {
      main: resolveTokenValue(palette.info.main) || '#0ea5e9',
      light: resolveTokenValue(palette.info.light) || '#38bdf8',
      dark: resolveTokenValue(palette.info.dark) || '#0284c7',
      contrastText: resolveTokenValue(palette.info.contrastText) || '#ffffff',
    };
  }

  // Map grey scale
  if (palette.grey && Object.keys(palette.grey).length > 0) {
    themePalette.grey = palette.grey as any;
  }

  // Map text colors
  if (palette.text) {
    themePalette.text = {
      primary: resolveTokenValue(palette.text.primary) || '#111827',
      secondary: resolveTokenValue(palette.text.secondary) || '#6b7280',
      disabled: resolveTokenValue(palette.text.disabled) || '#9ca3af',
    };
  }

  // Map background colors
  if (palette.background) {
    themePalette.background = {
      default: resolveTokenValue(palette.background.default) || '#ffffff',
      paper: resolveTokenValue(palette.background.paper) || '#ffffff',
    };
  }

  // Map divider color
  if (palette.divider) {
    themePalette.divider = resolveTokenValue(palette.divider);
  }

  // Build typography
  const themeTypography: ThemeOptions['typography'] = {
    fontFamily: typography.fontFamily || [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  };

  // Map typography variants
  const typographyVariants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'button', 'caption', 'overline'] as const;
  
  typographyVariants.forEach((variant) => {
    const tokenVariant = typography[variant];
    if (tokenVariant) {
      const variantStyle: any = {
        fontSize: resolveTokenValue(tokenVariant.fontSize),
        fontWeight: resolveTokenValue(tokenVariant.fontWeight),
        letterSpacing: resolveTokenValue(tokenVariant.letterSpacing),
      };
      
      // Add lineHeight if present (not all variants have it)
      if ('lineHeight' in tokenVariant) {
        variantStyle.lineHeight = resolveTokenValue(tokenVariant.lineHeight);
      }
      
      // Add textTransform if present (button and overline have it)
      if ('textTransform' in tokenVariant) {
        variantStyle.textTransform = resolveTokenValue(tokenVariant.textTransform);
      }
      
      themeTypography[variant] = variantStyle;
    }
  });

  // Build spacing
  const spacingBase = spacing.base || 8; // Default 8px base unit
  const themeSpacing: ThemeOptions['spacing'] = spacingBase;

  // Build shape (radius)
  const themeShape: ThemeOptions['shape'] = {
    borderRadius: radius.default || radius.md || 8, // Default 8px
  };

  // Build shadows - MUI requires exactly 25 shadows
  const defaultMuiShadows = [
    'none',
    // Shadow levels based on elevation system
    '0px 1px 2px 0px rgba(0, 0, 0, 0.05)', // Elevation 1
    '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)', // Elevation 2
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)', // Elevation 3
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)', // Elevation 4
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)', // Elevation 5
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', // Elevation 6
    // Additional elevation levels for MUI compatibility
    '0px 1px 3px 0px rgba(0, 0, 0, 0.12), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.2)', // Elevation 7
    '0px 1px 5px 0px rgba(0, 0, 0, 0.12), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 3px 1px -2px rgba(0, 0, 0, 0.2)', // Elevation 8
    '0px 2px 4px -1px rgba(0, 0, 0, 0.12), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)', // Elevation 9
    '0px 3px 5px -1px rgba(0, 0, 0, 0.12), 0px 5px 8px 0px rgba(0, 0, 0, 0.14), 0px 1px 14px 0px rgba(0, 0, 0, 0.12)', // Elevation 10
    '0px 3px 5px -1px rgba(0, 0, 0, 0.12), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12)', // Elevation 11
    '0px 4px 5px -2px rgba(0, 0, 0, 0.12), 0px 7px 10px 1px rgba(0, 0, 0, 0.14), 0px 2px 16px 1px rgba(0, 0, 0, 0.12)', // Elevation 12
    '0px 5px 5px -3px rgba(0, 0, 0, 0.12), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12)', // Elevation 13
    '0px 5px 6px -3px rgba(0, 0, 0, 0.12), 0px 9px 12px 1px rgba(0, 0, 0, 0.14), 0px 3px 16px 2px rgba(0, 0, 0, 0.12)', // Elevation 14
    '0px 6px 6px -3px rgba(0, 0, 0, 0.12), 0px 10px 14px 1px rgba(0, 0, 0, 0.14), 0px 4px 18px 3px rgba(0, 0, 0, 0.12)', // Elevation 15
    '0px 6px 7px -4px rgba(0, 0, 0, 0.12), 0px 11px 15px 1px rgba(0, 0, 0, 0.14), 0px 4px 20px 3px rgba(0, 0, 0, 0.12)', // Elevation 16
    '0px 7px 8px -4px rgba(0, 0, 0, 0.12), 0px 12px 17px 2px rgba(0, 0, 0, 0.14), 0px 5px 22px 4px rgba(0, 0, 0, 0.12)', // Elevation 17
    '0px 7px 9px -4px rgba(0, 0, 0, 0.12), 0px 13px 19px 2px rgba(0, 0, 0, 0.14), 0px 5px 24px 4px rgba(0, 0, 0, 0.12)', // Elevation 18
    '0px 8px 9px -5px rgba(0, 0, 0, 0.12), 0px 14px 21px 2px rgba(0, 0, 0, 0.14), 0px 6px 26px 5px rgba(0, 0, 0, 0.12)', // Elevation 19
    '0px 8px 10px -5px rgba(0, 0, 0, 0.12), 0px 15px 23px 2px rgba(0, 0, 0, 0.14), 0px 6px 28px 5px rgba(0, 0, 0, 0.12)', // Elevation 20
    '0px 9px 11px -5px rgba(0, 0, 0, 0.12), 0px 16px 25px 2px rgba(0, 0, 0, 0.14), 0px 6px 30px 5px rgba(0, 0, 0, 0.12)', // Elevation 21
    '0px 9px 12px -6px rgba(0, 0, 0, 0.12), 0px 17px 27px 2px rgba(0, 0, 0, 0.14), 0px 7px 32px 6px rgba(0, 0, 0, 0.12)', // Elevation 22
    '0px 10px 13px -6px rgba(0, 0, 0, 0.12), 0px 18px 29px 2px rgba(0, 0, 0, 0.14), 0px 7px 34px 6px rgba(0, 0, 0, 0.12)', // Elevation 23
    '0px 10px 14px -6px rgba(0, 0, 0, 0.12), 0px 19px 31px 2px rgba(0, 0, 0, 0.14), 0px 8px 36px 7px rgba(0, 0, 0, 0.12)', // Elevation 24
  ];

  const customShadows = Object.values(shadows).map((shadow) => resolveTokenValue(shadow));
  
  // Ensure we always have exactly 25 shadows (indices 0-24) for MUI compatibility
  // If custom shadows are provided, use them; otherwise use all default shadows
  const themeShadows: ThemeOptions['shadows'] = (() => {
    if (customShadows.length > 0) {
      // Custom shadows provided: use them + pad with defaults to reach 25
      const combined = [
        'none',
        ...customShadows,
        ...defaultMuiShadows.slice(1 + customShadows.length),
      ];
      return combined.slice(0, 25) as ThemeOptions['shadows'];
    }
    // No custom shadows: use all default shadows (guaranteed 25)
    return defaultMuiShadows.slice(0, 25) as ThemeOptions['shadows'];
  })();

  return {
    palette: themePalette,
    typography: themeTypography,
    spacing: themeSpacing,
    shape: themeShape,
    shadows: themeShadows,
  };
}

/**
 * Loads tokens from figma.tokens.json and maps to theme
 * 
 * Note: In a production build, this would use a bundler-compatible JSON import.
 * For now, returns empty object - tokens will be loaded when file is populated.
 */
export function loadTokensAndMapToTheme(): ThemeOptions {
  try {
    // TODO: When tokens are exported from Figma, implement JSON loading:
    // Option 1: Use dynamic import: import('./figma.tokens.json')
    // Option 2: Use require in CommonJS context (needs @types/node)
    // Option 3: Use fetch/fs.readFileSync at build time
    
    // For now, return empty object - theme.ts will use fallback values
    const tokens: TokenFile = { normalized: {} };
    return mapTokensToTheme(tokens);
  } catch (error) {
    console.warn('Failed to load figma.tokens.json, using fallback theme:', error);
    // Return empty theme options - theme.ts will use fallbacks
    return {};
  }
}

