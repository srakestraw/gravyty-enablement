/**
 * MUI Component Overrides
 *
 * Based on Figma Design System inspection:
 * - Button: 5 sizes / 3 styles (from Figma screenshot)
 * - Badge & Chip: 2 sizes / 2 styles
 * - Cards: Basic Card and Card with Header variants
 *
 * Figma Design System: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev
 */
export const components = (theme) => ({
    // Button: 5 sizes / 3 styles
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius,
                textTransform: 'none', // No uppercase
                fontWeight: 500,
                padding: theme.spacing(1.5, 3),
                boxShadow: 'none',
                '&:hover': {
                    boxShadow: theme.shadows[2],
                },
            },
            sizeSmall: {
                padding: theme.spacing(1, 2),
                fontSize: '0.8125rem', // 13px
            },
            sizeMedium: {
                padding: theme.spacing(1.5, 3),
                fontSize: '0.875rem', // 14px
            },
            sizeLarge: {
                padding: theme.spacing(2, 4),
                fontSize: '1rem', // 16px
            },
            contained: {
                '&:hover': {
                    boxShadow: theme.shadows[4],
                },
                '&:active': {
                    boxShadow: theme.shadows[1],
                },
            },
            outlined: {
                borderWidth: 1.5,
                '&:hover': {
                    borderWidth: 1.5,
                    boxShadow: theme.shadows[1],
                },
            },
            text: {
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    boxShadow: 'none',
                },
            },
        },
    },
    // TextField and Input
    MuiTextField: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: theme.shape.borderRadius,
                },
            },
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1.5,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                },
            },
            notchedOutline: {
                borderColor: theme.palette.grey[300],
            },
        },
    },
    // Tabs
    MuiTabs: {
        styleOverrides: {
            root: {
                minHeight: 48,
            },
            indicator: {
                height: 3,
                borderRadius: '3px 3px 0 0',
            },
        },
    },
    // Tab
    MuiTab: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
                padding: theme.spacing(1.5, 2),
                '&.Mui-selected': {
                    fontWeight: 600,
                },
            },
        },
    },
    // Chip: 2 sizes / 2 styles
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius,
                fontWeight: 500,
                height: 32,
                '&.MuiChip-sizeSmall': {
                    height: 24,
                    fontSize: '0.75rem',
                },
            },
            colorPrimary: {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                },
            },
            outlined: {
                borderWidth: 1.5,
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
            },
        },
    },
    // Card: Basic Card and Card with Header variants
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius * 1.5, // 12px
                boxShadow: theme.shadows[2],
                padding: theme.spacing(3),
                '&:hover': {
                    boxShadow: theme.shadows[4],
                },
            },
        },
    },
    MuiCardContent: {
        styleOverrides: {
            root: {
                padding: theme.spacing(2, 0),
                '&:last-child': {
                    paddingBottom: theme.spacing(2),
                },
            },
        },
    },
    // Alert
    MuiAlert: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius,
                padding: theme.spacing(2),
            },
            standardSuccess: {
                backgroundColor: theme.palette.success.light,
                color: theme.palette.success.dark,
                '& .MuiAlert-icon': {
                    color: theme.palette.success.dark,
                },
            },
            standardInfo: {
                backgroundColor: theme.palette.info.light,
                color: theme.palette.info.dark,
                '& .MuiAlert-icon': {
                    color: theme.palette.info.dark,
                },
            },
            standardWarning: {
                backgroundColor: theme.palette.warning.light,
                color: theme.palette.warning.dark,
                '& .MuiAlert-icon': {
                    color: theme.palette.warning.dark,
                },
            },
            standardError: {
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.dark,
                '& .MuiAlert-icon': {
                    color: theme.palette.error.dark,
                },
            },
        },
    },
    // Dialog
    MuiDialog: {
        styleOverrides: {
            root: {
                '& .MuiDialog-paper': {
                    borderRadius: theme.shape.borderRadius * 2, // 16px
                },
            },
        },
    },
    MuiDialogTitle: {
        styleOverrides: {
            root: {
                padding: theme.spacing(3, 3, 2),
            },
        },
    },
    MuiDialogContent: {
        styleOverrides: {
            root: {
                padding: theme.spacing(2, 3),
            },
        },
    },
    MuiDialogActions: {
        styleOverrides: {
            root: {
                padding: theme.spacing(2, 3, 3),
            },
        },
    },
    // AppBar / Header
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: theme.shadows[1],
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
            },
        },
    },
    MuiToolbar: {
        styleOverrides: {
            root: {
                minHeight: 64,
                padding: theme.spacing(0, 3),
            },
        },
    },
    // Drawer / SideNav
    MuiDrawer: {
        styleOverrides: {
            paper: {
                borderRight: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[1],
            },
        },
    },
    // ListItemButton (for SideNav active state)
    MuiListItemButton: {
        styleOverrides: {
            root: {
                borderRadius: theme.shape.borderRadius,
                margin: theme.spacing(0.5, 1),
                padding: theme.spacing(1, 2),
                '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                    },
                    '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.contrastText,
                    },
                },
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
            },
        },
    },
    // ListItemIcon
    MuiListItemIcon: {
        styleOverrides: {
            root: {
                minWidth: 40,
                color: theme.palette.text.secondary,
            },
        },
    },
});
//# sourceMappingURL=components.js.map