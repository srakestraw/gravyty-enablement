# Local Development Runbook

## Prerequisites

- Node.js 18+ (recommended: use nvm or similar)
- npm (comes with Node.js)
- Git

## Installation

### 1. Install All Dependencies

```bash
# From project root - installs all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- `/packages/design-system`
- `/apps/web`

### 2. Build Design System Package

```bash
# Build the design system package (required for web app to import it)
npm run build --workspace=packages/design-system
```

Or build all packages:

```bash
npm run build
```

## Development Workflow

### Running the Web App

```bash
# From project root
npm run dev

# Or from apps/web directory
cd apps/web
npm run dev
```

The app will start on `http://localhost:3000` and open automatically in your browser.

### Running Lint

```bash
# From project root
npm run lint --workspace=apps/web

# Or from apps/web directory
cd apps/web
npm run lint
```

### Type Checking

```bash
# From project root - checks all workspaces
npm run typecheck

# Or check specific workspace
npm run typecheck --workspace=apps/web
```

### Building for Production

```bash
# Build all packages and web app
npm run build

# Or build just the web app
npm run build --workspace=apps/web
```

### Preview Production Build

```bash
cd apps/web
npm run preview
```

## Project Structure

```
/
├── packages/
│   ├── design-system/    # MUI theme and component overrides
│   └── domain/           # Domain logic (placeholder)
├── apps/
│   ├── web/              # Web application (placeholder)
│   └── api/              # API Lambdas (placeholder)
└── infra/                # CDK infrastructure (placeholder)
```

## Design System Development

### Working with the Theme

1. Edit `/packages/design-system/src/theme.ts`
2. Extract tokens from Figma using MCP
3. Update theme with extracted tokens
4. Test in web app

### Adding Component Overrides

1. Edit `/packages/design-system/src/components.ts`
2. Use MUI component override pattern
3. Reference theme tokens only
4. Document in component-mapping.md

## Figma Integration

Before implementing UI:

1. Use Figma MCP to inspect design
2. Extract design tokens
3. Update theme
4. Implement component
5. Update component-mapping.md

## Troubleshooting

### Common Issues

- **Theme not loading**: Check import paths in web app
- **Design tokens missing**: Extract from Figma and add to theme
- **Component not matching design**: Verify Figma MCP inspection

## Next Steps

- [x] Initialize web app (React + Vite + TypeScript)
- [x] Configure linting (ESLint)
- [ ] Set up testing (Jest + React Testing Library)
- [x] Configure TypeScript
- [x] Set up build pipeline
- [ ] Extract design tokens from Figma and update theme
- [ ] Connect to backend APIs (when available)

