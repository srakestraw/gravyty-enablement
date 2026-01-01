/**
 * Course Editor Actions Hook (Phase 4)
 * 
 * Centralizes save/publish/preview/discard logic for course editor.
 * Integrates with useCourseValidation for button enable/disable and error handling.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { lmsAdminApi } from '../api/lmsAdminClient';
import { focusRegistry } from '../utils/focusRegistry';
import type { Course, Lesson } from '@gravyty/domain';
import type { UseCourseValidationReturn } from './useCourseValidation';

export interface UseCourseEditorActionsOptions {
  course: Course | null;
  lessons: Lesson[];
  isNew: boolean;
  validation: UseCourseValidationReturn;
  onUpdateCourse: (updates: Partial<Course>) => void;
  onUpdateLessons: (lessons: Lesson[]) => void;
  refetchCourse: () => Promise<void>;
  temporaryMediaIds: Set<string>;
  cleanupTemporaryMedia: (mediaIdsToCleanup?: Set<string>) => Promise<void>;
  onSelectCourseDetails?: () => void;
  onSelectNode?: (nodeId: string) => void;
  onOpenInspector?: () => void;
}

export interface UseCourseEditorActionsReturn {
  // Actions
  handleSave: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handlePreview: () => void;
  handleDiscardChanges: () => Promise<void>;
  handleDelete: () => Promise<void>;
  
  // State
  saving: boolean;
  publishing: boolean;
  deleting: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  
  // Helpers
  canSave: boolean;
  canPublish: boolean;
}

/**
 * Hook for managing course editor actions (save, publish, preview, discard)
 */
export function useCourseEditorActions({
  course,
  lessons,
  isNew,
  validation,
  onUpdateCourse,
  onUpdateLessons,
  refetchCourse,
  temporaryMediaIds,
  cleanupTemporaryMedia,
  onSelectCourseDetails,
  onSelectNode,
  onOpenInspector,
}: UseCourseEditorActionsOptions): UseCourseEditorActionsReturn {
  const navigate: NavigateFunction = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Refs for debouncing lesson structure saves
  const saveLessonsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [savingLessons, setSavingLessons] = useState(false);

  // Save lessons structure (debounced)
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
          content: l.content || (() => {
            switch (l.type) {
              case 'video':
                return { kind: 'video' as const, video_id: '', duration_seconds: 0 };
              case 'reading':
                return { kind: 'reading' as const, format: 'markdown' as const, markdown: '' };
              case 'quiz':
                return { kind: 'quiz' as const, questions: [], passing_score_percent: 70, allow_retry: false, show_answers_after_submit: false };
              case 'assignment':
                return { kind: 'assignment' as const, instructions_markdown: '', submission_type: 'none' as const };
              case 'interactive':
                return { kind: 'interactive' as const, provider: 'embed' as const, embed_url: '', height_px: 600, allow_fullscreen: true };
              default:
                return { kind: 'video' as const, video_id: '', duration_seconds: 0 };
            }
          })(),
          resources: l.resources || [],
          required: l.required,
        }));

        await lmsAdminApi.updateCourseLessons(course.course_id, {
          sections,
          lessons: lessonsData,
        });
        
        // Refetch lessons to ensure UI matches backend
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          onUpdateLessons(lessonsResponse.data.lessons);
        }
        
        // Refetch course to sync sections
        await refetchCourse();
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
  }, [course, lessons, isNew, refetchCourse, onUpdateLessons]);

  // Save draft
  const handleSave = useCallback(async () => {
    if (!course) return;

    // Check if can save (validation)
    if (!validation.canSave()) {
      // Mark fields as touched to show errors
      if (!course.title || course.title.trim() === '') {
        validation.markFieldTouched('course', course.course_id, 'title');
      }
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        const response = await lmsAdminApi.createCourse({
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product: course.product,
          product_suite: course.product_suite,
          topic_tags: course.topic_tags,
          product_id: course.product_id,
          product_suite_id: course.product_suite_id,
          topic_tag_ids: course.topic_tag_ids,
          badges: course.badges,
          estimated_minutes: course.estimated_minutes,
        });

        if ('data' in response) {
          // Course saved successfully - cleanup temporary media
          await cleanupTemporaryMedia();
          navigate(`/enablement/admin/learning/courses/${response.data.course.course_id}`);
        }
      } else {
        await lmsAdminApi.updateCourse(course.course_id, {
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product: course.product,
          product_suite: course.product_suite,
          topic_tags: course.topic_tags,
          product_id: course.product_id,
          product_suite_id: course.product_suite_id,
          topic_tag_ids: course.topic_tag_ids,
          badges: course.badges,
          cover_image: course.cover_image,
          estimated_minutes: course.estimated_minutes,
        });
        await saveLessonsStructure(true); // Immediate save on explicit Save Draft
        await refetchCourse();
        
        // Also refetch lessons
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          onUpdateLessons(lessonsResponse.data.lessons);
        }
        
        setLastSaved(new Date());
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }, [course, isNew, validation, cleanupTemporaryMedia, navigate, saveLessonsStructure, refetchCourse, onUpdateLessons]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!course || isNew) return;

    // Set hasAttemptedPublish to show inline errors
    validation.setHasAttemptedPublish(true);

    // Don't proceed if validation fails
    if (!validation.canPublish()) {
      // Show inspector and scroll to first error
      if (onOpenInspector) {
        onOpenInspector();
      }
      
      // Find first error and navigate to it
      const publishErrors = validation.getPublishValidationErrors();
      const firstError = publishErrors[0];
      if (firstError && firstError.entityType && firstError.entityId) {
        if (firstError.entityType === 'course') {
          if (onSelectCourseDetails) {
            onSelectCourseDetails();
          }
        } else {
          if (onSelectNode) {
            onSelectNode(firstError.entityId);
          }
        }
        setTimeout(() => {
          if (firstError.fieldKey) {
            focusRegistry.focus(firstError.entityType!, firstError.entityId!, firstError.fieldKey);
          }
        }, 200);
      }
      return;
    }

    setPublishing(true);
    setSaveError(null);

    try {
      await lmsAdminApi.publishCourse(course.course_id);
      navigate('/enablement/admin/learning/courses');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish course');
      // Show inspector on publish failure
      if (onOpenInspector) {
        onOpenInspector();
      }
    } finally {
      setPublishing(false);
    }
  }, [course, isNew, validation, navigate, onOpenInspector, onSelectCourseDetails, onSelectNode]);

  // Preview as learner (deep-link to first lesson)
  const handlePreview = useCallback(() => {
    if (!course) return;

    // Set hasAttemptedPublish to show inline errors if validation fails
    validation.setHasAttemptedPublish(true);

    // Check if course is published before previewing
    if (course.status !== 'published') {
      return;
    }

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
  }, [course, lessons, validation]);

  // Discard changes and reload from server
  const handleDiscardChanges = useCallback(async () => {
    if (!course || isNew) return;

    setSaving(true);
    setSaveError(null);

    try {
      await refetchCourse();
      
      // Also refetch lessons
      const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
      if ('data' in lessonsResponse) {
        onUpdateLessons(lessonsResponse.data.lessons);
      }
      
      // Reset validation state
      validation.setHasAttemptedPublish(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to discard changes');
    } finally {
      setSaving(false);
    }
  }, [course, isNew, refetchCourse, onUpdateLessons, validation]);

  // Determine if save/publish buttons should be enabled
  // Use useMemo to ensure these recalculate when course changes
  // Note: validation.canSave() and validation.canPublish() are memoized and depend on course
  const canSave = useMemo(() => validation.canSave(), [validation.canSave, course?.title]);
  const canPublish = useMemo(() => validation.canPublish() && !isNew, [validation.canPublish, isNew, course]);

  // Delete course
  const handleDelete = useCallback(async () => {
    if (!course || isNew) return;
    
    setDeleting(true);
    setSaveError(null);
    
    try {
      // Cleanup temporary media first (if any)
      if (temporaryMediaIds.size > 0) {
        await cleanupTemporaryMedia();
      }
      
      // Delete the course
      const response = await lmsAdminApi.deleteCourse(course.course_id);
      
      if ('error' in response) {
        throw new Error(response.error.message);
      }
      
      // Navigate back to courses list
      navigate('/enablement/admin/learning/courses');
    } catch (err) {
      console.error('Failed to delete course:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to delete course');
      setDeleting(false);
    }
  }, [course, isNew, temporaryMediaIds, cleanupTemporaryMedia, navigate]);

  return {
    handleSave,
    handlePublish,
    handlePreview,
    handleDiscardChanges,
    handleDelete,
    saving: saving || savingLessons,
    publishing,
    deleting,
    saveError,
    lastSaved,
    canSave,
    canPublish,
  };
}

