# Figma Variable Set Summary: 5406-15081

## Set Information
- **Set ID**: 5406-15081
- **Display Name**: PLACEHOLDER - Load via Figma MCP
- **Hidden**: true (placeholder - verify via Figma MCP)
- **File Key**: rGLG1CGxkfk26LTHctRgJk
- **Figma Link**: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev&vars=1&var-set-id=5406-15081

## Variable Count
- **Total Variables**: 0 (placeholder - requires export)

## Top 40 Variable Names
*(Placeholder - will be populated after export)*

Expected variable names for Input component tokens:
- Input border colors (default, hover, focus, error)
- Input background colors (default, disabled)
- Input text colors (default, placeholder, disabled)
- Input label colors and sizes
- Input focus ring colors and widths
- Input padding/spacing values
- Input border radius
- Input border widths

## Detected Categories
*(Placeholder - will be populated after export)*

Categories to detect:
- **Color**: Input border colors, background colors, text colors, focus ring colors
- **Typography**: Label font sizes, weights, line heights
- **Spacing**: Input padding, label spacing, helper text spacing
- **Radius**: Input border radius values
- **Shadow**: Focus ring shadows (if any)
- **Other**: Border widths, focus ring widths, transition durations

## Token Type Assessment

**Component-Level Tokens**: This set appears to be component-level tokens for Input/TextField components.

**Evidence**:
- Set name: "Input Label" (from earlier metadata check)
- Expected variables: Focus ring, border, label styling, input-specific colors
- These are component-specific tokens rather than foundational design tokens

**Recommendation**:
- Keep in `raw.varSets` for reference
- Component-level tokens may be used in `components.ts` overrides for `MuiTextField` and `MuiOutlinedInput`
- Do not merge into `normalized` section unless they reference foundational tokens
- Use these tokens to enhance TextField component overrides with Figma-defined input styling

## Notes
This is a placeholder file. To populate:
1. Use Figma MCP: `mcp_Figma_get_variable_defs` with nodeId `5406:15081`
2. Export the full variable definitions to `figma.var-set.5406-15081.json`
3. Analyze variables and regenerate this summary with:
   - Actual set display name
   - Hidden status (true/false)
   - Variable count
   - Top 40 variable names (sorted alphabetically or by category)
   - Detected categories with counts
   - Confirmation of component-level vs foundational token assessment





