/**
 * Shared Course Card Component
 * 
 * Reusable course card for catalog, related courses, paths, etc.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardActionArea, CardMedia, Box, Typography, Chip, IconButton } from '@mui/material';
import { PlayArrowOutlined, MoreVert } from '@mui/icons-material';
import type { CourseSummary } from '@gravyty/domain';
import { formatDurationMinutes } from '../../utils/formatDuration';

export interface CourseCardProps {
  course: CourseSummary;
  onClick: () => void;
  onMenuClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export function CourseCard({ course, onClick, onMenuClick }: CourseCardProps) {
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

  const handleMenuClickInternal = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (onMenuClick) {
      onMenuClick(e);
    }
  };

  const hasImage = !!course.cover_image_url;
  const showPlaceholder = imageError || !hasImage;
  const showImage = hasImage && !imageError;

  // Status label and color
  const statusLabel = course.status === 'published' ? 'Published' : course.status === 'archived' ? 'Archived' : 'Draft';
  const statusColor = course.status === 'published' ? 'success' : course.status === 'archived' ? 'default' : 'warning';

  // Helper function to render pills with overflow handling
  const renderPills = (items: string[], maxVisible: number = 2) => {
    if (!items || items.length === 0) return null;
    
    const visible = items.slice(0, maxVisible);
    const remaining = items.length - maxVisible;
    
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {visible.map((item, index) => (
          <Chip
            key={index}
            label={item}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        ))}
        {remaining > 0 && (
          <Chip
            label={`+${remaining}`}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem', color: 'text.secondary' }}
          />
        )}
      </Box>
    );
  };

  // Products - currently single product, but ready for array
  const products = course.product ? [course.product] : [];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
      {/* Header with status and menu */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, pb: 1 }}>
        <Chip
          label={statusLabel}
          size="small"
          color={statusColor}
          variant={course.status === 'published' ? 'filled' : 'outlined'}
          sx={{ height: 24 }}
        />
        {onMenuClick && (
          <IconButton
            size="small"
            onClick={handleMenuClickInternal}
            sx={{ p: 0.5 }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        )}
      </Box>

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
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {course.title}
          </Typography>
          {course.short_description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {course.short_description}
            </Typography>
          )}

          {/* Products Pills */}
          {products.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Products:
              </Typography>
              {renderPills(products, 2)}
            </Box>
          )}

          {/* Suite Pill */}
          {course.product_suite && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Suite:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={course.product_suite}
                  size="small"
                  variant="outlined"
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
              </Box>
            </Box>
          )}

          {/* Tags Pills */}
          {course.topic_tags && course.topic_tags.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Tags:
              </Typography>
              {renderPills(course.topic_tags, 2)}
            </Box>
          )}

          {/* Metadata line: Duration · Difficulty · Updated Date */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 'auto', pt: 1 }}>
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



