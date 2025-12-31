/**
 * Learning Path Detail Page
 * 
 * Shows path details with ordered courses
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import { PlayArrowOutlined, CheckCircleOutlined, RadioButtonUncheckedOutlined } from '@mui/icons-material';
import { useLmsPath } from '../../hooks/useLmsPaths';
import { CourseCard } from '../../components/lms/CourseCard';
import { track } from '../../lib/telemetry';
import { lmsApi } from '../../api/lmsClient';
import { isErrorResponse } from '../../lib/apiClient';
import { useState } from 'react';
import { LinearProgress } from '@mui/material';

export function LearningPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { path, loading, error, refetch } = useLmsPath(pathId);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (pathId) {
      track('page_view', { page: 'learning_path_detail', path_id: pathId });
    }
  }, [pathId]);

  const handleStartPath = async () => {
    if (!path || path.courses.length === 0) return;
    
    setStarting(true);
    try {
      // Call start path API
      const response = await lmsApi.startPath(path.path_id, {
        telemetry: {
          source_page: 'learning_path_detail',
          ui_action: 'start_path',
        },
      });
      
      if (!isErrorResponse(response)) {
        // Navigate to next course or first course
        const nextCourseId = path.progress?.next_course_id || path.courses[0]?.course_id;
        if (nextCourseId) {
          navigate(`/enablement/learn/courses/${nextCourseId}`);
        }
        // Refetch to update progress
        await refetch();
      }
    } catch (err) {
      console.error('Failed to start path:', err);
    } finally {
      setStarting(false);
    }
  };

  const handleResumePath = () => {
    if (!path) return;
    const nextCourseId = path.progress?.next_course_id || path.courses[0]?.course_id;
    if (nextCourseId) {
      navigate(`/enablement/learn/courses/${nextCourseId}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !path) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Path not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {path.title}
        </Typography>
        {path.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {path.description}
          </Typography>
        )}
        
        {/* Progress Bar */}
        {path.progress && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" fontWeight="medium">
                {path.progress.completed_courses} of {path.progress.total_courses} courses completed
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {path.progress.percent_complete}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={path.progress.percent_complete}
              sx={{ height: 10, borderRadius: 1 }}
            />
            {path.progress.status === 'completed' && path.progress.completed_at && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                Completed on {new Date(path.progress.completed_at).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {path.product && <Chip label={path.product} />}
          {path.product_suite && <Chip label={path.product_suite} />}
          {path.estimated_duration_minutes && (
            <Chip label={`${path.estimated_duration_minutes} min`} />
          )}
          {path.courses.length > 0 && <Chip label={`${path.courses.length} courses`} />}
        </Box>
        {path.courses.length > 0 && (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowOutlined />}
            onClick={path.progress?.status === 'not_started' ? handleStartPath : handleResumePath}
            disabled={starting || path.progress?.status === 'completed'}
          >
            {starting
              ? 'Starting...'
              : path.progress?.status === 'completed'
              ? 'Completed'
              : path.progress?.status === 'in_progress'
              ? 'Resume Path'
              : 'Start Path'}
          </Button>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Courses */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Courses in this Path
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {path.courses.map((courseRef, index) => {
            const isCompleted = path.course_completion?.[courseRef.course_id] || false;
            // Handle both hydrated courses and ref-only cases
            if (courseRef.course) {
              // Hydrated course - show full card
              return (
                <Grid item xs={12} sm={6} md={4} key={courseRef.course_id}>
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: isCompleted ? 'success.main' : 'primary.main',
                        color: 'white',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                      }}
                    >
                      {isCompleted ? <CheckCircleOutlined sx={{ fontSize: 20 }} /> : index + 1}
                    </Box>
                    {isCompleted && (
                      <Chip
                        label="Completed"
                        color="success"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      />
                    )}
                    <CourseCard
                      course={courseRef.course}
                      onClick={() => navigate(`/enablement/learn/courses/${courseRef.course_id}`)}
                    />
                  </Box>
                </Grid>
              );
            } else {
              // Ref-only - show minimal card with course_id
              const isCompleted = path.course_completion?.[courseRef.course_id] || false;
              return (
                <Grid item xs={12} sm={6} md={4} key={courseRef.course_id}>
                  <Card>
                    <CardActionArea onClick={() => navigate(`/enablement/learn/courses/${courseRef.course_id}`)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              bgcolor: isCompleted ? 'success.main' : 'primary.main',
                              color: 'white',
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isCompleted ? <CheckCircleOutlined sx={{ fontSize: 20 }} /> : index + 1}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6">
                              {courseRef.title_override || `Course ${index + 1}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {courseRef.course_id}
                            </Typography>
                            {isCompleted && (
                              <Chip label="Completed" color="success" size="small" sx={{ mt: 1 }} />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            }
          })}
        </Grid>
      </Box>
    </Box>
  );
}

