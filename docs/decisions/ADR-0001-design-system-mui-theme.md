# ADR-0001: Design System - MUI Theme Driven by Gravyty Figma

## Status

Accepted

## Context

We need a consistent design system for the Enablement Portal that:
- Matches the Gravyty brand
- Is maintainable and scalable
- Supports rapid development
- Ensures design consistency

The Gravyty Design System is defined in Figma and serves as the source of truth for design decisions.

## Decision

Use Material-UI (MUI) as the single UI framework, with a theme driven by the Gravyty Design System from Figma.

### Key Points

1. **MUI Only**: No additional UI kits or component libraries
2. **Theme-Driven**: All styling via theme tokens, no hard-coded values
3. **Figma Source of Truth**: Design system defined in Figma, extracted via MCP
4. **Component Overrides**: Use MUI component overrides for customization
5. **Documentation**: Maintain component mapping between Figma and code

## Consequences

### Positive

- **Consistency**: Single design system ensures UI consistency
- **Maintainability**: Theme-based approach makes updates easier
- **Developer Experience**: MUI provides robust components and TypeScript support
- **Design Alignment**: Figma MCP ensures code matches design
- **Scalability**: Theme can grow with product needs

### Negative

- **Learning Curve**: Team must understand MUI theming
- **Figma Dependency**: Requires Figma access and MCP usage
- **Customization Limits**: Some designs may require more complex overrides
- **Documentation Overhead**: Must maintain component mapping doc

### Risks

- **Theme Drift**: Risk of hard-coding values instead of using tokens
- **Figma Sync**: Risk of code diverging from Figma designs
- **Override Complexity**: Complex designs may require many overrides

### Mitigations

- **Cursor Rules**: Enforce theme usage via rules
- **Code Review**: Review for hard-coded values
- **Figma MCP Workflow**: Require Figma inspection before implementation
- **Component Mapping**: Document all mappings for reference

## Alternatives Considered

1. **Custom UI Kit**: Rejected - too much maintenance overhead
2. **Multiple UI Kits**: Rejected - violates single source of truth
3. **CSS-in-JS Only**: Rejected - loses MUI component benefits
4. **Tailwind CSS**: Rejected - doesn't align with Figma design system structure

## References

- [Figma Design System](https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev)
- [MUI Theming Documentation](https://mui.com/material-ui/customization/theming/)
- [Component Mapping Doc](../design/component-mapping.md)

