# MUI + Design System UI Standards

This document defines how we use Material-UI (MUI) with the Gravyty Design System to ensure consistent, maintainable UI across the application.

## Overview

- **Base Component Library**: Material-UI (MUI v5)
- **Design System Source**: `@gravyty/design-system` package (driven by Figma tokens)
- **Icon Library**: `lucide-react` (outline-only style)
- **Theme Bridge**: `apps/web/src/theme/gravytyTheme.ts`

## Core Principles

1. **MUI is the foundation** - Use MUI components for structure and interactions
2. **Design System is source of truth** - All tokens (colors, spacing, typography) come from the design system
3. **Single icon style** - Use `lucide-react` via the `Icon` wrapper component only
4. **No hard-coded values** - Use theme tokens, never hex colors or pixel values in components
5. **Theme-driven styling** - Use MUI theme customization to bridge tokens → MUI

## Theme System

### Theme Bridge

The theme is imported from `@gravyty/design-system` and re-exported via `apps/web/src/theme/gravytyTheme.ts`:

```tsx
import { gravytyTheme } from '@/theme/gravytyTheme';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

<ThemeProvider theme={gravytyTheme}>
  <CssBaseline />
  {/* App */}
</ThemeProvider>
```

### Token Sources

All design tokens come from the Gravyty Design System:

- **Colors**: `theme.palette.*` (primary, secondary, error, warning, success, info, grey, text, background)
- **Typography**: `theme.typography.*` (h1-h6, body1/body2, button, caption)
- **Spacing**: `theme.spacing()` function (base unit: 8px)
- **Radius**: `theme.shape.borderRadius` (default: 8px)
- **Shadows**: `theme.shadows[]` array (elevation-based)
- **Breakpoints**: `theme.breakpoints.*` (xs, sm, md, lg, xl)

### Component Overrides

Component-level styling is handled via theme overrides in `@gravyty/design-system/src/components.ts`:

- **MuiButton**: Consistent borderRadius, fontWeight, padding, hover states
- **MuiCard**: BorderRadius, shadow, padding defaults
- **MuiTextField/MuiOutlinedInput**: Radius, focus ring, label styles
- **MuiChip**: Radius, height, font size
- **MuiTable/MuiTableCell**: Header typography, row hover
- **MuiDialog**: Radius, padding
- **MuiListItemButton**: Active state styling for navigation

## Icon System

### Single Icon Library: lucide-react

We use **lucide-react** exclusively for all icons. This ensures:
- Consistent outline-only style
- Uniform stroke width (1.75)
- Consistent sizing and alignment
- Theme color compatibility

### Icon Component Wrapper

**Always use the Icon wrapper component** - never import icons directly from `lucide-react`:

```tsx
import { Icon } from '@/components/icons/Icon';

// ✅ Correct
<Icon name="home" />
<Icon name="search" size={24} />
<Icon name="user" color="primary.main" />

// ❌ Wrong - Don't do this
import { Home } from 'lucide-react';
<Home />
```

### Icon Usage Rules

1. **Default size**: 20px
2. **Default strokeWidth**: 1.75 (never vary per icon)
3. **Color**: Inherits `currentColor` by default, or use theme palette keys (`primary.main`, `text.secondary`, etc.)
4. **Style**: Outline-only (no filled icons)
5. **Alignment**: Icons align with MUI baseline (`verticalAlign: middle`)

### Available Icons

Common icons available via the Icon component:

- Navigation: `home`, `analytics`, `search`, `menu`
- Actions: `edit`, `trash`, `plus`, `minus`, `download`, `upload`, `copy`
- User: `user`, `logOut`, `settings`, `bell`
- Status: `check`, `x`, `alertCircle`, `info`, `helpCircle`
- Arrows: `arrowRight`, `arrowLeft`, `arrowUp`, `arrowDown`, `chevronRight`, `chevronLeft`
- Content: `book`, `fileText`, `image`, `link`, `video`
- UI: `filter`, `moreVertical`, `externalLink`, `refresh`, `loader`

See `apps/web/src/components/icons/Icon.tsx` for the complete list.

### Adding New Icons

1. Import the icon from `lucide-react` in `Icon.tsx`
2. Add it to the `iconMap` object
3. Add the icon name to the `IconName` type
4. Use it via `<Icon name="newIcon" />`

## UI Composition Rules

### Layout Components

Use MUI layout components:

```tsx
// ✅ Correct
<Stack spacing={2}>
  <Box sx={{ p: 3 }}>
    <Typography variant="h4">Title</Typography>
  </Box>
</Stack>

// ❌ Wrong
<div style={{ padding: '24px' }}>
  <h4>Title</h4>
</div>
```

**Preferred components**:
- `Stack` - Vertical/horizontal layouts with spacing
- `Box` - Flexible container with sx prop
- `Grid` - Responsive grid layouts
- `Container` - Max-width containers

### Spacing

**Always use theme spacing** - never raw pixel values:

```tsx
// ✅ Correct
<Box sx={{ p: 3, mb: 2, gap: 1 }}>
  {/* content */}
</Box>

// ❌ Wrong
<Box sx={{ padding: '24px', marginBottom: '16px' }}>
  {/* content */}
</Box>
```

**Exception**: Hairline borders (1px) are acceptable:
```tsx
<Box sx={{ border: '1px solid', borderColor: 'divider' }} />
```

### Colors

**Always use theme palette** - never hex colors:

```tsx
// ✅ Correct
<Box sx={{ bgcolor: 'primary.main', color: 'text.primary' }}>
  <Typography color="text.secondary">Text</Typography>
</Box>

// ❌ Wrong
<Box sx={{ backgroundColor: '#2563eb', color: '#111827' }}>
  <Typography sx={{ color: '#6b7280' }}>Text</Typography>
</Box>
```

**Theme palette keys**:
- `primary.main`, `primary.light`, `primary.dark`
- `secondary.*`, `error.*`, `warning.*`, `success.*`, `info.*`
- `text.primary`, `text.secondary`, `text.disabled`
- `background.default`, `background.paper`
- `grey[50]` through `grey[900]`
- `divider`

### Typography

**Always use Typography component with variants**:

```tsx
// ✅ Correct
<Typography variant="h4" component="h1">
  Page Title
</Typography>
<Typography variant="body1" color="text.secondary">
  Description text
</Typography>

// ❌ Wrong
<h1 style={{ fontSize: '32px' }}>Page Title</h1>
<p style={{ fontSize: '16px', color: '#6b7280' }}>Description</p>
```

**Typography variants**:
- Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Body: `body1` (16px), `body2` (14px)
- UI: `button`, `caption`, `overline`

### Border Radius

**Use theme shape.borderRadius**:

```tsx
// ✅ Correct
<Card sx={{ borderRadius: 2 }} />  // 16px (2 * 8px)
<Button sx={{ borderRadius: 1 }} /> // 8px (1 * 8px)

// ❌ Wrong
<Card sx={{ borderRadius: '12px' }} />
```

**Common radius values**:
- `borderRadius: 1` = 8px (default)
- `borderRadius: 1.5` = 12px (cards)
- `borderRadius: 2` = 16px (dialogs)

### Shadows/Elevation

**Use theme shadows array**:

```tsx
// ✅ Correct
<Card sx={{ boxShadow: 2 }} />      // theme.shadows[2]
<Button sx={{ boxShadow: 4 }} />    // theme.shadows[4]

// ❌ Wrong
<Card sx={{ boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }} />
```

**Common elevations**:
- `0` = none
- `1-2` = subtle (cards, inputs)
- `3-4` = medium (hover states, raised buttons)
- `5+` = high (modals, popovers)

### Interaction States

**Buttons and inputs have consistent states via theme overrides**:

- **Hover**: Defined in component overrides
- **Focus**: Visible focus ring (accessibility requirement)
- **Active**: Pressed state styling
- **Disabled**: Reduced opacity, no interaction

**Don't override these** - they're handled by the theme.

## Code Examples

### Card with Icon and Text

```tsx
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Icon } from '@/components/icons/Icon';

<Card>
  <CardContent>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Icon name="book" size={24} color="primary.main" />
      <Typography variant="h6">Content Library</Typography>
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Browse enablement materials
    </Typography>
  </CardContent>
</Card>
```

### Button with Icon

```tsx
import { Button } from '@mui/material';
import { Icon } from '@/components/icons/Icon';

<Button
  variant="contained"
  startIcon={<Icon name="download" />}
  onClick={handleDownload}
>
  Download
</Button>
```

### Form Input

```tsx
import { TextField } from '@mui/material';
import { Icon } from '@/components/icons/Icon';

<TextField
  label="Search"
  placeholder="Enter search term"
  InputProps={{
    startAdornment: <Icon name="search" size={20} color="text.secondary" sx={{ mr: 1 }} />,
  }}
  fullWidth
/>
```

### Navigation Item

```tsx
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Icon } from '@/components/icons/Icon';

<ListItemButton selected={isActive}>
  <ListItemIcon>
    <Icon name="home" />
  </ListItemIcon>
  <ListItemText primary="Home" />
</ListItemButton>
```

## Do's and Don'ts

### ✅ Do's

- Use MUI components (`Button`, `Card`, `TextField`, `Typography`, etc.)
- Use theme tokens for all styling (`theme.palette.*`, `theme.spacing()`, etc.)
- Use the `Icon` wrapper component for all icons
- Use `Typography` variants instead of custom font sizes
- Use `theme.spacing()` for all spacing values
- Use `sx` prop for styling (not `style` prop)
- Use theme breakpoints for responsive design

### ❌ Don'ts

- Don't import icons directly from `lucide-react` or `@mui/icons-material`
- Don't use hex colors (`#2563eb`) - use `theme.palette.primary.main`
- Don't use pixel values for spacing (`padding: '24px'`) - use `p: 3`
- Don't use custom font sizes - use `Typography` variants
- Don't override component styles unnecessarily - use theme overrides
- Don't mix icon libraries - use `lucide-react` only
- Don't use inline styles - use `sx` prop

## Linting and Enforcement

### ESLint Rules (Recommended)

Add to `.eslintrc`:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "lucide-react",
            "message": "Use Icon component from @/components/icons/Icon instead"
          },
          {
            "name": "@mui/icons-material",
            "message": "Use Icon component from @/components/icons/Icon instead"
          }
        ]
      }
    ]
  }
}
```

### PR Checklist

Before submitting PRs, verify:

- [ ] No direct imports from `lucide-react` or `@mui/icons-material`
- [ ] All icons use `<Icon name="..." />` wrapper
- [ ] No hex colors in `sx` props (use theme palette)
- [ ] No pixel values for spacing (use `theme.spacing()`)
- [ ] Typography uses variants, not custom font sizes
- [ ] Colors use theme palette keys

## Design System Source

- **Figma**: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System
- **Package**: `@gravyty/design-system`
- **Theme Bridge**: `apps/web/src/theme/gravytyTheme.ts`
- **Component Overrides**: `packages/design-system/src/components.ts`
- **Token Mapping**: `packages/design-system/src/tokens/mapTokensToTheme.ts`

## References

- [MUI Theming Documentation](https://mui.com/material-ui/customization/theming/)
- [MUI Component API](https://mui.com/material-ui/api/)
- [Lucide Icons](https://lucide.dev/icons/)
- [Design System ADR](../decisions/ADR-0001-design-system-mui-theme.md)
- [Theme Tokens Documentation](../design/theme-tokens.md)


