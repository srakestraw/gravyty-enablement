/**
 * Course Editor State Management Hook
 * 
 * Single source of truth for course state that persists across tab switches.
 * Manages course and lessons state, handles initialization for new vs existing courses.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminCourse } from './useAdminCourse';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { Course, Lesson } from '@gravyty/domain';

export interface UseCourseEditorStateOptions {
  courseId: string | null;
  isNew: boolean;
}

export interface UseCourseEditorStateReturn {
  course: Course | null;
  lessons: Lesson[];
  loading: boolean;
  error: Error | null;
  updateCourse: (updates: Partial<Course>) => void;
  updateLessons: (lessons: Lesson[]) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing course editor state
 * 
 * @param options - Configuration options
 * @returns Course state, lessons, and update functions
 */
export function useCourseEditorState({
  courseId,
  isNew,
}: UseCourseEditorStateOptions): UseCourseEditorStateReturn {
  // Use existing hook for loading course data (only for existing courses)
  const { data, loading: courseLoading, error: courseError, refetch: refetchCourse } = useAdminCourse(
    isNew ? null : courseId || null
  );

  // Local state - single source of truth
  // Initialize immediately for new courses to avoid race conditions with user input
  const [course, setCourse] = useState<Course | null>(() => {
    if (isNew) {
      return {
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
    }
    return null;
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<Error | null>(null);

  // Track if user is currently editing to prevent overwriting local edits
  const isUserEditingRef = useRef(false);

  // Load course data from API (only for existing courses)
  // Only update when course_id changes to avoid overwriting local edits
  useEffect(() => {
    if (data?.course && !isNew && data.course.course_id !== course?.course_id && !isUserEditingRef.current) {
      setCourse(data.course);
    }
  }, [data?.course?.course_id, isNew, course?.course_id]);

  // Load lessons for course (only for existing courses)
  useEffect(() => {
    if (course && course.course_id !== 'new') {
      setLessonsLoading(true);
      setLessonsError(null);
      
      lmsAdminApi.getCourseLessons(course.course_id)
        .then((response) => {
          if ('data' in response) {
            setLessons(response.data.lessons);
          } else {
            setLessonsError(new Error(response.error.message));
            setLessons([]);
          }
          setLessonsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load lessons:', err);
          setLessonsError(err instanceof Error ? err : new Error('Failed to load lessons'));
          setLessons([]);
          setLessonsLoading(false);
        });
    } else {
      // New course or no course - clear lessons
      setLessons([]);
      setLessonsLoading(false);
      setLessonsError(null);
    }
  }, [course?.course_id]);

  // Update course state
  const updateCourse = useCallback((updates: Partial<Course>) => {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    // Mark that user is editing to prevent data-loading effect from overwriting
    isUserEditingRef.current = true;

    setCourse((prevCourse) => {
      // For new courses, create course if it doesn't exist yet
      if (!prevCourse) {
        if (isNew) {
          return {
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
            ...updates,
          };
        }
        return prevCourse;
      }

      // Create a new object reference to ensure React detects the change
      // This is critical - React uses object reference equality for useMemo/useCallback dependencies
      const updatedCourse = { ...prevCourse, ...updates };
      return updatedCourse;
    });

    // Reset editing flag after a short delay
    // This allows the update to complete before allowing API data to overwrite
    setTimeout(() => {
      isUserEditingRef.current = false;
    }, 100);
  }, [isNew]);

  // Update lessons state
  const updateLessons = useCallback((newLessons: Lesson[]) => {
    setLessons(newLessons);
  }, []);

  // Refetch course and lessons
  const refetch = useCallback(async () => {
    if (isNew) {
      return;
    }

    // Reset editing flag to allow refetch
    isUserEditingRef.current = false;

    // Refetch course
    await refetchCourse();

    // Refetch lessons if course exists
    if (course && course.course_id !== 'new') {
      setLessonsLoading(true);
      try {
        const response = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in response) {
          setLessons(response.data.lessons);
        }
      } catch (err) {
        console.error('Failed to refetch lessons:', err);
      } finally {
        setLessonsLoading(false);
      }
    }
  }, [isNew, refetchCourse, course]);

  // Combine loading states
  const loading = courseLoading || lessonsLoading;

  // Combine error states (prefer course error over lessons error)
  const error = courseError || lessonsError;

  return {
    course,
    lessons,
    loading,
    error,
    updateCourse,
    updateLessons,
    refetch,
  };
}

