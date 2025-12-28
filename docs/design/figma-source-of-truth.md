# Figma Design System - Source of Truth

## Figma Link

**Gravyty Design System**: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev

## Design System Structure

### Pages to Inspect

1. **Foundations**
   - Color palette
   - Typography scale
   - Spacing system
   - Icon library
   - Grid system

2. **Tokens**
   - Design tokens (colors, spacing, typography, shadows, etc.)
   - Variable definitions
   - Token naming conventions

3. **Components**
   - Base components (Button, Input, Card, etc.)
   - Component variants and states
   - Component composition patterns

4. **Patterns**
   - Layout patterns
   - Navigation patterns
   - Content patterns
   - Interaction patterns

## Using Figma MCP

### Before Implementation

1. **Get Design Context**:
   ```
   Use mcp_Figma_get_design_context with the Figma node ID
   ```

2. **Get Variable Definitions**:
   ```
   Use mcp_Figma_get_variable_defs to extract design tokens
   ```

3. **Get Screenshots** (if needed):
   ```
   Use mcp_Figma_get_screenshot for visual reference
   ```

### Extracting Node IDs

From Figma URLs:
- Format: `https://figma.com/design/:fileKey/:fileName?node-id=1-2`
- Extract node ID: `1:2` or `1-2`

## Naming Conventions

### Code Components
- Use PascalCase: `ContentCard`, `AssistantChat`, `NotificationList`
- Match Figma component names when possible
- Use descriptive names that indicate purpose

### Variants
- Use camelCase for variant props: `variant="primary"`, `size="large"`
- Match Figma variant names when possible
- Document variant mappings in component mapping doc

### Theme Tokens
- Use kebab-case for theme paths: `palette.primary.main`, `spacing.md`
- Group related tokens: `typography.h1`, `typography.body1`
- Document token structure in theme-tokens.md

## Token Extraction Notes

### Initial Extraction (2024-01-XX)

**Method**: Figma MCP screenshot analysis
**Node ID**: `0:1` (Cover page)

**Findings from Figma Screenshot**:
- Typography: Inter variable font family
- Colors: Blue primary palette, grayscale neutrals, green success palette
- Components: Button (5 sizes / 3 styles), Badge & Chip (2 sizes / 2 styles), Cards
- CSS Variables: `--surface-bg`, `--radius-md`, `--shadow-sm`, `--space-md`, `--space-xs`, `--font-heading-sm`, `--font-body-sm`

**Status**: 
- ✅ Tokens extracted and mapped to MUI theme
- ⚠️ Some values inferred from design patterns (verify exact hex values via Figma MCP)
- 📝 Component overrides implemented based on design system patterns

**Next Steps**:
- Verify exact color hex values from Figma variables
- Extract component-specific tokens (button sizes, card variants)
- Document component node IDs for future reference

## Workflow

1. **Design Review**: Inspect Figma design using MCP
2. **Token Extraction**: Pull tokens into theme
3. **Component Mapping**: Document in component-mapping.md
4. **Implementation**: Build using MUI + theme
5. **Verification**: Compare with Figma design

