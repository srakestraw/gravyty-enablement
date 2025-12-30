/**
 * Admin Learning Page
 * 
 * Scaffold placeholder for future Learning Admin module implementation.
 * This page will provide course, path, and certificate management capabilities.
 */

import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { ComingSoon } from '../../components/shared/ComingSoon';

export function AdminLearningPage() {
  return (
    <PlaceholderPage
      title="Learning Admin"
      description="Manage courses, paths, and certificates"
    >
      <ComingSoon description="Learning administration tools coming soon" />
      
      <Box sx={{ mt: 4, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Courses (create, edit, publish)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Learning Paths (assemble and order courses)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Certificates (templates and awarding rules)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Assignments (optional, later)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Reporting (optional, later)" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}


