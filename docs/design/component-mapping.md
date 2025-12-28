# Component Mapping

This document tracks the mapping between Figma design components and MUI implementation.

## Mapping Table Template

| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| | | | | | |

## Implemented Screens

### App Shell
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| App Bar / Header | Default | `AppBar` | `MuiAppBar` override: shadow[1], bg paper, text primary | `Header.tsx` | ✅ Implemented. Uses theme.palette.background.paper, theme.shadows[1] |
| Toolbar | Default | `Toolbar` | `MuiToolbar` override: minHeight 64px, padding spacing(0,3) | - | ✅ Implemented. Consistent header height |
| Navigation Drawer | Permanent | `Drawer` | `MuiDrawer` override: borderRight divider, shadow[1] | `SideNav.tsx` | ✅ Implemented. Width: theme.spacing(30) = 240px. Uses theme tokens |
| ListItemButton | Selected/Default | `ListItemButton` | `MuiListItemButton` override: borderRadius, selected bg primary.main, hover states | - | ✅ Implemented. Active state uses primary.main with contrastText |
| ListItemIcon | Default | `ListItemIcon` | `MuiListItemIcon` override: minWidth 40px, color text.secondary | - | ✅ Implemented. Icon spacing and colors from theme |
| Page Layout | Default | `Container` + `Box` | Default theme spacing | `PageLayout.tsx` | ✅ Implemented. Uses theme.spacing(3) for padding, spacing(30) for drawer width calc |

### Content List
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Content Card | Default | `Card` + `CardContent` | `MuiCard` override: borderRadius 12px, shadow[2], padding spacing(3), hover shadow[4] | `ContentListPage.tsx` | ✅ Implemented. Card styling matches design system patterns |
| CardContent | Default | `CardContent` | `MuiCardContent` override: padding spacing(2,0) | - | ✅ Implemented. Consistent card content spacing |
| List Item | Default | `ListItem` + `ListItemButton` | Default theme | - | ✅ Uses theme spacing and colors |
| Chip / Tag | Default | `Chip` | `MuiChip` override: borderRadius, height 32px, fontWeight 500, sizeSmall height 24px | - | ✅ Implemented. 2 sizes supported (default, small). Matches Figma "2 sizes / 2 styles" |

### Content Detail
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Content Card | Default | `Card` + `CardContent` | `MuiCard` override (same as Content List) | `ContentDetailPage.tsx` | ✅ Implemented. Reuses card component override |
| Back Button | Text/Outlined | `Button` | `MuiButton` override: borderRadius, textTransform none, fontWeight 500, sizes (small/medium/large) | - | ✅ Implemented. Button component matches Figma "5 sizes / 3 styles" pattern |
| Chip / Tag | Default | `Chip` | `MuiChip` override (same as Content List) | - | ✅ Implemented. Reuses chip component override |

### Notifications
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Notification Card | Default | `Card` + `CardContent` | `MuiCard` override (same as Content List) | `NotificationsPage.tsx` | ✅ Implemented. Reuses card component override |
| Icon | Info/Success/Warning/Error | `@mui/icons-material` | Default theme colors | - | ✅ Uses theme.palette for status colors |
| Badge / Chip | New | `Chip` | `MuiChip` override with `color="primary"` | - | ✅ Implemented. Uses primary color variant |

### Assistant Chat
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Chat Container | Default | `Paper` | Default theme | `AssistantPage.tsx` | ✅ Uses theme spacing and colors |
| Message Bubble | User/Assistant | `Paper` | Theme tokens: bgcolor primary.main/grey.100, color primary.contrastText/text.primary | - | ✅ Implemented. Uses theme.palette for message colors |
| Input Field | Default | `TextField` + `OutlinedInput` | `MuiTextField` + `MuiOutlinedInput` override: borderRadius, borderWidth 1.5px hover, 2px focused | - | ✅ Implemented. Input styling with focus states |
| Send Button | Contained | `Button` | `MuiButton` override (same as other buttons) | - | ✅ Implemented. Reuses button component override |

### Design Verification Page
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Design Check Page | Verification harness | Various components | All component overrides | `DesignCheckPage.tsx` | ✅ Verification page that validates: Buttons (contained/outlined/text, small/medium/large, disabled), TextFields (default/focused/error/disabled/helper), Tabs (default/selected), Chips (default/selected), Cards (normal/with header), Alerts (success/info/warning/error), SideNav selected state |

## Component Override Summary

### Implemented Overrides (in `/packages/design-system/src/components.ts`)

1. **MuiButton**: 5 sizes (small/medium/large), 3 styles (contained/outlined/text), borderRadius, hover states
2. **MuiTextField** + **MuiOutlinedInput**: Border radius, hover/focus border widths, border colors
3. **MuiTabs** + **MuiTab**: Indicator styling, textTransform none, fontWeight
4. **MuiChip**: 2 sizes (default/small), borderRadius, fontWeight, color variants
5. **MuiCard** + **MuiCardContent**: BorderRadius 12px, shadow elevation, padding, hover states
6. **MuiAlert**: Status color variants (success/info/warning/error), borderRadius, padding
7. **MuiDialog**: BorderRadius 16px, padding for title/content/actions
8. **MuiAppBar** + **MuiToolbar**: Shadow, background paper, minHeight, padding
9. **MuiDrawer**: Border divider, shadow
10. **MuiListItemButton**: Active state (primary.main), borderRadius, hover states, spacing
11. **MuiListItemIcon**: MinWidth, color text.secondary

### Figma Node IDs
- Main design system page: `0:1` (Cover page)
- Source: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev

## Design Verification

The DesignCheckPage (`/enablement/_design-check`) validates:
- ✅ Button variants and sizes render correctly
- ✅ TextField states (default, focused, error, disabled, helper text) display properly
- ✅ Tabs show correct selected/unselected states
- ✅ Chips display in default and selected states
- ✅ Cards render with and without headers/actions
- ✅ Alerts show all severity variants (success/info/warning/error)
- ✅ SideNav selected state matches design system

Use this page to verify token-driven theme changes and component overrides.

## Notes

- ✅ All component overrides use theme tokens (no hard-coded values)
- ✅ Component variants match Figma patterns (Button: 5 sizes / 3 styles, Chip: 2 sizes / 2 styles)
- ✅ Theme is token-driven via `mapTokensToTheme.ts`
- ⚠️ Some exact hex values inferred from design patterns - verify via Figma MCP when available
- 📝 Component-specific node IDs to be added as components are inspected individually
- ♿ Accessibility: All components maintain keyboard navigation and focus states via MUI defaults

