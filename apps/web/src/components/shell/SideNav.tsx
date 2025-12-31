/**
 * Side Navigation Component
 * 
 * Grouped navigation with expandable sections (Home, Learn, Resources, Ask AI, Insights, Admin).
 * Uses MUI Outlined icons for consistency.
 */

import { useState, useEffect } from 'react';
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
  Collapse,
  Divider,
  Typography,
} from '@mui/material';
import {
  HomeOutlined,
  SchoolOutlined,
  MenuBookOutlined,
  AltRouteOutlined,
  RecordVoiceOverOutlined,
  WorkspacePremiumOutlined,
  FolderOutlined,
  CollectionsOutlined,
  Inventory2Outlined,
  UpdateOutlined,
  SmartToyOutlined,
  InsightsOutlined,
  BarChartOutlined,
  PeopleOutlineOutlined,
  TimelineOutlined,
  QueryStatsOutlined,
  ManageSearchOutlined,
  AdminPanelSettingsOutlined,
  ManageAccountsOutlined,
  PlaylistPlayOutlined,
  AssignmentIndOutlined,
  PermMediaOutlined,
  CategoryOutlined,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../lib/roles';
import { useShellLayout } from '../../contexts/ShellLayoutContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  isHeader?: boolean; // For subsection headers
  children?: NavItem[]; // For nested sub-items (e.g., Learning Admin)
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  adminOnly?: boolean;
  defaultExpanded?: boolean;
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

  // Navigation groups structure
  const navGroups: NavGroup[] = [
    {
      label: 'Home',
      icon: <HomeOutlined fontSize="small" />,
      items: [
        { label: 'Home', path: '/enablement', icon: <HomeOutlined fontSize="small" /> },
      ],
      defaultExpanded: false,
    },
    {
      label: 'Learn',
      icon: <SchoolOutlined fontSize="small" />,
      items: [
        { label: 'My Learning', path: '/enablement/learn/my', icon: <PlaylistPlayOutlined fontSize="small" /> },
        { label: 'Courses', path: '/enablement/learn/courses', icon: <MenuBookOutlined fontSize="small" /> },
        { label: 'Learning Paths', path: '/enablement/learn/paths', icon: <AltRouteOutlined fontSize="small" /> },
        { label: 'Role Playing', path: '/enablement/learn/role-playing', icon: <RecordVoiceOverOutlined fontSize="small" /> },
        { label: 'My Certificates', path: '/enablement/learn/certificates', icon: <WorkspacePremiumOutlined fontSize="small" /> },
      ],
    },
    {
      label: 'Resources',
      icon: <FolderOutlined fontSize="small" />,
      items: [
        { label: 'Library', path: '/enablement/resources', icon: <CollectionsOutlined fontSize="small" /> },
        { label: 'Kits', path: '/enablement/kits', icon: <Inventory2Outlined fontSize="small" /> },
        { label: 'Releases and Updates', path: '/enablement/updates', icon: <UpdateOutlined fontSize="small" /> },
      ],
    },
    {
      label: 'AI Assistant',
      icon: <SmartToyOutlined fontSize="small" />,
      items: [
        { label: 'AI Assistant', path: '/enablement/ai', icon: <SmartToyOutlined fontSize="small" /> },
      ],
      defaultExpanded: false,
    },
    {
      label: 'Insights',
      icon: <InsightsOutlined fontSize="small" />,
      items: [
        { label: 'Analytics', path: '/enablement/analytics', icon: <BarChartOutlined fontSize="small" /> },
        { label: 'Adoption', path: '/enablement/insights/adoption', icon: <PeopleOutlineOutlined fontSize="small" /> },
        { label: 'Learning', path: '/enablement/insights/learning', icon: <TimelineOutlined fontSize="small" /> },
        { label: 'Resource Performance', path: '/enablement/insights/resources', icon: <QueryStatsOutlined fontSize="small" /> },
        { label: 'Search and AI', path: '/enablement/insights/search-ai', icon: <ManageSearchOutlined fontSize="small" /> },
      ],
    },
    {
      label: 'Admin',
      icon: <AdminPanelSettingsOutlined fontSize="small" />,
      items: [
        { label: 'Users & Roles', path: '/enablement/admin/users', icon: <ManageAccountsOutlined fontSize="small" /> },
        {
          label: 'Learning Admin',
          path: '/enablement/admin/learning',
          icon: <SchoolOutlined fontSize="small" />,
          children: [
            { label: 'Courses', path: '/enablement/admin/learning/courses', icon: <MenuBookOutlined fontSize="small" /> },
            { label: 'Learning Paths', path: '/enablement/admin/learning/paths', icon: <AltRouteOutlined fontSize="small" /> },
            { label: 'Assignments', path: '/enablement/admin/learning/assignments', icon: <AssignmentIndOutlined fontSize="small" /> },
            { label: 'Certificate Templates', path: '/enablement/admin/learning/certificates', icon: <WorkspacePremiumOutlined fontSize="small" /> },
            { label: 'Media Library', path: '/enablement/admin/learning/media', icon: <PermMediaOutlined fontSize="small" /> },
          ],
        },
        { label: 'Lists', path: '/enablement/admin/taxonomy', icon: <CategoryOutlined fontSize="small" /> },
      ],
      adminOnly: true,
    },
  ];

  // Initialize expanded state: all groups collapsed by default
  // Also track expanded state for nested items (e.g., Learning Admin)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      initial[group.label] = group.defaultExpanded ?? false;
    });
    // Check if we're on a Learning Admin route and expand it
    if (location.pathname.startsWith('/enablement/admin/learning')) {
      initial['Admin'] = true;
      initial['Learning Admin'] = true;
    }
    return initial;
  });

  // Auto-expand group if current route matches any item in that group
  // Also auto-expand nested items (e.g., Learning Admin) when on their routes
  useEffect(() => {
    const currentPath = location.pathname;
    const newExpanded: Record<string, boolean> = { ...expandedGroups };
    
    navGroups.forEach((group) => {
      // Check if current path matches any item in this group
      const hasActiveItem = group.items.some((item) => {
        if (item.path === '/enablement') {
          return currentPath === '/enablement' || currentPath === '/enablement/';
        }
        // Check item path
        if (currentPath.startsWith(item.path)) {
          return true;
        }
        // Check nested children
        if (item.children) {
          return item.children.some((child) => currentPath.startsWith(child.path));
        }
        return false;
      });
      
      if (hasActiveItem && !newExpanded[group.label]) {
        newExpanded[group.label] = true;
      }
      
      // Auto-expand nested items (e.g., Learning Admin) when on their routes
      group.items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((child) => currentPath.startsWith(child.path));
          // Also check if current path matches the parent path exactly or is a child route
          const isParentRoute = currentPath === item.path || currentPath.startsWith(item.path + '/');
          if ((hasActiveChild || isParentRoute) && !newExpanded[item.label]) {
            newExpanded[item.label] = true;
          }
        }
      });
    });
    
    setExpandedGroups(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Filter groups based on role
  const visibleGroups = navGroups.filter((group) => {
    if (group.adminOnly && !userIsAdmin) return false;
    return true;
  });

  // Filter items within groups
  const getVisibleItems = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      // Headers are always visible if their group is visible
      if (item.isHeader) return true;
      return true;
    });
  };

  const isActive = (path: string) => {
    if (path === '/enablement') {
      return location.pathname === '/enablement' || location.pathname === '/enablement/';
    }
    // For paths with children, check if pathname matches the parent path or one of its children
    // This prevents parent items from matching sibling routes (e.g., Learning Admin matching Taxonomy)
    const navItem = navGroups
      .flatMap((group) => group.items)
      .find((item) => item.path === path);
    if (navItem?.children) {
      // Parent item with children: match exact path or match one of its children
      if (location.pathname === path) {
        return true;
      }
      // Check if pathname matches any child path
      return navItem.children.some((child) => location.pathname.startsWith(child.path));
    }
    // Regular item: match if pathname starts with path
    return location.pathname.startsWith(path);
  };

  // Handle navigation - close mobile drawer on selection
  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      closeMobileNav();
    }
  };

  // Toggle group expansion
  const handleGroupToggle = (groupLabel: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  // Toggle nested item expansion (e.g., Learning Admin)
  const handleNestedItemToggle = (itemLabel: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [itemLabel]: !prev[itemLabel],
    }));
  };

  // Render a single nav item (supports nested children)
  const renderNavItem = (item: NavItem, indent: boolean = false) => {
    // Handle subsection headers
    if (item.isHeader) {
      if (isCollapsed) {
        return null; // Don't show headers in collapsed mode
      }
      return (
        <Box key={item.label} sx={{ px: 2, py: 1 }}>
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {item.label}
          </Typography>
        </Box>
      );
    }

    // Check if item has children (nested items)
    const hasChildren = item.children && item.children.length > 0;
    const isNestedExpanded = hasChildren ? expandedGroups[item.label] ?? false : false;
    
    // Check if any child is active
    const hasActiveChild = hasChildren && item.children!.some((child) => isActive(child.path));
    const itemIsActive = isActive(item.path) || hasActiveChild;
    
    if (isCollapsed) {
      return (
        <Tooltip key={item.path} title={item.label} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              selected={itemIsActive}
              onClick={() => {
                if (hasChildren) {
                  handleNestedItemToggle(item.label);
                } else {
                  handleNavClick(item.path);
                }
              }}
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

    // Render parent item with children (collapsible)
    if (hasChildren) {
      return (
        <Box key={item.path}>
          <ListItem disablePadding>
            <ListItemButton
              selected={itemIsActive}
              onClick={() => {
                // Toggle expansion (don't navigate for parent items with children)
                handleNestedItemToggle(item.label);
              }}
              sx={{
                pl: indent ? 4 : 2,
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
              {isNestedExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isNestedExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderNavItem(child, true))}
            </List>
          </Collapse>
        </Box>
      );
    }

    // Render regular item (no children)
    return (
      <ListItem key={item.path} disablePadding>
        <ListItemButton
          selected={itemIsActive}
          onClick={() => handleNavClick(item.path)}
          sx={{
            pl: indent ? 4 : 2,
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
  };

  // Render a nav group
  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups[group.label] ?? false;
    const hasActiveItem = group.items.some((item) => isActive(item.path));

    if (isCollapsed) {
      // Collapsed mode: show only group icon, expand on hover/click
      return (
        <Tooltip key={group.label} title={group.label} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleGroupToggle(group.label)}
              sx={{
                justifyContent: 'center',
                px: 1,
                bgcolor: hasActiveItem ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
                {group.icon}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      );
    }

    // Expanded mode: show group header and items
    return (
      <Box key={group.label}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleGroupToggle(group.label)}
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {group.icon}
            </ListItemIcon>
            <ListItemText primary={group.label} />
            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
        </ListItem>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {getVisibleItems(group.items).map((item) => renderNavItem(item, true))}
          </List>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />
      </Box>
    );
  };

  // Render nav content (shared between permanent and temporary drawer)
  const renderNavContent = () => (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        {visibleGroups.map((group, index) => {
          // Special handling for single-item groups (Home, AI Assistant) - no collapse needed
          if (group.items.length === 1) {
            return (
              <Box key={group.label}>
                {renderNavItem(group.items[0])}
                <Divider sx={{ my: 0.5 }} />
              </Box>
            );
          }
          return renderNavGroup(group);
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
