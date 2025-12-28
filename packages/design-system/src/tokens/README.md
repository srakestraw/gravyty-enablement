# Design Tokens

This directory contains design tokens exported from the Gravyty Design System in Figma.

## Figma Variables Source

**Variable Sets**:
- [5581-17964](https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev&vars=1&var-set-id=5581-17964) - Foundational tokens
- [5673-21417](https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev&vars=1&var-set-id=5673-21417) - Foundational tokens
- [5406-15081](https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev&vars=1&var-set-id=5406-15081) - Inputs (component-level tokens)

**File Key**: `rGLG1CGxkfk26LTHctRgJk`

**Note**: Multiple variable sets (both foundational and component-level) are merged into a single `figma.tokens.json` file. The `mapTokensToTheme.ts` function processes all sets and maps foundational tokens into one unified MUI theme. Component-level tokens are preserved in raw exports for use in component overrides.

## Directory Structure

```
tokens/
├── README.md                          # This file
├── figma.tokens.json                  # Normalized tokens (merged from all variable sets)
└── exports/
    ├── figma.var-set.5581-17964.json  # Raw export from Figma variable set 5581-17964
    ├── figma.var-set.5581-17964.summary.md  # Summary for 5581-17964
    ├── figma.var-set.5673-21417.json  # Raw export from Figma variable set 5673-21417
    ├── figma.var-set.5673-21417.summary.md  # Summary for 5673-21417
    ├── figma.var-set.5406-15081.json  # Raw export from Figma variable set 5406-15081 (Inputs)
    └── figma.var-set.5406-15081.summary.md  # Summary for 5406-15081
```

## How to Refresh Exports

### Using Figma MCP Server

1. **Ensure Figma MCP server is running** (local server)

2. **Export variable set(s)**:
   ```typescript
   // Export foundational variable sets:
   mcp_Figma_get_variable_defs({
     nodeId: "5581:17964",
     clientLanguages: ["typescript", "javascript"],
     clientFrameworks: ["react"]
   })
   
   mcp_Figma_get_variable_defs({
     nodeId: "5673:21417",
     clientLanguages: ["typescript", "javascript"],
     clientFrameworks: ["react"]
   })
   
   // Export component-level variable sets:
   mcp_Figma_get_variable_defs({
     nodeId: "5406:15081", // Inputs
     clientLanguages: ["typescript", "javascript"],
     clientFrameworks: ["react"]
   })
   ```

3. **Save raw exports**:
   - Save complete responses to:
     - `exports/figma.var-set.5581-17964.json`
     - `exports/figma.var-set.5673-21417.json`
     - `exports/figma.var-set.5406-15081.json` (Inputs)
   - Include all variable properties: names, values, types, modes, references/aliases

4. **Update summaries**:
   - Run analysis script or manually update summary files:
     - `exports/figma.var-set.5581-17964.summary.md`
     - `exports/figma.var-set.5673-21417.summary.md`
     - `exports/figma.var-set.5406-15081.summary.md` (Inputs)
   - Include: set name, hidden status, variable count, top 40 variable names, detected categories
   - Note whether tokens are foundational or component-level

5. **Merge into canonical token file**:
   - Update `figma.tokens.json`:
     - Add new set ID to `source.varSets` array
     - Add raw export to `raw.varSets` object (all sets, including component-level)
     - Merge foundational tokens into `normalized` object by category
     - Component-level tokens remain in `raw.varSets` for reference
   - Multiple sets are merged into one unified token structure
   - The `mapTokensToTheme.ts` function processes foundational tokens from all sets
   - Component-level tokens can be accessed from `raw.varSets` for component overrides

### Manual Export (Alternative)

If MCP is not available, you can:
1. Open Figma file with variables panel
2. Use Figma API or export plugins
3. Save JSON export to `exports/figma.var-set.5581-17964.json`

## Normalized Token Structure

The `figma.tokens.json` file contains tokens organized by category:

```json
{
  "source": {
    "fileKey": "rGLG1CGxkfk26LTHctRgJk",
    "varSets": ["5581-17964", "5673-21417", "5406-15081"],
    "updatedAt": "ISO timestamp"
  },
  "raw": {
    "varSets": {
      "5581-17964": { /* Full variable set export */ },
      "5673-21417": { /* Full variable set export */ },
      "5406-15081": { /* Full variable set export - component-level Inputs tokens */ }
    }
  },
  "normalized": {
    "palette": {
      "primary": { "main": "#...", "light": "#...", "dark": "#..." },
      "secondary": { ... },
      "error": { ... },
      "warning": { ... },
      "info": { ... },
      "success": { ... },
      "grey": { "50": "#...", "100": "#...", ... }
    },
    "typography": {
      "fontFamily": "...",
      "h1": { "fontSize": "...", "fontWeight": "...", "lineHeight": "..." },
      "h2": { ... },
      ...
    },
    "spacing": {
      "base": 8,
      "scale": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 }
    },
    "radius": {
      "default": 8,
      "small": 4,
      "medium": 8,
      "large": 12
    },
    "shadows": {
      "sm": "...",
      "md": "...",
      "lg": "..."
    }
  }
}
```

## Multiple Variable Sets

Multiple variable sets are merged into a single normalized token structure:

- **5581-17964**: Foundational tokens (colors, typography, spacing, etc.)
- **5673-21417**: Foundational tokens (colors, typography, spacing, etc.)
- **5406-15081**: Component-level tokens (Inputs - focus ring, border, label styling)

When merging:
1. All raw exports are preserved in `raw.varSets` (both foundational and component-level)
2. Foundational tokens from all sets are merged into `normalized` by category
3. Component-level tokens are kept in `raw.varSets` for reference and use in component overrides
4. The `mapTokensToTheme.ts` function processes the unified `normalized` structure for theme generation
5. Component-level tokens can be accessed from `raw.varSets` when implementing component-specific overrides (e.g., Input focus ring colors in `components.ts`)

## Mapping to MUI Theme

Normalized tokens (merged from all variable sets) map to MUI theme structure as follows:

### Palette
- `normalized.palette.*` → `theme.palette.*`
- Colors map directly to MUI palette structure

### Typography
- `normalized.typography.fontFamily` → `theme.typography.fontFamily`
- `normalized.typography.h1-h6, body1, body2, etc.` → `theme.typography.*`

### Spacing
- `normalized.spacing.base` → `theme.spacing` multiplier
- `normalized.spacing.scale.*` → Used via `theme.spacing()` function

### Shape (Radius)
- `normalized.radius.default` → `theme.shape.borderRadius`
- Component-specific radius values can extend this

### Shadows
- `normalized.shadows.*` → `theme.shadows[]` array
- Map shadow tokens to MUI elevation levels (0-24)

## Usage in Theme

The normalized tokens are consumed by:
- `/packages/design-system/src/theme.ts` - Main theme definition
- `/packages/design-system/src/components.ts` - Component overrides

**Note**: Currently, theme.ts uses inferred values. Once tokens are exported and normalized, update theme.ts to import and use `figma.tokens.json`.

## Token Categories

Tokens are categorized as:

- **Foundational**: Core design tokens (colors, typography, spacing, radius, shadows)
  - These should be merged into `figma.tokens.json`
  - Used directly in MUI theme

- **Component-level**: Component-specific tokens (button sizes, card padding, etc.)
  - May be kept in raw exports
  - Used in component overrides or custom components

## Next Steps

1. ✅ Export variable set 5581-17964 from Figma
2. ✅ Export variable set 5673-21417 from Figma
3. ✅ Export variable set 5406-15081 (Inputs) from Figma
4. ✅ Update `exports/figma.var-set.5581-17964.json` with raw data
5. ✅ Update `exports/figma.var-set.5673-21417.json` with raw data
6. ✅ Update `exports/figma.var-set.5406-15081.json` with raw data
7. ✅ Generate summaries for all variable sets
8. ✅ Merge foundational tokens from all sets into `figma.tokens.json`
9. ✅ Update `theme.ts` to import and use normalized tokens (via `mapTokensToTheme.ts`)
10. ⏳ Update `components.ts` to use component-level tokens from `raw.varSets` (e.g., Input tokens for TextField overrides)

