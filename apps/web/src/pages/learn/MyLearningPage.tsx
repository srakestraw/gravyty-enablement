import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

export function MyLearningPage() {
  return (
    <PlaceholderPage
      title="My Learning"
      description="Track your learning progress, view assigned courses, and manage your learning journey."
    >
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="Personalized learning dashboard with progress tracking" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Assigned courses and learning paths" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Completion status and certificates earned" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Recommended content based on your role and interests" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Quick access to continue where you left off" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

