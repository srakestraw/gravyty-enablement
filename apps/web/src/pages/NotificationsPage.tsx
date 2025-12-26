import { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { track } from '../lib/telemetry';

// Fake data - will be replaced with API calls later
const fakeNotifications = [
  {
    id: '1',
    type: 'info',
    title: 'New Content Available',
    message: 'New product overview document has been added',
    timestamp: '2024-01-15 10:30 AM',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Content Updated',
    message: 'Sales playbook has been updated with new information',
    timestamp: '2024-01-14 2:15 PM',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Content Expiring Soon',
    message: 'Customer onboarding guide will expire in 7 days',
    timestamp: '2024-01-13 9:00 AM',
    read: true,
  },
  {
    id: '4',
    type: 'info',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on January 20th, 2-4 AM EST',
    timestamp: '2024-01-12 5:00 PM',
    read: true,
  },
];

const iconMap = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const colorMap = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const;

export function NotificationsPage() {
  useEffect(() => {
    track('page_view', { page: 'notifications' });
    track('notification_view', { count: fakeNotifications.length });
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Stay updated with the latest enablement content and system updates
      </Typography>
      <List>
        {fakeNotifications.map((notification) => {
          const Icon = iconMap[notification.type as keyof typeof iconMap];
          const color = colorMap[notification.type as keyof typeof colorMap];
          return (
            <Card key={notification.id} sx={{ mb: 2, opacity: notification.read ? 0.7 : 1 }}>
              <CardContent>
                <ListItem disablePadding>
                  <ListItemIcon>
                    <Icon color={color} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{notification.title}</Typography>
                        {!notification.read && (
                          <Chip label="New" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.timestamp}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </CardContent>
            </Card>
          );
        })}
      </List>
    </Box>
  );
}

