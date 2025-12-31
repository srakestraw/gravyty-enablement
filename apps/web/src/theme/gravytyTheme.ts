/**
 * Gravyty Theme Bridge
 * 
 * This file bridges the @gravyty/design-system theme with the web app.
 * The design system is the source of truth for all tokens (colors, typography, spacing, etc.).
 * 
 * This bridge:
 * 1. Re-exports the theme from @gravyty/design-system
 * 2. Ensures all component overrides are applied
 * 3. Provides a single import point for the app
 * 
 * Usage:
 * ```tsx
 * import { gravytyTheme } from '@/theme/gravytyTheme';
 * <ThemeProvider theme={gravytyTheme}>...</ThemeProvider>
 * ```
 * 
 * Design System Source:
 * - Figma: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System
 * - Package: @gravyty/design-system
 * - Token mapping: packages/design-system/src/tokens/mapTokensToTheme.ts
 */

import { gravytyTheme as designSystemTheme } from '@gravyty/design-system';
import type { Theme } from '@mui/material/styles';

/**
 * Gravyty MUI Theme
 * 
 * This theme is derived from the Gravyty Design System tokens.
 * All styling should use theme tokens, never hard-coded values.
 * 
 * Token sources:
 * - Colors: theme.palette.*
 * - Typography: theme.typography.*
 * - Spacing: theme.spacing()
 * - Radius: theme.shape.borderRadius
 * - Shadows: theme.shadows[]
 * 
 * Component overrides are applied via @gravyty/design-system/components.ts
 */
export const gravytyTheme: Theme = designSystemTheme;

// Re-export theme type for convenience
export type { Theme } from '@mui/material/styles';




