/**
 * Lesson Player Page
 * 
 * Video player with transcript and progress tracking
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Drawer,
  IconButton,
  Divider,
} from '@mui/material';
import {
  PlayArrowOutlined,
  CheckCircleOutlined,
  RadioButtonUncheckedOutlined,
  MenuOutlined,
  NavigateNextOutlined,
  NavigateBeforeOutlined,
} from '@mui/icons-material';
import { useLmsCourse } from '../../hooks/useLmsCourse';
import { useLmsLesson } from '../../hooks/useLmsLesson';
import { lmsApi } from '../../api/lmsClient';
import { track } from '../../lib/telemetry';
import { isErrorResponse } from '../../lib/apiClient';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { course, loading: courseLoading } = useLmsCourse(courseId);
  const { lesson, loading: lessonLoading } = useLmsLesson(courseId, lessonId);
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (courseId && lessonId) {
      track('page_view', { page: 'lesson_player', course_id: courseId, lesson_id: lessonId });
    }
  }, [courseId, lessonId]);

  // Progress tracking
  useEffect(() => {
    if (!courseId || !lessonId) return;

    const video = videoRef.current;
    let lastPosition = 0;
    let lastUpdateTime = 0;
    const DEBOUNCE_MS = 10000; // Update at most every 10 seconds

    const updateProgress = async (positionMs?: number, percentComplete?: number, completed?: boolean) => {
      const now = Date.now();
      
      // Debounce: only update if enough time has passed
      if (now - lastUpdateTime < DEBOUNCE_MS && !completed) {
        return;
      }

      lastUpdateTime = now;

      try {
        await lmsApi.updateProgress({
          course_id: courseId,
          lesson_id: lessonId,
          ...(positionMs !== undefined && { position_ms: positionMs }),
          ...(percentComplete !== undefined && { percent_complete: percentComplete }),
          ...(completed !== undefined && { completed }),
        });
      } catch (err) {
        console.error('Failed to update progress:', err);
      }
    };

    // Video event handlers (only if video exists and is playable)
    if (video && lesson && lesson.video_media?.url) {
      const handleTimeUpdate = () => {
        const currentTime = video.currentTime;
        const duration = video.duration;
        const positionMs = Math.floor(currentTime * 1000);
        const percentComplete = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0;

        // Only update if position changed significantly (avoid spam)
        if (Math.abs(positionMs - lastPosition) > 5000) {
          lastPosition = positionMs;
          updateProgress(positionMs, percentComplete);
        }
      };

      const handleEnded = async () => {
        await updateProgress(undefined, 100, true);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    } else {
      // No video or no playable video - still allow periodic updates for non-video lessons
      // This handles reading/quiz/assignment lessons that don't have video
      const interval = setInterval(() => {
        updateProgress();
      }, 30000); // Update every 30 seconds for non-video lessons

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [courseId, lessonId, lesson?.video_media?.url]);

  const handleMarkComplete = async () => {
    if (!courseId || !lessonId) return;

    try {
      const response = await lmsApi.updateProgress({
        course_id: courseId,
        lesson_id: lessonId,
        completed: true,
        percent_complete: 100,
      });
      
      if (isErrorResponse(response)) {
        alert(`Failed to mark complete: ${response.error.message}`);
      } else {
        // Success - could show a snackbar instead of alert
        alert('Lesson marked as complete!');
        // Optionally navigate to next lesson
        const next = getNextLesson();
        if (next) {
          setTimeout(() => {
            navigate(`/enablement/learn/courses/${courseId}/lessons/${next.lesson_id}`);
          }, 1000);
        }
      }
    } catch (err) {
      alert(`Failed to mark complete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getCurrentLessonIndex = () => {
    if (!course || !lessonId) return -1;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    return allLessons.findIndex((l) => l.lesson_id === lessonId);
  };

  const getNextLesson = () => {
    if (!course || !lessonId) return null;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const currentIndex = getCurrentLessonIndex();
    return currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  };

  const getPreviousLesson = () => {
    if (!course || !lessonId) return null;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const currentIndex = getCurrentLessonIndex();
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  };

  const handleNextLesson = () => {
    const next = getNextLesson();
    if (next && courseId) {
      navigate(`/enablement/learn/courses/${courseId}/lessons/${next.lesson_id}`);
    }
  };

  const handlePreviousLesson = () => {
    const prev = getPreviousLesson();
    if (prev && courseId) {
      navigate(`/enablement/learn/courses/${courseId}/lessons/${prev.lesson_id}`);
    }
  };

  if (courseLoading || lessonLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!lesson || !course) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Lesson not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Sidebar - Course Outline */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? 300 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            boxSizing: 'border-box',
            position: 'relative',
            height: '100%',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{course.title}</Typography>
          <IconButton onClick={() => setSidebarOpen(false)} size="small">
            <MenuOutlined />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          {course.sections.map((section) => (
            <Box key={section.section_id} sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {section.title}
              </Typography>
              <List dense>
                {section.lessons.map((l) => (
                  <ListItem
                    key={l.lesson_id}
                    button
                    selected={l.lesson_id === lessonId}
                    onClick={() =>
                      navigate(`/enablement/learn/courses/${courseId}/lessons/${l.lesson_id}`)
                    }
                  >
                    <ListItemIcon>
                      {l.lesson_id === lessonId ? (
                        <RadioButtonUncheckedOutlined color="primary" />
                      ) : (
                        <CheckCircleOutlined fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={l.title} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Video Player */}
        <Box sx={{ bgcolor: 'black', position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          {lesson.video_media?.url ? (
            <video
              ref={videoRef}
              controls
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              src={lesson.video_media.url}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Typography>Video not available</Typography>
            </Box>
          )}
        </Box>

        {/* Lesson Info and Tabs */}
        <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {lesson.title}
              </Typography>
              {lesson.description && (
                <Typography variant="body2" color="text.secondary">
                  {lesson.description}
                </Typography>
              )}
            </Box>
            <Button variant="contained" onClick={handleMarkComplete}>
              Mark Complete
            </Button>
          </Box>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Overview" />
            <Tab label="Transcript" />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              {lesson.description && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {lesson.description}
                </Typography>
              )}
              {lesson.resources && lesson.resources.length > 0 ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Resources
                  </Typography>
                  <List>
                    {lesson.resources.map((resource, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={resource.filename || 'Resource'}
                          secondary={resource.content_type}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No resources available
                </Typography>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              {lesson.transcript?.segments && lesson.transcript.segments.length > 0 ? (
                <List>
                  {lesson.transcript.segments.map((segment) => (
                    <ListItem key={segment.segment_id}>
                      <ListItemText
                        primary={segment.text}
                        secondary={`${Math.floor(segment.start_ms / 1000)}s - ${Math.floor(segment.end_ms / 1000)}s`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : lesson.transcript?.full_text ? (
                <Typography variant="body1">{lesson.transcript.full_text}</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Transcript not available
                </Typography>
              )}
            </Box>
          )}

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              startIcon={<NavigateBeforeOutlined />}
              onClick={handlePreviousLesson}
              disabled={!getPreviousLesson()}
            >
              Previous
            </Button>
            <Button
              endIcon={<NavigateNextOutlined />}
              onClick={handleNextLesson}
              disabled={!getNextLesson()}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

