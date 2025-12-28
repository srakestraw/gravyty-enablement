import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { PlaceholderPage } from '../../../components/shared/PlaceholderPage';
import { ComingSoon } from '../../../components/shared/ComingSoon';

export function AdminLearningAssignmentsPage() {
  return (
    <PlaceholderPage
      title="Assignments"
      description="Manage course assignments, track submissions, and grade learner work."
    >
      <ComingSoon description="Assignment management tools coming soon" />
      
      <Box sx={{ mt: 4, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Create and configure assignments for courses" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="View and manage assignment submissions" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Grade assignments and provide feedback" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Set due dates and assignment requirements" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Track assignment completion and performance" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

