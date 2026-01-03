/**
 * Course Card Component
 * 
 * Pinned card at the top of the left column showing course metadata
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  School as CourseIcon,
} from '@mui/icons-material';
import type { Course } from '@gravyty/domain';

export interface CourseCardProps {
  course: Course | null;
  issuesCount?: number;
  onEditDetails: () => void;
}

export function CourseCard({ course, issuesCount = 0, onEditDetails }: CourseCardProps) {
  if (!course) {
    return null;
  }

  const status = course.status || 'draft';
  const statusColor = status === 'published' ? 'success' : 'default';
  const statusLabel = status === 'published' ? 'Published' : 'Draft';

  return (
    <Card
      sx={{
        mb: 2,
        border: 1,
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <CourseIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={course.title || 'Untitled Course'}
            >
              {course.title || 'Untitled Course'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Chip
            label={statusLabel}
            size="small"
            color={statusColor}
            variant={status === 'published' ? 'filled' : 'outlined'}
          />
          {issuesCount > 0 && (
            <Tooltip title={`${issuesCount} blocking issue${issuesCount !== 1 ? 's' : ''}`}>
              <Chip
                label={issuesCount}
                size="small"
                color="error"
                sx={{ height: 20, fontSize: '0.7rem', minWidth: 24 }}
              />
            </Tooltip>
          )}
        </Box>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          onClick={onEditDetails}
          sx={{ mt: 1 }}
        >
          Edit details
        </Button>
      </CardContent>
    </Card>
  );
}


