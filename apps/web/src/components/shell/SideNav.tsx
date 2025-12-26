import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import {
  LibraryBooks as ContentIcon,
  Chat as AssistantIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const navItems = [
  { label: 'Content', path: '/enablement/content', icon: ContentIcon },
  { label: 'Assistant', path: '/enablement/assistant', icon: AssistantIcon },
  { label: 'Notifications', path: '/enablement/notifications', icon: NotificationsIcon },
];

export function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        <List>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}

