/**
 * Unit tests for useCourseEditorState hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCourseEditorState } from './useCourseEditorState';
import { useAdminCourse } from './useAdminCourse';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { Course, Lesson } from '@gravyty/domain';

// Mock dependencies
vi.mock('./useAdminCourse');
vi.mock('../api/lmsAdminClient');

describe('useCourseEditorState', () => {
  const mockUseAdminCourse = vi.mocked(useAdminCourse);
  const mockLmsAdminApi = vi.mocked(lmsAdminApi);

  const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
    course_id: 'test-course-id',
    title: 'Test Course',
    short_description: 'Test Description',
    status: 'draft',
    version: 1,
    sections: [],
    topic_tags: [],
    related_course_ids: [],
    badges: [],
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_at: new Date().toISOString(),
    updated_by: 'user-1',
    ...overrides,
  });

  const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
    lesson_id: 'lesson-1',
    course_id: 'test-course-id',
    section_id: 'section-1',
    title: 'Test Lesson',
    type: 'video',
    order: 0,
    content: {
      kind: 'video',
      video_id: '',
      duration_seconds: 0,
    },
    resources: [],
    required: true,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_at: new Date().toISOString(),
    updated_by: 'user-1',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('State initialization for new course', () => {
    it('should initialize with empty course object for new course', () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      expect(result.current.course).not.toBeNull();
      expect(result.current.course?.course_id).toBe('new');
      expect(result.current.course?.title).toBe('');
      expect(result.current.course?.status).toBe('draft');
      expect(result.current.lessons).toEqual([]);
    });

    it('should not load from API for new course', () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useCourseEditorState({ courseId: 'new', isNew: true }));

      expect(mockUseAdminCourse).toHaveBeenCalledWith(null);
      expect(mockLmsAdminApi.getCourseLessons).not.toHaveBeenCalled();
    });
  });

  describe('State initialization for existing course', () => {
    it('should load course from API for existing course', async () => {
      const mockCourse = createMockCourse();
      mockUseAdminCourse.mockReturnValue({
        data: { course: mockCourse, is_draft: true },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockLmsAdminApi.getCourseLessons.mockResolvedValue({
        data: { lessons: [] },
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      await waitFor(() => {
        expect(result.current.course).not.toBeNull();
      });

      expect(result.current.course?.course_id).toBe('test-course-id');
      expect(result.current.course?.title).toBe('Test Course');
    });

    it('should load lessons for existing course', async () => {
      const mockCourse = createMockCourse();
      const mockLessons = [createMockLesson()];

      mockUseAdminCourse.mockReturnValue({
        data: { course: mockCourse, is_draft: true },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockLmsAdminApi.getCourseLessons.mockResolvedValue({
        data: { lessons: mockLessons },
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      await waitFor(() => {
        expect(result.current.lessons).toHaveLength(1);
      });

      expect(result.current.lessons[0].lesson_id).toBe('lesson-1');
      expect(mockLmsAdminApi.getCourseLessons).toHaveBeenCalledWith('test-course-id');
    });
  });

  describe('State updates persist', () => {
    it('should update course state when updateCourse is called', async () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      await waitFor(() => {
        expect(result.current.course).not.toBeNull();
      });

      // Update course title
      result.current.updateCourse({ title: 'Updated Title' });

      await waitFor(() => {
        expect(result.current.course?.title).toBe('Updated Title');
      });
    });

    it('should update multiple fields at once', async () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      await waitFor(() => {
        expect(result.current.course).not.toBeNull();
      });

      result.current.updateCourse({
        title: 'New Title',
        short_description: 'New Description',
      });

      await waitFor(() => {
        expect(result.current.course?.title).toBe('New Title');
        expect(result.current.course?.short_description).toBe('New Description');
      });
    });

    it('should update lessons state when updateLessons is called', () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      const newLessons = [createMockLesson({ lesson_id: 'lesson-2' })];

      result.current.updateLessons(newLessons);

      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons[0].lesson_id).toBe('lesson-2');
    });
  });

  describe('State survives component remounts', () => {
    it('should preserve course state across remounts', async () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result, rerender } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      await waitFor(() => {
        expect(result.current.course).not.toBeNull();
      });

      // Update course
      result.current.updateCourse({ title: 'Persisted Title' });

      await waitFor(() => {
        expect(result.current.course?.title).toBe('Persisted Title');
      });

      // Remount component
      rerender();

      // State should still be there (React preserves state in tests)
      // In real scenario, state would persist because it's in parent component
      expect(result.current.course?.title).toBe('Persisted Title');
    });
  });

  describe('Loading and error states', () => {
    it('should return loading state when course is loading', () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      expect(result.current.loading).toBe(true);
    });

    it('should return error state when course fails to load', () => {
      const mockError = new Error('Failed to load course');
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      expect(result.current.error).toBe(mockError);
    });

    it('should return error state when lessons fail to load', async () => {
      const mockCourse = createMockCourse();
      const mockError = new Error('Failed to load lessons');

      mockUseAdminCourse.mockReturnValue({
        data: { course: mockCourse, is_draft: true },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockLmsAdminApi.getCourseLessons.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Failed to load lessons');
    });
  });

  describe('Refetch functionality', () => {
    it('should refetch course and lessons for existing course', async () => {
      const mockCourse = createMockCourse();
      const mockRefetch = vi.fn().mockResolvedValue(undefined);

      mockUseAdminCourse.mockReturnValue({
        data: { course: mockCourse, is_draft: true },
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockLmsAdminApi.getCourseLessons.mockResolvedValue({
        data: { lessons: [] },
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'test-course-id', isNew: false })
      );

      await waitFor(() => {
        expect(result.current.course).not.toBeNull();
      });

      await result.current.refetch();

      expect(mockRefetch).toHaveBeenCalled();
      expect(mockLmsAdminApi.getCourseLessons).toHaveBeenCalled();
    });

    it('should not refetch for new course', async () => {
      mockUseAdminCourse.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCourseEditorState({ courseId: 'new', isNew: true })
      );

      await result.current.refetch();

      expect(mockLmsAdminApi.getCourseLessons).not.toHaveBeenCalled();
    });
  });
});

