import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Chip,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import { Icon } from '../components/icons/Icon';

export function DesignCheckPage() {
  const [tabValue, setTabValue] = useState(0);
  const [textFieldValue, setTextFieldValue] = useState('');
  const [textFieldError, setTextFieldError] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Design System Verification
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This page verifies that all design system components render correctly with the token-driven theme.
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Buttons Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Buttons
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Variants: contained, outlined, text | Sizes: small, medium, large | States: default, disabled
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Button variant="contained" size="small">Small Contained</Button>
          <Button variant="contained" size="medium">Medium Contained</Button>
          <Button variant="contained" size="large">Large Contained</Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Button variant="outlined" size="small">Small Outlined</Button>
          <Button variant="outlined" size="medium">Medium Outlined</Button>
          <Button variant="outlined" size="large">Large Outlined</Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Button variant="text" size="small">Small Text</Button>
          <Button variant="text" size="medium">Medium Text</Button>
          <Button variant="text" size="large">Large Text</Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button variant="contained" disabled>Disabled Contained</Button>
          <Button variant="outlined" disabled>Disabled Outlined</Button>
          <Button variant="text" disabled>Disabled Text</Button>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* TextFields Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Text Fields
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          States: default, focused, error, disabled, helper text
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
          <TextField label="Default Text Field" placeholder="Enter text..." />
          <TextField
            label="Focused Text Field"
            placeholder="Click to focus"
            autoFocus
          />
          <TextField
            label="Error Text Field"
            placeholder="Has error"
            error={textFieldError}
            helperText={textFieldError ? 'This field has an error' : ''}
            value={textFieldValue}
            onChange={(e) => {
              setTextFieldValue(e.target.value);
              setTextFieldError(e.target.value.length > 0 && e.target.value.length < 3);
            }}
          />
          <TextField label="Disabled Text Field" placeholder="Disabled" disabled />
          <TextField
            label="Helper Text"
            placeholder="With helper text"
            helperText="This is helper text"
          />
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Tabs Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Tabs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Default and selected states
        </Typography>
        <Tabs value={tabValue} onChange={(_, newValue: number) => setTabValue(newValue)}>
          <Tab label="Tab One" />
          <Tab label="Tab Two" />
          <Tab label="Tab Three" />
        </Tabs>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderTop: 0 }}>
          <Typography>Selected tab: {tabValue + 1}</Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Chips Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Chips
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Default and selected states
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Chip label="Default Chip" />
          <Chip label="Primary Chip" color="primary" />
          <Chip label="Outlined Chip" variant="outlined" />
          <Chip label="Small Chip" size="small" />
          <Chip label="Selected Chip" color="primary" onClick={() => {}} />
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Cards Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Cards
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Normal card and card with header/content/actions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is a basic card with content only. It demonstrates the default card styling
                with proper spacing and elevation.
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Card with Header" subheader="Subheader text" />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                This card includes a header section with title and subheader, followed by content.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Action 1</Button>
              <Button size="small">Action 2</Button>
            </CardActions>
          </Card>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Alerts Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Success, info, warning, error variants
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
          <Alert severity="success">This is a success alert message.</Alert>
          <Alert severity="info">This is an info alert message.</Alert>
          <Alert severity="warning">This is a warning alert message.</Alert>
          <Alert severity="error">This is an error alert message.</Alert>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* SideNav Selected State Sample */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          SideNav Selected State
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Demonstrates the selected state styling for navigation items
        </Typography>
        <Paper sx={{ maxWidth: 300 }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton selected>
                <ListItemIcon>
                  <Icon name="book" />
                </ListItemIcon>
                <ListItemText primary="Selected Item" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Icon name="sparkles" />
                </ListItemIcon>
                <ListItemText primary="Unselected Item" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Icon name="bell" />
                </ListItemIcon>
                <ListItemText primary="Another Item" />
              </ListItemButton>
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  );
}

