import { ReactNode } from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import { useShellLayout } from '../../contexts/ShellLayoutContext';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const theme = useTheme();
  const { navMode } = useShellLayout();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const expandedWidth = 280; // ~35 * 8px
  const collapsedWidth = 72; // ~9 * 8px
  const sidebarWidth = isMobile ? 0 : (navMode === 'expanded' ? expandedWidth : collapsedWidth);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${sidebarWidth}px)` },
        mt: 8,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Container maxWidth="xl">{children}</Container>
    </Box>
  );
}

