# Design System Context

## Source of Truth

The Gravyty Design System is defined in Figma:
- **Figma Link**: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev

## Design System Rules

### 1. MUI Only
- Material-UI (MUI) is the single UI framework
- Do not add additional UI kits or component libraries
- All UI components must be built using MUI components

### 2. Theme-First Approach
- All styling must use theme tokens
- No hard-coded hex colors, pixel values, or magic numbers
- If a token is missing, add it to the theme first, then use it

### 3. Component Override-First
- Prefer MUI component overrides via theme over one-off styling
- Use theme variants when available
- Create wrapper components only when necessary for complex compositions

## Using Figma MCP

Before implementing any new UI component or screen:

1. **Use Figma MCP** to inspect the design system:
   - Navigate to the relevant component/page in Figma
   - Use `mcp_Figma_get_design_context` to get design specifications
   - Use `mcp_Figma_get_variable_defs` to get design tokens (colors, spacing, etc.)

2. **Extract design tokens**:
   - Colors → theme palette
   - Typography → theme typography
   - Spacing → theme spacing
   - Shadows → theme shadows
   - Border radius → theme shape

3. **Map components**:
   - Identify which MUI component matches the Figma component
   - Note any variants or states
   - Document customizations needed

## Recording Component Mappings

For every UI component or screen implemented:

1. **Update `/docs/design/component-mapping.md`** with:
   - Figma component name and node ID
   - Figma variant/state
   - MUI component used
   - Theme variant/override applied
   - Any wrapper components created
   - Notes on implementation decisions

2. **Keep mappings current**: Update the doc as components evolve

## Implementation Workflow

1. **Design Review**: Use Figma MCP to inspect design
2. **Token Extraction**: Pull design tokens into theme
3. **Component Selection**: Choose appropriate MUI component
4. **Theme Override**: Apply theme overrides if needed
5. **Documentation**: Update component mapping doc
6. **Accessibility**: Verify keyboard nav and focus states







