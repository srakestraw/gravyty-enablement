/**
 * Admin Governance Page
 * 
 * Scaffold placeholder for future Governance module implementation.
 * This page will provide content approval workflows and governance controls.
 */

import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { ComingSoon } from '../../components/shared/ComingSoon';

export function AdminGovernancePage() {
  return (
    <PlaceholderPage
      title="Governance"
      description="Manage approvals, versions, expiry, and notification rules"
    >
      <ComingSoon description="Governance tools coming soon" />
      
      <Box sx={{ mt: 4, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Content approval workflows for reviewing and publishing courses, assets, and kits" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Version control and history tracking for content changes and rollback capabilities" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Expiry management with automated notifications for content that needs review or updates" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Notification rules configuration for alerts on content changes, approvals, and expirations" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Compliance tracking and reporting for content governance policies and standards" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

