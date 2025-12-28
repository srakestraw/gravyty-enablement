import { theme as baseTheme } from './theme';
import { components } from './components';
/**
 * Gravyty Design System
 *
 * Exports the MUI theme with component overrides applied
 */
// Apply component overrides to theme
export const gravytyTheme = {
    ...baseTheme,
    components: components(baseTheme),
};
// Re-export theme for convenience
export { baseTheme as theme };
//# sourceMappingURL=index.js.map