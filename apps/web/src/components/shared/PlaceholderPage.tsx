/**
 * Placeholder Page Component
 * 
 * Standard scaffold for placeholder pages with title, description, and content area.
 */

import { ReactNode } from 'react';
import { Box, Typography, Container } from '@mui/material';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Container>
  );
}




