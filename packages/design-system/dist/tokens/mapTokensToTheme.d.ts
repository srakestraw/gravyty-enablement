/**
 * Token Mapping: Figma Variables → MUI Theme
 *
 * Maps normalized tokens from figma.tokens.json to MUI theme structure
 */
import type { ThemeOptions } from '@mui/material/styles';
interface NormalizedTokens {
    palette?: {
        primary?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        secondary?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        success?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        warning?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        error?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        info?: {
            main?: string;
            light?: string;
            dark?: string;
            contrastText?: string;
        };
        grey?: Record<string, string>;
        text?: {
            primary?: string;
            secondary?: string;
            disabled?: string;
        };
        background?: {
            default?: string;
            paper?: string;
        };
        divider?: string;
    };
    typography?: {
        fontFamily?: string;
        h1?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        h2?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        h3?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        h4?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        h5?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        h6?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        subtitle1?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        subtitle2?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        body1?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        body2?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        button?: {
            fontSize?: string;
            fontWeight?: number;
            textTransform?: string;
            letterSpacing?: string;
        };
        caption?: {
            fontSize?: string;
            fontWeight?: number;
            lineHeight?: number;
            letterSpacing?: string;
        };
        overline?: {
            fontSize?: string;
            fontWeight?: number;
            textTransform?: string;
            letterSpacing?: string;
        };
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
 * Maps normalized tokens to MUI theme options
 */
export declare function mapTokensToTheme(tokens: TokenFile): ThemeOptions;
/**
 * Loads tokens from figma.tokens.json and maps to theme
 *
 * Note: In a production build, this would use a bundler-compatible JSON import.
 * For now, returns empty object - tokens will be loaded when file is populated.
 */
export declare function loadTokensAndMapToTheme(): ThemeOptions;
export {};
//# sourceMappingURL=mapTokensToTheme.d.ts.map