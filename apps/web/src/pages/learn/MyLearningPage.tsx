/**
 * My Learning Page
 * 
 * Personalized learning dashboard showing required, in-progress, and completed learning
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
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from '@mui/material';
import {
  PlayArrowOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  AssignmentOutlined,
} from '@mui/icons-material';
import { useLmsMe } from '../../hooks/useLmsMe';
import { useLmsCourse } from '../../hooks/useLmsCourse';
import { useLmsPath } from '../../hooks/useLmsPaths';
import { track } from '../../lib/telemetry';
import { useAuth } from '../../contexts/AuthContext';
import type { CourseSummary } from '@gravyty/domain';
import { formatDurationMinutes } from '../../utils/formatDuration';

function CourseCard({ course, onResume }: { course: CourseSummary; onResume: () => void }) {
  return (
    <Card>
      <CardActionArea onClick={onResume}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Box
              component="img"
              src={course.cover_image_url || '/placeholder-course.png'}
              alt={course.title}
              sx={{
                width: 120,
                height: 80,
                objectFit: 'cover',
                borderRadius: 1,
                mr: 2,
                bgcolor: 'grey.200',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                {course.title}
              </Typography>
              {course.short_description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {course.short_description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {course.estimated_minutes && (
                  <Chip
                    label={formatDurationMinutes(course.estimated_minutes)}
                    size="small"
                    variant="outlined"
                  />
                )}
                {course.difficulty_level && (
                  <Chip
                    label={course.difficulty_level}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function RequiredItemCard({
  item,
  onOpen,
}: {
  item: {
    type: 'course' | 'path';
    course_id?: string;
    path_id?: string;
    title: string;
    due_at?: string;
    assignment_id?: string;
    progress_percent: number;
  };
  onOpen: () => void;
}) {
  const isOverdue = item.due_at ? new Date(item.due_at) < new Date() : false;

  return (
    <Card>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AssignmentOutlined fontSize="small" color="primary" />
                <Typography variant="h6" component="h3">
                  {item.title}
                </Typography>
              </Box>
              {item.due_at && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ScheduleOutlined fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Due: {new Date(item.due_at).toLocaleDateString()}
                  </Typography>
                  {isOverdue && (
                    <Chip label="Overdue" size="small" color="error" />
                  )}
                </Box>
              )}
              {item.progress_percent > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progress: {item.progress_percent}%
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 4,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${item.progress_percent}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function MyLearningPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { learning, loading, error, refetch } = useLmsMe();

  useEffect(() => {
    track('page_view', { page: 'my_learning' });
  }, []);

  const handleCourseClick = (courseId: string) => {
    navigate(`/enablement/learn/courses/${courseId}`);
  };

  const handlePathClick = (pathId: string) => {
    navigate(`/enablement/learn/paths/${pathId}`);
  };

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
        My Learning
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track required, in-progress, and completed learning
      </Typography>

      {/* Required Section */}
      {learning && learning.required.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentOutlined />
            Required
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {learning.required.map((item, index) => (
              <Grid item xs={12} md={6} key={index}>
                <RequiredItemCard
                  item={item}
                  onOpen={() => {
                    if (item.course_id) {
                      handleCourseClick(item.course_id);
                    } else if (item.path_id) {
                      handlePathClick(item.path_id);
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* In Progress Section */}
      {learning && learning.in_progress.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlayArrowOutlined />
            In Progress
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {learning.in_progress.map((item, index) => {
              // For MVP, we'll show a simplified card
              // In production, we'd fetch course/path details
              return (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card>
                    <CardActionArea
                      onClick={() => {
                        if (item.course_id) {
                          handleCourseClick(item.course_id);
                        } else if (item.path_id) {
                          handlePathClick(item.path_id);
                        }
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {item.title}
                        </Typography>
                        {item.progress_percent > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {item.progress_percent}% complete
                            </Typography>
                            <Box
                              sx={{
                                width: '100%',
                                height: 4,
                                bgcolor: 'grey.200',
                                borderRadius: 1,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${item.progress_percent}%`,
                                  height: '100%',
                                  bgcolor: 'primary.main',
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        <Button
                          startIcon={<PlayArrowOutlined />}
                          variant="contained"
                          size="small"
                          sx={{ mt: 2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.course_id) {
                              handleCourseClick(item.course_id);
                            } else if (item.path_id) {
                              handlePathClick(item.path_id);
                            }
                          }}
                        >
                          {item.current_lesson_id ? 'Resume' : 'Start'}
                        </Button>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Completed Section */}
      {learning && learning.completed.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleOutlined />
            Completed
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {learning.completed.map((item, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardActionArea
                    onClick={() => {
                      if (item.course_id) {
                        handleCourseClick(item.course_id);
                      } else if (item.path_id) {
                        handlePathClick(item.path_id);
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {item.title}
                      </Typography>
                      {item.completed_at && (
                        <Typography variant="body2" color="text.secondary">
                          Completed: {new Date(item.completed_at).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Empty State - only show if learning data loaded successfully */}
      {learning &&
        !error &&
        learning.required.length === 0 &&
        learning.in_progress.length === 0 &&
        learning.completed.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No learning activities yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Browse courses and learning paths to get started
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={() => navigate('/enablement/learn/courses')}>
                Browse Courses
              </Button>
              <Button variant="outlined" onClick={() => navigate('/enablement/learn/paths')}>
                Browse Paths
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
  );
}
