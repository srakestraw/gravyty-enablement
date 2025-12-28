/**
 * Side Navigation Component
 * 
 * Simplified top-level module navigation (Home, Learn, Assets, Ask AI, Insights, Admin).
 * Uses MUI Outlined icons for consistency.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import {
  HomeOutlined,
  SchoolOutlined,
  FolderOutlined,
  SmartToyOutlined,
  InsightsOutlined,
  AdminPanelSettingsOutlined,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';
import { useShellLayout } from '../../contexts/ShellLayoutContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  const { navMode, mobileNavOpen, closeMobileNav } = useShellLayout();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const expandedWidth = 280; // ~35 * 8px
  const collapsedWidth = 72; // ~9 * 8px
  const drawerWidth = navMode === 'expanded' ? expandedWidth : collapsedWidth;

  const userIsAdmin = isAdmin(user?.role);
  const isCollapsed = navMode === 'collapsed' && !isMobile;

  // Simplified navigation items - top-level modules only
  const navItems: NavItem[] = [
    { label: 'Home', path: '/enablement', icon: <HomeOutlined fontSize="small" /> },
    { label: 'Learn', path: '/enablement/learn', icon: <SchoolOutlined fontSize="small" /> },
    { label: 'Assets', path: '/enablement/assets', icon: <FolderOutlined fontSize="small" /> },
    { label: 'Ask AI', path: '/enablement/ask-ai', icon: <SmartToyOutlined fontSize="small" /> },
    { label: 'Insights', path: '/enablement/analytics', icon: <InsightsOutlined fontSize="small" /> },
    { label: 'Admin', path: '/enablement/admin', icon: <AdminPanelSettingsOutlined fontSize="small" />, adminOnly: true },
  ];

  // Filter items based on role
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !userIsAdmin) return false;
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/enablement') {
      return location.pathname === '/enablement' || location.pathname === '/enablement/';
    }
    return location.pathname.startsWith(path);
  };

  // Handle navigation - close mobile drawer on selection
  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      closeMobileNav();
    }
  };

  // Render nav content (shared between permanent and temporary drawer)
  const renderNavContent = () => (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        {visibleItems.map((item) => {
          const itemIsActive = isActive(item.path);
          
          if (isCollapsed) {
            return (
              <Tooltip key={item.path} title={item.label} placement="right">
                <ListItem disablePadding>
                  <ListItemButton
                    selected={itemIsActive}
                    onClick={() => handleNavClick(item.path)}
                    sx={{
                      justifyContent: 'center',
                      px: 1,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            );
          }

          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={itemIsActive}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  // Mobile: temporary drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileNavOpen}
        onClose={closeMobileNav}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: expandedWidth,
            boxSizing: 'border-box',
            mt: 8, // Account for fixed header
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {renderNavContent()}
      </Drawer>
    );
  }

  // Desktop: permanent drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          mt: 8, // Account for fixed header
          borderRight: 1,
          borderColor: 'divider',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {renderNavContent()}
    </Drawer>
  );
}
