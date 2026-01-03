# Document Context

## Purpose

The Enablement Portal is a centralized platform that provides:
- **Enablement content management** across multiple Gravyty products and concepts
- **AI-powered assistant** to help users find and understand enablement materials
- **Unified experience** for Account Executives (AEs) and Customer Success Managers (CSMs)

## Non-Negotiables

### Design System
- **MUI only**: Material-UI is the single source of truth for UI components
- **Theme-driven**: All styling must use theme tokens, no hard-coded values
- **Figma-driven**: Design system is defined in Figma and must be referenced via MCP before implementation

### Governance
- **Component mapping**: Every UI component must be documented in the component mapping doc
- **Design review**: Use Figma MCP to verify designs before implementation
- **Accessibility**: All components must be keyboard navigable with proper focus states

### Content & Data
- **Citations**: AI responses must include citations to source materials
- **No PII**: System must not store or process personally identifiable information
- **Multi-product tagging**: Content must support tagging across multiple products/concepts

### Future Requirements (Not Yet Implemented)
- **Mobile-ready APIs**: All APIs must be designed with mobile consumption in mind
- **Responsive design**: UI must work across desktop, tablet, and mobile devices
- **Offline capability**: Consider offline access patterns for mobile users

## Scope

This documentation covers:
- Product requirements and architecture
- Design system implementation
- Development workflows
- Architecture decisions







