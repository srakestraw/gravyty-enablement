# Theme Tokens

This document describes how design tokens from Figma are represented in the MUI theme.

## Token Structure

The theme is the source of truth for all styling. Tokens are organized into logical groups:

### Palette
- **Primary**: Main brand color and variants
- **Secondary**: Secondary brand color and variants
- **Error**: Error states
- **Warning**: Warning states
- **Info**: Informational states
- **Success**: Success states
- **Grey/Neutral**: Neutral colors for backgrounds, borders, text

**Location**: `theme.palette.*`

### Typography
- **Font families**: Primary and secondary fonts
- **Font sizes**: Scale from h1 to body2, caption, etc.
- **Font weights**: Regular, medium, bold, etc.
- **Line heights**: Per typography variant
- **Letter spacing**: Per typography variant

**Location**: `theme.typography.*`

### Spacing
- **Base unit**: Typically 8px
- **Scale**: xs, sm, md, lg, xl, etc.
- **Custom spacing**: For specific design needs

**Location**: `theme.spacing()`

### Shape
- **Border radius**: Default and component-specific
- **Border styles**: Solid, dashed, etc.

**Location**: `theme.shape.*`

### Shadows
- **Elevation levels**: 0-24 (MUI standard)
- **Custom shadows**: Design-specific shadow definitions

**Location**: `theme.shadows[]`

### Breakpoints
- **Responsive breakpoints**: xs, sm, md, lg, xl, xxl
- **Container widths**: Max widths for different breakpoints

**Location**: `theme.breakpoints.*`

## Token Extraction from Figma

1. **Use Figma MCP** to get variable definitions
2. **Map Figma tokens to theme structure**:
   - Figma color variables → `theme.palette`
   - Figma spacing variables → `theme.spacing`
   - Figma typography → `theme.typography`
   - Figma shadows → `theme.shadows`
   - Figma border radius → `theme.shape`

3. **Update theme.ts** with extracted tokens

## Usage Rules

- **Always use theme tokens**: Never hard-code colors, spacing, or other design values
- **Extend, don't replace**: Add new tokens to the theme rather than using one-off values
- **Document additions**: When adding new tokens, document them here

## Token Extraction Notes

### Extraction Date
Initial token extraction completed via Figma MCP screenshot analysis (2024-01-XX)

### Figma Node ID
- Main design system page: `0:1` (Cover page)
- Source: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev

### Tokens Extracted

#### Typography
- **Font Family**: Inter (variable font family)
  - Source: Figma screenshot description - "Inter is a variable font family carefully crafted & designed for computer screens"
  - Implementation: `theme.typography.fontFamily` includes Inter as primary font

#### Colors
- **Primary Palette**: Blue colors
  - Main: `#2563eb` (inferred from Figma blue palette)
  - Light: `#3b82f6`
  - Dark: `#1e40af`
  - Source: Figma screenshot shows blue primary palette

- **Success Palette**: Green colors
  - Main: `#10b981`
  - Source: Figma screenshot shows green palette

- **Grayscale**: Neutral grays
  - Source: Figma screenshot shows grayscale palette
  - Implementation: `theme.palette.grey[50-900]`

#### Spacing
- **Base Unit**: 8px
  - Token references from Figma code snippet: `--space-xs`, `--space-md`
  - Implementation: `theme.spacing(8)` (MUI default, matches pattern)

#### Border Radius
- **Default Radius**: 8px
  - Token reference from Figma code snippet: `--radius-md`
  - Implementation: `theme.shape.borderRadius = 8`

#### Shadows
- **Shadow Tokens**: `--shadow-sm` (from Figma code snippet)
  - Implementation: `theme.shadows[]` with elevation-based shadow system

### CSS Variable References (from Figma Code Snippet)
The Figma design system uses CSS variables. Mapped tokens:
- `var(--surface-bg)` → `theme.palette.background.paper`
- `var(--radius-md)` → `theme.shape.borderRadius` (8px)
- `var(--shadow-sm)` → `theme.shadows[1-2]`
- `var(--space-md)` → `theme.spacing(2)` (16px)
- `var(--space-xs)` → `theme.spacing(1)` (8px)
- `var(--font-heading-sm)` → `theme.typography.h6`
- `var(--font-body-sm)` → `theme.typography.body2`

### Gaps and Notes
- **Exact hex values**: Some color values were inferred from Figma screenshot. Exact hex values should be verified via Figma MCP when available.
- **Typography scale**: Font sizes and weights inferred from common design system patterns. Verify exact values from Figma.
- **Component-specific tokens**: Some component-specific tokens (e.g., button padding, card elevation) were inferred from design patterns.

## Token File Format

Tokens are stored in `/packages/design-system/src/tokens/figma.tokens.json` with the following structure:

```json
{
  "source": {
    "fileKey": "rGLG1CGxkfk26LTHctRgJk",
    "varSets": ["5581-17964"],
    "updatedAt": "ISO timestamp"
  },
  "raw": {
    "varSets": {
      "5581-17964": { /* Full variable set export from Figma */ }
    }
  },
  "normalized": {
    "palette": { /* Mapped color tokens */ },
    "typography": { /* Mapped typography tokens */ },
    "spacing": { /* Mapped spacing tokens */ },
    "radius": { /* Mapped border radius tokens */ },
    "shadows": { /* Mapped shadow tokens */ }
  }
}
```

## Token Mapping Rules

The `mapTokensToTheme.ts` function maps normalized tokens to MUI theme structure:

1. **Palette**: Maps color tokens to `theme.palette.*` (primary, secondary, success, warning, error, info, grey, text, background, divider)
2. **Typography**: Maps font family and typography variants (h1-h6, subtitle1/2, body1/2, button, caption, overline)
3. **Spacing**: Maps base unit to `theme.spacing` multiplier
4. **Radius**: Maps radius tokens to `theme.shape.borderRadius` and component overrides
5. **Shadows**: Maps shadow tokens to `theme.shadows[]` array

### Token Resolution

- Token aliases/references are resolved (if present in Figma variable structure)
- Missing tokens fall back to inferred values with TODO comments
- Token values take precedence over fallback values when both exist

## How to Refresh Exports

1. **Export from Figma**: Use Figma MCP to export variable set 5581-17964
2. **Update raw export**: Save to `/packages/design-system/src/tokens/exports/figma.var-set.5581-17964.json`
3. **Normalize tokens**: Update `/packages/design-system/src/tokens/figma.tokens.json` with normalized structure
4. **Rebuild theme**: The theme automatically loads tokens on build/run

See `/packages/design-system/src/tokens/README.md` for detailed instructions.

## Current State

The theme is now token-driven via `mapTokensToTheme.ts`. Tokens are loaded from `figma.tokens.json` and merged with fallback values.

- ✅ Token mapping function implemented
- ✅ Theme refactored to use token mapping
- ⚠️ Token files contain placeholders - requires Figma MCP export to populate
- ✅ Fallback values ensure theme works even without tokens

See `/packages/design-system/src/theme.ts` and `/packages/design-system/src/tokens/mapTokensToTheme.ts` for implementation.

