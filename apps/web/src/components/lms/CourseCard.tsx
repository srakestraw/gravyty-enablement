/**
 * Shared Course Card Component
 * 
 * Reusable course card for catalog, related courses, paths, etc.
 */

import { Card, CardContent, CardActionArea, CardMedia, Box, Typography, Chip } from '@mui/material';
import { PlayArrowOutlined } from '@mui/icons-material';
import type { CourseSummary } from '@gravyty/domain';

export interface CourseCardProps {
  course: CourseSummary;
  onClick: () => void;
}

export function CourseCard({ course, onClick }: CourseCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={onClick} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {course.cover_image_url ? (
          <CardMedia
            component="img"
            height="140"
            image={course.cover_image_url}
            alt={course.title}
            sx={{ objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: 140,
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayArrowOutlined sx={{ fontSize: 48, color: 'grey.400' }} />
          </Box>
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {course.title}
          </Typography>
          {course.short_description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {course.short_description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
            {course.estimated_duration_minutes && (
              <Chip label={`${course.estimated_duration_minutes} min`} size="small" variant="outlined" />
            )}
            {course.difficulty_level && (
              <Chip label={course.difficulty_level} size="small" variant="outlined" />
            )}
            {course.product_suite && (
              <Chip label={course.product_suite} size="small" variant="outlined" />
            )}
          </Box>
          {course.topic_tags && course.topic_tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
              {course.topic_tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}


