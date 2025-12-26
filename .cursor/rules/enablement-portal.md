# Enablement Portal Development Rules

## Design System
- **MUI only**: Use Material-UI (MUI) as the single UI framework. Do not add a second UI kit.
- **Theme tokens only**: Use theme tokens for all styling. No hard-coded hex colors or pixel values unless a token is missing (then add the token first).
- **Theme variants and overrides**: Prefer MUI theme variants and component overrides over one-off styling.

## Figma Integration
- **Figma MCP required**: Before implementing any new UI component or screen, use the Figma MCP to inspect the design system:
  - Figma Design System: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev
- **Component mapping**: Update `/docs/design/component-mapping.md` for every UI screen/component implemented.

## Accessibility
- **Keyboard navigation**: All interactive elements must be keyboard accessible.
- **Focus states**: All focusable elements must have visible focus indicators.
- **ARIA labels**: Use appropriate ARIA labels for screen readers.

## Future Platform Constraints (Do Not Implement Yet)
Keep these in mind for future implementation:
- **Hosting**: AWS Amplify
- **Authentication**: Cognito with Google SSO
- **AI**: OpenAI RAG brain
- **Search**: OpenSearch vector store
- **Storage**: S3 + DynamoDB
- **Analytics**: EventBridge + Step Functions + Firehose + Athena
- **Notifications**: SES
- **Expiration**: Content expiration system
- **Mobile**: Mobile-ready APIs and responsive design

