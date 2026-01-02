/**
 * App Header Component
 * 
 * Global header with logo, notifications, and user menu.
 * Uses MUI + Design System tokens for consistent styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Badge,
  Avatar,
  Popover,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  useTheme,
  InputBase,
  Paper,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import {
  SearchOutlined,
  NotificationsOutlined,
  AccountCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  MenuOpenOutlined,
} from '@mui/icons-material';
import { useShellLayout } from '../../contexts/ShellLayoutContext';
import { Icon } from '../icons/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsApi, type Notification } from '../../lib/apiClient';
import { track, TELEMETRY_EVENTS } from '../../lib/telemetry';

/**
 * Get user initials from name, email, or userId
 */
function getUserInitials(user: { name?: string; email?: string; userId?: string }): string {
  // Prefer name if available
  const displayName = user.name || user.email?.split('@')[0] || user.userId || 'U';
  const parts = displayName.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
}

/**
 * Format notification time (relative or absolute)
 */
function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function Header() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, loading, isAuth, signIn, signOut } = useAuth();
  const { navMode, toggleNav, openMobileNav } = useShellLayout();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null);
  const notificationsOpen = Boolean(notificationsAnchor);

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  // Optimistic read state (for mark as read)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load notifications when authenticated and popover opens
  useEffect(() => {
    if (isAuth && notificationsOpen && notifications.length === 0 && !notificationsLoading) {
      // For now, show placeholder notifications
      // TODO: Replace with actual API call when endpoint is available
      setNotifications([
        {
          id: '1',
          title: 'Welcome to Enablement Portal',
          message: 'Get started by exploring courses and assets',
          created_at: new Date().toISOString(),
          type: 'info',
        },
        {
          id: '2',
          title: 'New course available',
          message: 'Check out the latest enablement course',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          type: 'action',
        },
        {
          id: '3',
          title: 'Asset updated',
          message: 'A brand asset has been updated',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          type: 'info',
        },
      ]);
      // loadNotifications(); // Uncomment when API is ready
    }
  }, [isAuth, notificationsOpen]);

  const loadNotifications = async () => {
    if (!isAuth) return;
    
    setNotificationsLoading(true);
    try {
      const response = await notificationsApi.list(20);
      if (!('error' in response)) {
        setNotifications(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleSignIn = async () => {
    track(TELEMETRY_EVENTS.LOGIN_CTA_CLICKED, { source: 'header' });
    try {
      await signIn();
    } catch (error) {
      console.error('[Header] Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in. Please try again.';
      alert(`Sign in failed: ${errorMessage}`);
    }
  };

  const handleSignOut = async () => {
    track(TELEMETRY_EVENTS.SIGN_OUT_CLICKED);
    try {
      await signOut();
      setUserMenuAnchor(null);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLogoClick = () => {
    if (isAuth) {
      navigate('/enablement');
    } else {
      navigate('/');
    }
  };

  // Notifications handlers
  const handleNotificationsClick = (event: React.MouseEvent<HTMLElement>) => {
    track(TELEMETRY_EVENTS.NOTIFICATION_OPENED);
    setNotificationsAnchor(event.currentTarget);
    if (notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    track(TELEMETRY_EVENTS.NOTIFICATION_CLICKED, { notification_id: notification.id });
    
    // Optimistically mark as read
    if (!notification.read_at && !readIds.has(notification.id)) {
      setReadIds(new Set([...readIds, notification.id]));
      // TODO: Call API when endpoint is available
      notificationsApi.markRead(notification.id).catch(console.error);
    }

    handleNotificationsClose();
    
    // Navigate to target_url or notifications page
    if (notification.target_url) {
      navigate(notification.target_url);
    } else {
      navigate('/enablement/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistically mark all as read
    const unreadIds = notifications
      .filter(n => !n.read_at && !readIds.has(n.id))
      .map(n => n.id);
    setReadIds(new Set([...readIds, ...unreadIds]));
    
    // TODO: Call API when endpoint is available
    notificationsApi.markAllRead().catch(console.error);
  };

  const handleViewAllNotifications = () => {
    handleNotificationsClose();
    navigate('/enablement/notifications');
  };

  // User menu handlers
  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    track(TELEMETRY_EVENTS.USER_MENU_OPENED);
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Calculate unread count (placeholder: show static value 3 for now)
  // TODO: Replace with actual unread count when notifications API is implemented
  const unreadCount = notifications.length > 0
    ? notifications.filter(n => !n.read_at && !readIds.has(n.id)).length
    : 3; // Placeholder static value

  const isAdmin = user?.role === 'Admin' || import.meta.env.VITE_DEV_ROLE === 'Admin';

  return (
    <AppBar 
      position="fixed" 
      elevation={1} 
      sx={{ 
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 }, width: '100%', position: 'relative' }}>
        {/* Left: Nav Toggle (authenticated only) */}
        {isAuth && (
          <Tooltip title={isMobile ? 'Open navigation' : navMode === 'expanded' ? 'Collapse navigation' : 'Expand navigation'}>
            <IconButton
              onClick={isMobile ? openMobileNav : toggleNav}
              aria-label={isMobile ? 'Open navigation' : navMode === 'expanded' ? 'Collapse navigation' : 'Expand navigation'}
              sx={{
                mr: 1,
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {isMobile ? (
                <MenuOutlined fontSize="small" />
              ) : navMode === 'expanded' ? (
                <MenuOpenOutlined fontSize="small" />
              ) : (
                <MenuOutlined fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}

        {/* Logo */}
        <Box
          component="button"
          onClick={handleLogoClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            mr: { xs: 2, sm: 3 },
          }}
          aria-label={isAuth ? 'Go to home' : 'Go to landing page'}
        >
          <Box
            component="img"
            src="/images/logos/gravyty-logo.svg"
            alt="Gravyty"
            sx={{
              height: { xs: 28, sm: 32 },
              width: 'auto',
            }}
          />
        </Box>

        {/* Center: Search (authenticated only) - absolutely centered */}
        {isAuth && (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: { xs: 'none', md: 400 },
              width: { xs: 'calc(100% - 200px)', sm: 400 },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Paper
              component="form"
              sx={{
                p: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: Implement search
              }}
            >
              <IconButton
                type="button"
                sx={{ p: '4px', color: 'text.secondary' }}
                aria-label="Search"
                disabled
              >
                <SearchOutlined fontSize="small" />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search courses, assets, and more..."
                inputProps={{ 'aria-label': 'Search' }}
                disabled
              />
            </Paper>
          </Box>
        )}

        {/* Spacer to balance layout */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right: Actions - Notifications and User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : isAuth && user ? (
            <>
              {/* Temporary debug label */}
              {import.meta.env.DEV && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    mr: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  Role: {user.role || 'Unknown'} | Auth: {user.authMode || 'Unknown'}
                </Typography>
              )}
              {/* Notifications Bell */}
              <IconButton
                onClick={handleNotificationsClick}
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={notificationsOpen}
                sx={{
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error">
                  <NotificationsOutlined fontSize="small" />
                </Badge>
              </IconButton>

              {/* Notifications Popover */}
              <Popover
                open={notificationsOpen}
                anchorEl={notificationsAnchor}
                onClose={handleNotificationsClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    width: { xs: 'calc(100vw - 32px)', sm: 400 },
                    maxHeight: 500,
                    mt: 1,
                    borderRadius: 2,
                    boxShadow: 4,
                  },
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="h6" component="h2">
                    Notifications
                  </Typography>
                  {unreadCount > 0 && (
                    <Button
                      size="small"
                      onClick={handleMarkAllRead}
                      sx={{ textTransform: 'none' }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </Box>

                {/* Content */}
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {notificationsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No notifications
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {notifications.slice(0, 8).map((notification) => {
                        const isRead = notification.read_at || readIds.has(notification.id);
                        return (
                          <ListItem
                            key={notification.id}
                            disablePadding
                            sx={{
                              bgcolor: isRead ? 'transparent' : 'action.hover',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <ListItemButton
                              onClick={() => handleNotificationClick(notification)}
                              sx={{ py: 1.5, px: 2 }}
                            >
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: isRead ? 400 : 600,
                                    }}
                                  >
                                    {notification.title}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', mt: 0.5 }}
                                    >
                                      {notification.message}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', mt: 0.5 }}
                                    >
                                      {formatNotificationTime(notification.created_at)}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>

                {/* Footer */}
                {notifications.length > 0 && (
                  <>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                      <Button
                        fullWidth
                        onClick={handleViewAllNotifications}
                        sx={{ textTransform: 'none' }}
                      >
                        View all notifications
                      </Button>
                    </Box>
                  </>
                )}
              </Popover>

              {/* User Avatar Menu */}
              <IconButton
                onClick={handleUserMenuClick}
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                sx={{
                  p: 0.5,
                  '&:hover': {
                    bgcolor: 'transparent',
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {getUserInitials(user)}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={userMenuAnchor}
                open={userMenuOpen}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: 4,
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {user.name || user.email || user.userId}
                  </Typography>
                  {user.role && (
                    <Typography variant="caption" color="text.secondary">
                      {user.role}
                    </Typography>
                  )}
                </Box>
                <Divider />
                {/* TODO: Add "My Profile" menu item when profile page exists */}
                {isAdmin && (
                  <>
                    {/* TODO: Add "Admin" menu item when admin page exists */}
                    <Divider />
                  </>
                )}
                <MenuItem onClick={handleSignOut}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LogoutOutlined fontSize="small" />
                    <Typography>Sign out</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<AccountCircleOutlined />}
              onClick={handleSignIn}
              sx={{
                textTransform: 'none',
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
