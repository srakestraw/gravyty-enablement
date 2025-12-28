import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

export function PracticePage() {
  return (
    <PlaceholderPage
      title="Role Playing"
      description="Practice sales conversations and customer interactions through interactive role-playing scenarios."
    >
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="Interactive role-playing scenarios for sales and CSM teams" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Practice conversations with AI-powered role-play partners" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Feedback and coaching on communication skills" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Scenario library organized by use case and industry" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Progress tracking and performance analytics" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}

