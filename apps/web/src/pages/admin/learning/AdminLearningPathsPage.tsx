import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { PlaceholderPage } from '../../../components/shared/PlaceholderPage';
import { ComingSoon } from '../../../components/shared/ComingSoon';

export function AdminLearningPathsPage() {
  return (
    <PlaceholderPage
      title="Learning Paths"
      description="Create and manage structured learning paths that guide learners through sequential courses and content."
    >
      <ComingSoon description="Learning path management tools coming soon" />
      
      <Box sx={{ mt: 4, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Create and configure learning paths" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Sequence courses and content in logical order" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Set prerequisites and completion requirements" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Assign learning paths to users or groups" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlined fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Track progress and completion across paths" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

