/**
 * Unified Search Card Component
 * 
 * Displays a search result card for any entity type
 */

import { Card, CardActionArea, CardContent, CardMedia, Typography, Chip, Box, Stack } from '@mui/material';
import type { UnifiedSearchResult } from '@gravyty/domain';
import { useNavigate } from 'react-router-dom';

export interface UnifiedSearchCardProps {
  result: UnifiedSearchResult;
}

export function UnifiedSearchCard({ result }: UnifiedSearchCardProps) {
  const navigate = useNavigate();
  
  const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
      case 'course':
        return 'Course';
      case 'learning_path':
        return 'Learning Path';
      case 'role_playing':
        return 'Role Playing';
      case 'content':
        return 'Content';
      case 'content_kit':
        return 'Content Kit';
      default:
        return entityType;
    }
  };
  
  const getEntityTypeColor = (entityType: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (entityType) {
      case 'course':
        return 'primary';
      case 'learning_path':
        return 'secondary';
      case 'role_playing':
        return 'success';
      case 'content':
        return 'default';
      case 'content_kit':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  const handleClick = () => {
    switch (result.entity_type) {
      case 'course':
        navigate(`/enablement/admin/learning/courses/${result.entity_id}`);
        break;
      case 'learning_path':
        navigate(`/enablement/admin/learning/paths/${result.entity_id}`);
        break;
      case 'content':
        navigate(`/enablement/content-hub/assets/${result.entity_id}`);
        break;
      case 'role_playing':
        // TODO: Add route when role playing is implemented
        break;
      case 'content_kit':
        // TODO: Add route when content kits are implemented
        break;
    }
  };
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={handleClick} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {result.cover_image && (
          <CardMedia
            component="img"
            height="140"
            image={result.cover_image.url}
            alt={result.title}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="div" sx={{ flex: 1 }}>
              {result.title}
            </Typography>
            <Chip
              label={getEntityTypeLabel(result.entity_type)}
              color={getEntityTypeColor(result.entity_type)}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          
          {result.short_description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {result.short_description}
            </Typography>
          )}
          
          {/* Metadata chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 'auto' }}>
            {result.metadata.product_ids && result.metadata.product_ids.length > 0 && (
              <Chip label={`${result.metadata.product_ids.length} Product${result.metadata.product_ids.length > 1 ? 's' : ''}`} size="small" variant="outlined" />
            )}
            {result.metadata.product_suite_ids && result.metadata.product_suite_ids.length > 0 && (
              <Chip label={`${result.metadata.product_suite_ids.length} Suite${result.metadata.product_suite_ids.length > 1 ? 's' : ''}`} size="small" variant="outlined" />
            )}
            {result.metadata.topic_tag_ids && result.metadata.topic_tag_ids.length > 0 && (
              <Chip label={`${result.metadata.topic_tag_ids.length} Tag${result.metadata.topic_tag_ids.length > 1 ? 's' : ''}`} size="small" variant="outlined" />
            )}
            {result.metadata.badge_ids && result.metadata.badge_ids.length > 0 && (
              <Chip label={`${result.metadata.badge_ids.length} Badge${result.metadata.badge_ids.length > 1 ? 's' : ''}`} size="small" variant="outlined" color="success" />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

