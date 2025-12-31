/**
 * Course Detail Page
 * 
 * Shows course outline, description, and enrollment
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Grid,
  Divider,
} from '@mui/material';
import {
  PlayArrowOutlined,
  CheckCircleOutlined,
  RadioButtonUncheckedOutlined,
  ArrowForwardOutlined,
} from '@mui/icons-material';
import { useLmsCourse } from '../../hooks/useLmsCourse';
import { lmsApi } from '../../api/lmsClient';
import { track } from '../../lib/telemetry';
import { isErrorResponse } from '../../lib/apiClient';
import { CourseCard } from '../../components/lms/CourseCard';
import { formatDurationMinutes } from '../../utils/formatDuration';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, relatedCourses, loading, error, refetch } = useLmsCourse(courseId);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (courseId) {
      track('page_view', { page: 'course_detail', course_id: courseId });
    }
  }, [courseId]);

  const handleStartOrResume = async () => {
    if (!courseId) return;

    setEnrolling(true);
    try {
      const response = await lmsApi.createEnrollment({
        course_id: courseId,
        origin: 'self_enrolled',
      });

      if (isErrorResponse(response)) {
        alert(`Failed to enroll: ${response.error.message}`);
        return;
      }

      // Navigate to first lesson or resume lesson
      const enrollment = response.data.enrollment;
      if (enrollment.current_lesson_id && course) {
        // Find the lesson in the course outline
        const lesson = course.sections
          .flatMap((s) => s.lessons)
          .find((l) => l.lesson_id === enrollment.current_lesson_id);
        if (lesson) {
          navigate(`/enablement/learn/courses/${courseId}/lessons/${enrollment.current_lesson_id}`);
          return;
        }
      }

      // Navigate to first lesson
      const firstSection = course?.sections[0];
      const firstLesson = firstSection?.lessons[0];
      if (firstLesson) {
        navigate(`/enablement/learn/courses/${courseId}/lessons/${firstLesson.lesson_id}`);
      }
    } catch (err) {
      alert(`Failed to enroll: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !course) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Course not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {course.title}
        </Typography>
        {course.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {course.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {course.product && <Chip label={course.product} />}
          {course.product_suite && <Chip label={course.product_suite} />}
          {course.difficulty_level && <Chip label={course.difficulty_level} />}
          {course.estimated_minutes && (
            <Chip label={formatDurationMinutes(course.estimated_minutes)} />
          )}
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowOutlined />}
          onClick={handleStartOrResume}
          disabled={enrolling}
        >
          {enrolling ? 'Enrolling...' : 'Start Course'}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Outline */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Course Outline
        </Typography>
        {course.sections.map((section) => (
          <Card key={section.section_id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {section.title}
              </Typography>
              {section.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {section.description}
                </Typography>
              )}
              <List>
                {section.lessons.map((lesson) => (
                  <ListItem
                    key={lesson.lesson_id}
                    button
                    onClick={() =>
                      navigate(`/enablement/learn/courses/${courseId}/lessons/${lesson.lesson_id}`)
                    }
                  >
                    <ListItemIcon>
                      <RadioButtonUncheckedOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary={lesson.title}
                      secondary={
                        lesson.estimated_duration_minutes
                          ? `${lesson.estimated_duration_minutes} min`
                          : undefined
                      }
                    />
                    <ArrowForwardOutlined />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Related Courses */}
      {relatedCourses.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Related Courses
          </Typography>
          <Grid container spacing={3}>
            {relatedCourses.map((relatedCourse) => (
              <Grid item xs={12} sm={6} md={4} key={relatedCourse.course_id}>
                <CourseCard
                  course={relatedCourse}
                  onClick={() => navigate(`/enablement/learn/courses/${relatedCourse.course_id}`)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

