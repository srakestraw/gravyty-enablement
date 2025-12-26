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
| App Bar / Header | Default | `AppBar` | Default theme | `Header.tsx` | Basic header with title. TODO: Extract design tokens from Figma for colors, spacing, typography |
| Navigation Drawer | Permanent | `Drawer` | Default theme | `SideNav.tsx` | Left sidebar navigation. Width: 240px. TODO: Extract spacing and styling from Figma |
| Page Layout | Default | `Container` + `Box` | Default theme | `PageLayout.tsx` | Main content area with padding. TODO: Extract spacing tokens from Figma |

### Content List
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Content Card | Default | `Card` + `CardContent` | Default theme | `ContentListPage.tsx` | List of content items. TODO: Inspect Figma for card styling, spacing, typography |
| List Item | Default | `ListItem` + `ListItemButton` | Default theme | - | Clickable content items. TODO: Extract hover states and spacing from Figma |
| Chip / Tag | Default | `Chip` | Default theme | - | Content tags. TODO: Extract chip styling from Figma |

### Content Detail
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Content Card | Default | `Card` + `CardContent` | Default theme | `ContentDetailPage.tsx` | Detail view card. TODO: Extract card styling from Figma |
| Back Button | Text/Outlined | `Button` | Default theme | - | Navigation back button. TODO: Extract button styling from Figma |
| Chip / Tag | Default | `Chip` | Default theme | - | Content tags. TODO: Extract chip styling from Figma |

### Notifications
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Notification Card | Default | `Card` + `CardContent` | Default theme | `NotificationsPage.tsx` | Notification items. TODO: Extract card styling and notification states from Figma |
| Icon | Info/Success/Warning/Error | `@mui/icons-material` | Default theme | - | Status icons. TODO: Verify icon choices match Figma |
| Badge / Chip | New | `Chip` | `color="primary"` | - | "New" indicator. TODO: Extract badge styling from Figma |

### Assistant Chat
| Figma Component | Figma Variant/State | MUI Component | Theme Variant/Override | Wrapper (if any) | Notes |
|----------------|---------------------|---------------|------------------------|------------------|-------|
| Chat Container | Default | `Paper` | Default theme | `AssistantPage.tsx` | Chat interface container. TODO: Extract chat UI styling from Figma |
| Message Bubble | User/Assistant | `Paper` | Custom bgcolor via sx | - | Message bubbles with different colors. TODO: Extract message styling from Figma |
| Input Field | Default | `TextField` | Default theme | - | Chat input. TODO: Extract input styling from Figma |
| Send Button | Contained | `Button` | Default theme | - | Send message button. TODO: Extract button styling from Figma |

## Notes

- Update this table for every UI component or screen implemented
- Include Figma node IDs for easy reference
- Document any deviations from Figma design and reasoning
- Note accessibility considerations

