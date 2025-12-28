/**
 * Token Mapping: Figma Variables → MUI Theme
 *
 * Maps normalized tokens from figma.tokens.json to MUI theme structure
 */
/**
 * Resolves token aliases/references
 * If a value starts with '{' it might be a reference - for now, return as-is
 */
function resolveTokenValue(value) {
    if (typeof value === 'string' && value.startsWith('{')) {
        // TODO: Implement alias resolution if needed
        return value;
    }
    return value;
}
/**
 * Maps normalized tokens to MUI theme options
 */
export function mapTokensToTheme(tokens) {
    const normalized = tokens.normalized || {};
    const palette = normalized.palette || {};
    const typography = normalized.typography || {};
    const spacing = normalized.spacing || {};
    const radius = normalized.radius || {};
    const shadows = normalized.shadows || {};
    // Build palette
    const themePalette = {
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
        themePalette.grey = palette.grey;
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
    const themeTypography = {
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
    const typographyVariants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'button', 'caption', 'overline'];
    typographyVariants.forEach((variant) => {
        const tokenVariant = typography[variant];
        if (tokenVariant) {
            const variantStyle = {
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
    const themeSpacing = spacingBase;
    // Build shape (radius)
    const themeShape = {
        borderRadius: radius.default || radius.md || 8, // Default 8px
    };
    // Build shadows - MUI requires exactly 25 shadows
    const defaultMuiShadows = [
        'none',
        '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
        '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)',
        '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ];
    const customShadows = Object.values(shadows).map((shadow) => resolveTokenValue(shadow));
    const themeShadows = [
        'none',
        ...customShadows,
        // Fill remaining slots with default MUI shadows if needed
        ...defaultMuiShadows.slice(1),
    ].slice(0, 25);
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
export function loadTokensAndMapToTheme() {
    try {
        // TODO: When tokens are exported from Figma, implement JSON loading:
        // Option 1: Use dynamic import: import('./figma.tokens.json')
        // Option 2: Use require in CommonJS context (needs @types/node)
        // Option 3: Use fetch/fs.readFileSync at build time
        // For now, return empty object - theme.ts will use fallback values
        const tokens = { normalized: {} };
        return mapTokensToTheme(tokens);
    }
    catch (error) {
        console.warn('Failed to load figma.tokens.json, using fallback theme:', error);
        // Return empty theme options - theme.ts will use fallbacks
        return {};
    }
}
//# sourceMappingURL=mapTokensToTheme.js.map