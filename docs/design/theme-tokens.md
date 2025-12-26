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

## Current State

The theme currently contains placeholder tokens. Tokens will be extracted from Figma and added to the theme as components are implemented.

See `/packages/design-system/src/theme.ts` for the current theme implementation.

