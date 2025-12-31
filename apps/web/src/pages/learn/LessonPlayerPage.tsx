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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
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
import type { QuizQuestion } from '@gravyty/domain';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { course, loading: courseLoading } = useLmsCourse(courseId);
  const { lesson, loading: lessonLoading } = useLmsLesson(courseId, lessonId);
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (courseId && lessonId) {
      track('page_view', { page: 'lesson_player', course_id: courseId, lesson_id: lessonId });
    }
  }, [courseId, lessonId]);

  // Progress update function (shared between useEffect and quiz handler)
  const updateProgress = async (positionMs?: number, percentComplete?: number, completed?: boolean) => {
    if (!courseId || !lessonId) return;
    
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

  // Progress tracking
  useEffect(() => {
    if (!courseId || !lessonId) return;

    const video = videoRef.current;
    let lastPosition = 0;
    let lastUpdateTime = 0;
    const DEBOUNCE_MS = 10000; // Update at most every 10 seconds

    const debouncedUpdateProgress = async (positionMs?: number, percentComplete?: number, completed?: boolean) => {
      const now = Date.now();
      
      // Debounce: only update if enough time has passed
      if (now - lastUpdateTime < DEBOUNCE_MS && !completed) {
        return;
      }

      lastUpdateTime = now;
      await updateProgress(positionMs, percentComplete, completed);
    };

    // Video event handlers (only if video exists and is playable)
    if (video && lesson && lesson.content?.kind === 'video') {
      // For video lessons, we need to get the video URL from resources or video_id
      // For MVP, assume video_id maps to a resource or we construct URL
      const videoUrl = lesson.resources?.find((r) => r.media_id === lesson.content.video_id)?.url;
      
      if (videoUrl) {
        const handleTimeUpdate = () => {
          const currentTime = video.currentTime;
          const duration = video.duration;
          const positionMs = Math.floor(currentTime * 1000);
          const percentComplete = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0;

          // Only update if position changed significantly (avoid spam)
          if (Math.abs(positionMs - lastPosition) > 5000) {
            lastPosition = positionMs;
            debouncedUpdateProgress(positionMs, percentComplete);
          }
        };

        const handleEnded = async () => {
          await debouncedUpdateProgress(undefined, 100, true);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('ended', handleEnded);
        };
      }
    }
    
    // For non-video lessons, allow periodic updates
    const interval = setInterval(() => {
      debouncedUpdateProgress();
    }, 30000); // Update every 30 seconds for non-video lessons

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [courseId, lessonId, lesson?.content?.kind]);

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
        {/* Lesson Content Renderer */}
        {lesson.content?.kind === 'video' && (
          <Box sx={{ bgcolor: 'black', position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            {(() => {
              const videoUrl = lesson.resources?.find((r) => r.media_id === lesson.content.video_id)?.url;
              return videoUrl ? (
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
                  src={videoUrl}
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
              );
            })()}
          </Box>
        )}

        {lesson.content?.kind === 'reading' && (
          <Box sx={{ p: 3, bgcolor: 'background.paper', overflow: 'auto', flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  whiteSpace: 'pre-wrap',
                  '& h1': { fontSize: '2rem', fontWeight: 600, mb: 2 },
                  '& h2': { fontSize: '1.5rem', fontWeight: 600, mb: 1.5 },
                  '& h3': { fontSize: '1.25rem', fontWeight: 600, mb: 1 },
                  '& p': { mb: 2 },
                  '& ul, & ol': { mb: 2, pl: 3 },
                  '& code': { bgcolor: 'action.hover', p: 0.5, borderRadius: 0.5 },
                  '& pre': { bgcolor: 'action.hover', p: 2, borderRadius: 1, overflow: 'auto' },
                }}
              >
                {lesson.content.markdown}
              </Typography>
            </Paper>
          </Box>
        )}

        {lesson.content?.kind === 'quiz' && (
          <Box sx={{ p: 3, bgcolor: 'background.paper', overflow: 'auto', flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              {lesson.content.questions.map((question, qIndex) => (
                <Box key={question.question_id} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Question {qIndex + 1}: {question.prompt}
                  </Typography>
                  <FormControl component="fieldset" disabled={quizSubmitted}>
                    <RadioGroup
                      value={quizAnswers[question.question_id] || ''}
                      onChange={(e) => {
                        setQuizAnswers({
                          ...quizAnswers,
                          [question.question_id]: e.target.value,
                        });
                      }}
                    >
                      {question.options.map((option) => (
                        <FormControlLabel
                          key={option.option_id}
                          value={option.option_id}
                          control={<Radio />}
                          label={option.text}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                  {quizSubmitted && question.explanation && (
                    <Alert severity={question.correct_option_id === quizAnswers[question.question_id] ? 'success' : 'error'} sx={{ mt: 2 }}>
                      {question.explanation}
                    </Alert>
                  )}
                </Box>
              ))}
              {!quizSubmitted ? (
                <Button
                  variant="contained"
                  onClick={async () => {
                    // Calculate score
                    let correct = 0;
                    lesson.content.questions.forEach((q) => {
                      if (quizAnswers[q.question_id] === q.correct_option_id) {
                        correct++;
                      }
                    });
                    const score = Math.round((correct / lesson.content.questions.length) * 100);
                    setQuizScore(score);
                    setQuizSubmitted(true);
                    
                    // Update progress - only mark complete if passing threshold met
                    const passingScore = lesson.content.passing_score_percent || 70;
                    const completed = score >= passingScore;
                    await updateProgress(undefined, completed ? 100 : score, completed);
                  }}
                  disabled={Object.keys(quizAnswers).length < lesson.content.questions.length}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Score: {quizScore}%
                  </Typography>
                  {quizScore !== null && lesson.content.passing_score_percent && (
                    <Typography variant="body1" color={quizScore >= lesson.content.passing_score_percent ? 'success.main' : 'error.main'}>
                      {quizScore >= lesson.content.passing_score_percent
                        ? 'You passed!'
                        : `You need ${lesson.content.passing_score_percent}% to pass.`}
                    </Typography>
                  )}
                  {lesson.content.allow_retry && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                        setQuizScore(null);
                      }}
                      sx={{ mt: 2 }}
                    >
                      Retry Quiz
                    </Button>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {lesson.content?.kind === 'assignment' && (
          <Box sx={{ p: 3, bgcolor: 'background.paper', overflow: 'auto', flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Assignment Instructions
              </Typography>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  whiteSpace: 'pre-wrap',
                  mb: 3,
                  '& h1': { fontSize: '2rem', fontWeight: 600, mb: 2 },
                  '& h2': { fontSize: '1.5rem', fontWeight: 600, mb: 1.5 },
                  '& p': { mb: 2 },
                }}
              >
                {lesson.content.instructions_markdown}
              </Typography>
              {lesson.content.due_at && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Due: {new Date(lesson.content.due_at).toLocaleString()}
                </Typography>
              )}
              {lesson.content.submission_type === 'none' ? (
                <Button variant="contained" onClick={handleMarkComplete}>
                  Mark Complete
                </Button>
              ) : (
                <Alert severity="info">
                  Submission type: {lesson.content.submission_type}. Submission UI coming soon.
                </Alert>
              )}
            </Paper>
          </Box>
        )}

        {lesson.content?.kind === 'interactive' && (
          <Box sx={{ p: 3, bgcolor: 'background.paper', overflow: 'auto', flex: 1 }}>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: lesson.content.height_px || 600,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <iframe
                  src={lesson.content.embed_url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allowFullScreen={lesson.content.allow_fullscreen !== false}
                />
              </Box>
            </Paper>
          </Box>
        )}

        {/* Lesson Info */}
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
            {lesson.content?.kind !== 'quiz' && (
              <Button variant="contained" onClick={handleMarkComplete}>
                Mark Complete
              </Button>
            )}
          </Box>

          {/* Resources */}
          {lesson.resources && lesson.resources.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Resources
              </Typography>
              <List>
                {lesson.resources.map((resource) => (
                  <ListItem key={resource.media_id}>
                    <ListItemText
                      primary={resource.filename || 'Resource'}
                      secondary={resource.url}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Video transcript */}
          {lesson.content?.kind === 'video' && lesson.content.transcript && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Transcript
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {lesson.content.transcript}
              </Typography>
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

