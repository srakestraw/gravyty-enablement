import { Theme } from '@mui/material/styles';
import { theme as baseTheme } from './theme';
import { components } from './components';

/**
 * Gravyty Design System
 * 
 * Exports the MUI theme with component overrides applied
 */

// Apply component overrides to theme
export const gravytyTheme: Theme = {
  ...baseTheme,
  components: components(baseTheme),
};

// Re-export theme for convenience
export { baseTheme as theme };

// Re-export types
export type { Theme } from '@mui/material/styles';

// Helper type for theme-aware styling
export type ThemeProps = {
  theme: Theme;
};




