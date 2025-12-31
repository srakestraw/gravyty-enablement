import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

export function QuizzesPage() {
  return (
    <PlaceholderPage
      title="Quizzes"
      description="Test your knowledge and track your progress with interactive quizzes and assessments."
    >
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          What will live here:
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="Interactive quizzes tied to courses and learning paths" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Knowledge assessments to validate understanding" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Immediate feedback and explanations for answers" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Score tracking and completion certificates" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Retake options and progress history" />
          </ListItem>
        </List>
      </Box>
    </PlaceholderPage>
  );
}



