import { AppBar, Toolbar, Typography, Box } from '@mui/material';

export function Header() {
  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Gravyty Enablement Portal
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* TODO: Add user menu, notifications icon, etc. */}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

