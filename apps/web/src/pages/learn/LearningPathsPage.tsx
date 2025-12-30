/**
 * Learning Paths Catalog Page
 * 
 * Browse learning paths
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import { AltRouteOutlined } from '@mui/icons-material';
import { useLmsPaths } from '../../hooks/useLmsPaths';
import { track } from '../../lib/telemetry';
import type { PathSummary } from '@gravyty/domain';

function PathCard({ path, onClick }: { path: PathSummary; onClick: () => void }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <AltRouteOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                {path.title}
              </Typography>
              {path.short_description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {path.short_description}
                </Typography>
              )}
              {path.progress && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {path.progress.completed_courses} / {path.progress.total_courses} courses
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={path.progress.percent_complete}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  {path.progress.status === 'completed' && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      Completed
                    </Typography>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {path.estimated_duration_minutes && (
                  <Chip label={`${path.estimated_duration_minutes} min`} size="small" variant="outlined" />
                )}
                {path.course_count > 0 && (
                  <Chip label={`${path.course_count} courses`} size="small" variant="outlined" />
                )}
                {path.product_suite && (
                  <Chip label={path.product_suite} size="small" variant="outlined" />
                )}
              </Box>
              {path.topic_tags && path.topic_tags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                  {path.topic_tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function LearningPathsPage() {
  const navigate = useNavigate();
  const { paths, loading, error, nextCursor, refetch } = useLmsPaths({ limit: 20 });

  useEffect(() => {
    track('page_view', { page: 'learning_paths_catalog' });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={refetch} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Learning Paths
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Structured learning journeys and curricula
      </Typography>

      {paths.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No learning paths found
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {paths.map((path) => (
              <Grid item xs={12} md={6} lg={4} key={path.path_id}>
                <PathCard path={path} onClick={() => navigate(`/enablement/learn/paths/${path.path_id}`)} />
              </Grid>
            ))}
          </Grid>
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" onClick={refetch}>
                Load More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
