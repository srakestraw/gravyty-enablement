/**
 * Coming Soon Component
 * 
 * Reusable placeholder component for features that are not yet implemented.
 */

import { Box, Typography, Card, CardContent } from '@mui/material';
import { ConstructionOutlined } from '@mui/icons-material';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ title = 'Coming Soon', description }: ComingSoonProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <ConstructionOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}



