/**
 * Admin Course Editor Page v2
 * 
 * Structured UI for editing courses with outline builder
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Visibility as PreviewIcon,
  CheckCircle as SavedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAdminCourse } from '../../../hooks/useAdminCourse';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { validateCoursePublish, getValidationSummary, validateCourseDraft } from '../../../validations/lmsValidations';
import { OutlinePanel } from '../../../components/admin/learning/OutlinePanel';
import { EditorPanel } from '../../../components/admin/learning/EditorPanel';
import { PublishReadinessPanel } from '../../../components/admin/learning/PublishReadinessPanel';
import type { Course, CourseSection, Lesson } from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

export function AdminCourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const isNew = courseId === 'new';
  const { data, loading, error, refetch } = useAdminCourse(isNew ? null : courseId || null);

  // Local state
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingLessons, setSavingLessons] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishedCourses, setPublishedCourses] = useState<Array<{ course_id: string; title: string }>>([]);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  
  // Debounce refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveLessonsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Load course data
  useEffect(() => {
    if (data?.course) {
      setCourse(data.course);
    }
  }, [data]);

  // Load lessons for course
  useEffect(() => {
    if (course && course.course_id !== 'new') {
      lmsAdminApi.getCourseLessons(course.course_id)
        .then((response) => {
          if ('data' in response) {
            setLessons(response.data.lessons);
          }
        })
        .catch((err) => {
          console.error('Failed to load lessons:', err);
          setLessons([]);
        });
    } else {
      setLessons([]);
    }
  }, [course?.course_id]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
    };
  }, []);

  // Load published courses for related courses selector
  useEffect(() => {
    if (!isNew) {
      lmsAdminApi.listCourses({ status: 'published' })
        .then((response) => {
          if ('data' in response) {
            setPublishedCourses(
              response.data.courses
                .filter((c) => c.course_id !== courseId)
                .map((c) => ({ course_id: c.course_id, title: c.title }))
            );
          }
        })
        .catch(() => {
          // Ignore errors for now
        });
    }
  }, [courseId, isNew]);

  // Validation
  const validationResult = useMemo(() => {
    if (!course) return { valid: false, errors: [], warnings: [] };
    return validateCoursePublish(course, lessons);
  }, [course, lessons]);

  // Draft validation with warnings
  const draftValidation = useMemo(() => {
    if (!course) return { errors: [], warnings: [] };
    return validateCourseDraft(course, lessons);
  }, [course, lessons]);

  const selectedLesson = lessons.find((l) => l.lesson_id === selectedLessonId) || null;
  const selectedSection = course?.sections.find((s) => s.section_id === selectedSectionId) || null;

  // Debounced auto-save for course metadata
  const debouncedSaveCourse = useCallback(async (updates: Partial<Course>) => {
    if (!course || isNew || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setSaving(true);
    
    try {
      await lmsAdminApi.updateCourse(course.course_id, updates);
      await refetch();
      setLastSaved(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [course, isNew, refetch]);

  // Course update handlers with debounced autosave
  const handleUpdateCourse = useCallback((updates: Partial<Course>) => {
    if (!course || isNew) return;

    const updatedCourse = { ...course, ...updates };
    setCourse(updatedCourse);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce auto-save (1000ms)
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSaveCourse(updates);
    }, 1000);
  }, [course, isNew, debouncedSaveCourse]);

  // Lesson update handlers (triggers debounced save)
  const handleUpdateLesson = useCallback((updates: Partial<Lesson>) => {
    if (!selectedLesson || !course) return;

    const updatedLesson = { ...selectedLesson, ...updates };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === selectedLesson.lesson_id ? updatedLesson : l
    );
    setLessons(updatedLessons);

    // Trigger debounced save
    saveLessonsStructure(false);
  }, [selectedLesson, course, lessons, saveLessonsStructure]);

  // Save lessons structure to backend (with debouncing and refetch)
  const saveLessonsStructure = useCallback(async (immediate = false) => {
    if (!course || isNew) return;

    const doSave = async () => {
      setSavingLessons(true);
      try {
        const sections = course.sections.map((s) => ({
          section_id: s.section_id,
          title: s.title,
          order: s.order,
          lesson_ids: s.lesson_ids,
        }));

        const lessonsData = lessons.map((l) => ({
          lesson_id: l.lesson_id,
          section_id: l.section_id,
          title: l.title,
          description: l.description,
          type: l.type,
          order: l.order,
          estimated_duration_minutes: l.estimated_duration_minutes,
          required: l.required,
          video_media: l.video_media ? {
            media_id: l.video_media.media_id,
            url: l.video_media.url,
          } : undefined,
          transcript: l.transcript ? {
            segments: l.transcript.segments?.map((s) => ({
              start_ms: s.start_ms,
              end_ms: s.end_ms,
              text: s.text,
            })) || [],
            full_text: l.transcript.full_text,
          } : undefined,
        }));

        await lmsAdminApi.updateCourseLessons(course.course_id, {
          sections,
          lessons: lessonsData,
        });
        
        // Refetch lessons to ensure UI matches backend
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          setLessons(lessonsResponse.data.lessons);
        }
        
        // Refetch course to sync sections
        await refetch();
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save lessons structure:', err);
        setSaveError(err instanceof Error ? err.message : 'Failed to save lessons');
      } finally {
        setSavingLessons(false);
      }
    };

    if (immediate) {
      // Clear any pending timeout and save immediately
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
      await doSave();
    } else {
      // Debounce (750ms)
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
      saveLessonsTimeoutRef.current = setTimeout(doSave, 750);
    }
  }, [course, lessons, isNew, refetch]);

  // Outline handlers
  const handleAddSection = () => {
    if (!course) return;

    const newSection: CourseSection = {
      section_id: uuidv4(),
      title: 'New Section',
      order: course.sections.length,
      lesson_ids: [],
    };

    const updatedSections = [...course.sections, newSection];
    setCourse({ ...course, sections: updatedSections });
    setSelectedSectionId(newSection.section_id);
    saveLessonsStructure(false);
  };

  const handleRenameSection = (sectionId: string, newTitle: string) => {
    if (!course) return;

    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? { ...s, title: newTitle } : s
    );
    setCourse({ ...course, sections: updatedSections });
    saveLessonsStructure(false);
  };

  const handleReorderSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!course) return;

    const sections = [...course.sections].sort((a, b) => a.order - b.order);
    const index = sections.findIndex((s) => s.section_id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections[index].order = index;
    sections[newIndex].order = newIndex;

    setCourse({ ...course, sections });
    saveLessonsStructure(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!course) return;

    const section = course.sections.find((s) => s.section_id === sectionId);
    if (!section) return;

    // Remove lessons in this section
    const updatedLessons = lessons.filter((l) => l.section_id !== sectionId);
    setLessons(updatedLessons);

    // Remove section and reorder
    const updatedSections = course.sections
      .filter((s) => s.section_id !== sectionId)
      .map((s, idx) => ({ ...s, order: idx }));
    setCourse({ ...course, sections: updatedSections });

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    if (selectedLessonId && section.lesson_ids.includes(selectedLessonId)) {
      setSelectedLessonId(null);
    }

    saveLessonsStructure(false);
  };

  const handleAddLesson = (sectionId: string) => {
    if (!course) return;

    const section = course.sections.find((s) => s.section_id === sectionId);
    if (!section) return;

    const newLesson: Lesson = {
      lesson_id: uuidv4(),
      course_id: course.course_id,
      section_id: sectionId,
      title: 'New Lesson',
      type: 'video',
      order: section.lesson_ids.length,
      required: true,
      created_at: new Date().toISOString(),
      created_by: '',
      updated_at: new Date().toISOString(),
      updated_by: '',
      resource_refs: [],
    };

    const updatedLessons = [...lessons, newLesson];
    setLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: [...section.lesson_ids, newLesson.lesson_id],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? updatedSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    setSelectedLessonId(newLesson.lesson_id);
    saveLessonsStructure(false);
  };

  const handleReorderLesson = (lessonId: string, direction: 'up' | 'down') => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const section = course.sections.find((s) => s.section_id === lesson.section_id);
    if (!section) return;

    const sectionLessons = section.lesson_ids
      .map((id) => lessons.find((l) => l.lesson_id === id))
      .filter((l): l is Lesson => l !== undefined)
      .sort((a, b) => a.order - b.order);

    const index = sectionLessons.findIndex((l) => l.lesson_id === lessonId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sectionLessons.length) return;

    [sectionLessons[index], sectionLessons[newIndex]] = [
      sectionLessons[newIndex],
      sectionLessons[index],
    ];
    sectionLessons[index].order = index;
    sectionLessons[newIndex].order = newIndex;

    const updatedLessons = lessons.map((l) => {
      const updated = sectionLessons.find((sl) => sl.lesson_id === l.lesson_id);
      return updated || l;
    });
    setLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: sectionLessons.map((l) => l.lesson_id),
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === section.section_id ? updatedSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    saveLessonsStructure(false);
  };

  const handleMoveLesson = (lessonId: string, targetSectionId: string) => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const targetSection = course.sections.find((s) => s.section_id === targetSectionId);
    if (!targetSection) return;

    // Remove from old section
    const oldSection = course.sections.find((s) => s.section_id === lesson.section_id);
    if (oldSection) {
      const updatedOldSection = {
        ...oldSection,
        lesson_ids: oldSection.lesson_ids.filter((id) => id !== lessonId),
      };
      const updatedSections = course.sections.map((s) =>
        s.section_id === oldSection.section_id ? updatedOldSection : s
      );
      setCourse({ ...course, sections: updatedSections });
    }

    // Add to new section
    const updatedTargetSection = {
      ...targetSection,
      lesson_ids: [...targetSection.lesson_ids, lessonId],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === targetSectionId ? updatedTargetSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    // Update lesson
    const updatedLesson = {
      ...lesson,
      section_id: targetSectionId,
      order: targetSection.lesson_ids.length,
    };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === lessonId ? updatedLesson : l
    );
    setLessons(updatedLessons);

    saveLessonsStructure(false);
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const section = course.sections.find((s) => s.section_id === lesson.section_id);
    if (!section) return;

    // Remove from section
    const updatedSection = {
      ...section,
      lesson_ids: section.lesson_ids.filter((id) => id !== lessonId),
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === section.section_id ? updatedSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    // Remove lesson
    const updatedLessons = lessons.filter((l) => l.lesson_id !== lessonId);
    setLessons(updatedLessons);

    if (selectedLessonId === lessonId) {
      setSelectedLessonId(null);
    }

    saveLessonsStructure(false);
  };

  // Save draft
  const handleSave = async () => {
    if (!course) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        const response = await lmsAdminApi.createCourse({
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product_suite: course.product_suite,
          product_concept: course.product_concept,
          topic_tags: course.topic_tags,
          badges: course.badges,
        });

        if ('data' in response) {
          navigate(`/enablement/admin/learning/courses/${response.data.course.course_id}`);
        }
      } else {
        await lmsAdminApi.updateCourse(course.course_id, {
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product_suite: course.product_suite,
          product_concept: course.product_concept,
          topic_tags: course.topic_tags,
          badges: course.badges,
          cover_image: course.cover_image,
        });
        await saveLessonsStructure(true); // Immediate save on explicit Save Draft
        await refetch();
        
        // Also refetch lessons
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          setLessons(lessonsResponse.data.lessons);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!course || isNew || !validationResult.valid) return;

    setPublishing(true);
    setSaveError(null);

    try {
      await lmsAdminApi.publishCourse(course.course_id);
      navigate('/enablement/admin/learning/courses');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish course');
    } finally {
      setPublishing(false);
    }
  };

  // Preview as learner (deep-link to first lesson)
  const handlePreview = () => {
    if (!course) return;

    // Find first lesson by section order ASC, lesson order ASC
    const sortedSections = [...course.sections].sort((a, b) => a.order - b.order);
    let firstLessonId: string | null = null;

    for (const section of sortedSections) {
      if (section.lesson_ids && section.lesson_ids.length > 0) {
        // Get lessons in this section and sort by order
        const sectionLessons = section.lesson_ids
          .map((id) => lessons.find((l) => l.lesson_id === id))
          .filter((l): l is Lesson => l !== undefined)
          .sort((a, b) => a.order - b.order);

        if (sectionLessons.length > 0) {
          firstLessonId = sectionLessons[0].lesson_id;
          break;
        }
      }
    }

    if (firstLessonId) {
      window.open(`/enablement/learn/courses/${course.course_id}/lessons/${firstLessonId}`, '_blank');
    } else {
      // No lessons, open course detail
      window.open(`/enablement/learn/courses/${course.course_id}`, '_blank');
    }
  };

  // Discard changes and reload from server
  const handleDiscardChanges = async () => {
    if (!course || isNew) return;

    // Cancel any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (saveLessonsTimeoutRef.current) {
      clearTimeout(saveLessonsTimeoutRef.current);
      saveLessonsTimeoutRef.current = null;
    }

    // Refetch course and lessons
    await refetch();
    const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
    if ('data' in lessonsResponse) {
      setLessons(lessonsResponse.data.lessons);
    }
    setLastSaved(null);
    setDiscardDialogOpen(false);
  };

  // Navigate to issue in editor
  const handleNavigateToIssue = (field: string) => {
    // Simple navigation: scroll to top and focus relevant area
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Try to navigate to specific areas based on field
    if (field.startsWith('lessons[')) {
      // Extract lesson ID from field like "lessons[lesson_123].title"
      const match = field.match(/lessons\[([^\]]+)\]/);
      if (match && match[1]) {
        const lessonId = match[1];
        setSelectedLessonId(lessonId);
        // EditorPanel will auto-switch to lesson tab
      }
    } else if (field.startsWith('sections[')) {
      // Extract section index
      const match = field.match(/sections\[(\d+)\]/);
      if (match && match[1]) {
        const sectionIndex = parseInt(match[1], 10);
        const section = course?.sections[sectionIndex];
        if (section) {
          setSelectedSectionId(section.section_id);
        }
      }
    }
    // For metadata fields (title, short_description, etc.), EditorPanel will show Course tab
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  if (!course && !isNew) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Course not found</Alert>
      </Box>
    );
  }

  // Initialize course for new course
  if (isNew && !course) {
    const newCourse: Course = {
      course_id: 'new',
      title: '',
      short_description: '',
      status: 'draft',
      version: 1,
      sections: [],
      topic_tags: [],
      related_course_ids: [],
      badges: [],
      created_at: new Date().toISOString(),
      created_by: '',
      updated_at: new Date().toISOString(),
      updated_by: '',
    };
    setCourse(newCourse);
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">
              {isNew ? 'Create Course' : `Edit Course: ${course?.title || 'Loading...'}`}
            </Typography>
            {(saving || savingLessons) && (
              <Chip
                icon={<CircularProgress size={16} />}
                label="Saving..."
                size="small"
                color="primary"
              />
            )}
            {!saving && !savingLessons && lastSaved && (
              <Chip
                icon={<SavedIcon />}
                label={`Saved ${lastSaved.toLocaleTimeString()}`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {course && course.status === 'published' ? (
              <Tooltip title="Preview course as a learner (opens first lesson)">
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                >
                  Preview
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Course must be published to preview. Publish to see the learner experience.">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<PreviewIcon />}
                    disabled
                  >
                    Preview
                  </Button>
                </span>
              </Tooltip>
            )}
            {!isNew && (
              <Tooltip title="Discard unsaved changes and reload from server">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => setDiscardDialogOpen(true)}
                  disabled={saving || savingLessons}
                >
                  Discard Changes
                </Button>
              </Tooltip>
            )}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !course?.title}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            {!isNew && data?.is_draft && (
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={handlePublish}
                disabled={publishing || !validationResult.valid}
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            <Button onClick={() => navigate('/enablement/admin/learning/courses')}>
              Cancel
            </Button>
          </Box>
        </Box>

        {saveError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {saveError}
          </Alert>
        )}

        {!validationResult.valid && (
          <Alert severity="warning">
            {getValidationSummary(validationResult)}. Please fix errors before publishing.
          </Alert>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Outline */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
          {course && (
            <OutlinePanel
              sections={course.sections}
              lessons={lessons}
              selectedLessonId={selectedLessonId}
              onSelectLesson={setSelectedLessonId}
              onAddSection={handleAddSection}
              onRenameSection={handleRenameSection}
              onReorderSection={handleReorderSection}
              onDeleteSection={handleDeleteSection}
              onAddLesson={handleAddLesson}
              onReorderLesson={handleReorderLesson}
              onMoveLesson={handleMoveLesson}
              onDeleteLesson={handleDeleteLesson}
            />
          )}
        </Box>

        {/* Center: Editor */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {course && (
            <EditorPanel
              course={course}
              selectedSection={selectedSection}
              selectedLesson={selectedLesson}
              publishedCourses={publishedCourses}
              onUpdateCourse={handleUpdateCourse}
              onUpdateLesson={handleUpdateLesson}
            />
          )}
        </Box>

        {/* Right: Publish Readiness Panel */}
        <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider', overflow: 'auto', p: 2 }}>
          {course && (
            <PublishReadinessPanel
              entityType="course"
              errors={validationResult.errors}
              warnings={draftValidation.warnings.map((w) => ({ field: w.field, message: w.message }))}
              status={course.status}
              onNavigateToIssue={handleNavigateToIssue}
            />
          )}
        </Box>
      </Box>

      {/* Discard Changes Dialog */}
      <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will discard all unsaved changes and reload the course from the server. Any local edits will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDiscardChanges} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
