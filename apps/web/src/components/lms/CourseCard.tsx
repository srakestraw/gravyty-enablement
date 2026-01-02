/**
 * Shared Course Card Component
 * 
 * Reusable course card for catalog, related courses, paths, etc.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardActionArea, CardMedia, Box, Typography, Chip } from '@mui/material';
import { PlayArrowOutlined } from '@mui/icons-material';
import type { CourseSummary } from '@gravyty/domain';
import { formatDurationMinutes } from '../../utils/formatDuration';

export interface CourseCardProps {
  course: CourseSummary;
  onClick: () => void;
}

export function CourseCard({ course, onClick }: CourseCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Reset error state when cover_image_url changes
  useEffect(() => {
    console.log('[CourseCard] Cover image URL changed:', {
      courseId: course.course_id,
      title: course.title,
      coverImageUrl: course.cover_image_url,
      hasUrl: !!course.cover_image_url,
    });
    setImageError(false);
    setImageLoading(!!course.cover_image_url);
  }, [course.cover_image_url, course.course_id, course.title]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    console.error('[CourseCard] Image failed to load:', {
      url: course.cover_image_url,
      src: img.src,
      courseId: course.course_id,
      courseTitle: course.title,
    });
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const hasImage = !!course.cover_image_url;
  const showPlaceholder = imageError || !hasImage;
  const showImage = hasImage && !imageError;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
      <CardActionArea 
        onClick={onClick} 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {showImage && (
          <CardMedia
            component="img"
            height="140"
            image={course.cover_image_url}
            alt={course.title}
            onError={handleImageError}
            onLoad={handleImageLoad}
            key={course.cover_image_url} // Force re-render when URL changes
            sx={{ 
              objectFit: 'cover', 
              width: '100%',
            }}
          />
        )}
        {showPlaceholder && (
          <Box
            sx={{
              height: 140,
              width: '100%',
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
          {/* Metadata line: Duration · Difficulty · Updated Date */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 'auto' }}>
            {course.estimated_minutes && (
              <Typography variant="caption" color="text.secondary">
                {formatDurationMinutes(course.estimated_minutes)}
              </Typography>
            )}
            {course.estimated_minutes && course.difficulty_level && (
              <Typography variant="caption" color="text.secondary">·</Typography>
            )}
            {course.difficulty_level && (
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {course.difficulty_level}
              </Typography>
            )}
            {(course.estimated_minutes || course.difficulty_level) && (course as any).updated_at && (
              <Typography variant="caption" color="text.secondary">·</Typography>
            )}
            {(course as any).updated_at && (
              <Typography variant="caption" color="text.secondary">
                Updated {new Date((course as any).updated_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}



