import { ReactNode } from 'react';
import { Box, Container } from '@mui/material';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - 240px)` },
        mt: 8,
      }}
    >
      <Container maxWidth="xl">{children}</Container>
    </Box>
  );
}

