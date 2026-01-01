/**
 * Unit tests for useCourseEditorActions hook (Phase 4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCourseEditorActions } from './useCourseEditorActions';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { Course, Lesson } from '@gravyty/domain';
import type { UseCourseValidationReturn } from './useCourseValidation';

// Mock dependencies
vi.mock('../api/lmsAdminClient');
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock('../utils/focusRegistry', () => ({
  focusRegistry: {
    focus: vi.fn(),
  },
}));

describe('useCourseEditorActions', () => {
  const mockLmsAdminApi = vi.mocked(lmsAdminApi);
  const mockValidation: UseCourseValidationReturn = {
    hasAttemptedPublish: false,
    setHasAttemptedPublish: vi.fn(),
    touchedFields: new Set(),
    canSave: vi.fn(() => true),
    getSaveValidationErrors: vi.fn(() => []),
    canPublish: vi.fn(() => true),
    getPublishValidationErrors: vi.fn(() => []),
    getPublishValidationWarnings: vi.fn(() => []),
    getValidationIssues: vi.fn(() => []),
    getErrors: vi.fn(() => []),
    getWarnings: vi.fn(() => []),
    shouldShowError: vi.fn(() => false),
    markFieldTouched: vi.fn(),
    errorsCount: 0,
    warningsCount: 0,
    totalIssuesCount: 0,
  };

  const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
    course_id: 'test-course-id',
    title: 'Test Course',
    short_description: 'Test Description',
    description: '',
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
    title: 'Lesson 1',
    type: 'video',
    order: 0,
    content: { kind: 'video', video_id: 'vid-1', duration_seconds: 60 },
    resources: [],
    required: true,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_at: new Date().toISOString(),
    updated_by: 'user-1',
    ...overrides,
  });

  const defaultOptions = {
    course: createMockCourse(),
    lessons: [],
    isNew: false,
    validation: mockValidation,
    onUpdateCourse: vi.fn(),
    onUpdateLessons: vi.fn(),
    refetchCourse: vi.fn(),
    temporaryMediaIds: new Set<string>(),
    cleanupTemporaryMedia: vi.fn(),
    onSelectCourseDetails: vi.fn(),
    onSelectNode: vi.fn(),
    onOpenInspector: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful API responses
    mockLmsAdminApi.updateCourse.mockResolvedValue({
      data: { course: createMockCourse() },
      request_id: 'req-123',
    });
    mockLmsAdminApi.createCourse.mockResolvedValue({
      data: { course: createMockCourse() },
      request_id: 'req-123',
    });
    mockLmsAdminApi.publishCourse.mockResolvedValue({
      data: { course: createMockCourse({ status: 'published' }) },
      request_id: 'req-123',
    });
    mockLmsAdminApi.updateCourseLessons.mockResolvedValue({
      data: {},
      request_id: 'req-123',
    });
    mockLmsAdminApi.getCourseLessons.mockResolvedValue({
      data: { lessons: [] },
      request_id: 'req-123',
    });
  });

  describe('handleSave', () => {
    it('should save new course and navigate to course editor', async () => {
      const course = createMockCourse({ course_id: 'new' });
      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          course,
          isNew: true,
        })
      );

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(mockLmsAdminApi.createCourse).toHaveBeenCalled();
        expect(result.current.saving).toBe(false);
      });
    });

    it('should update existing course and save lessons structure', async () => {
      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(mockLmsAdminApi.updateCourse).toHaveBeenCalled();
        expect(mockLmsAdminApi.updateCourseLessons).toHaveBeenCalled();
        expect(result.current.saving).toBe(false);
      });
    });

    it('should not save if validation fails', async () => {
      const validationWithError = {
        ...mockValidation,
        canSave: vi.fn(() => false),
      };
      const course = createMockCourse({ title: '' });

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          course,
          validation: validationWithError,
        })
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockLmsAdminApi.updateCourse).not.toHaveBeenCalled();
      expect(validationWithError.markFieldTouched).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockLmsAdminApi.updateCourse.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(result.current.saveError).toBe('Save failed');
        expect(result.current.saving).toBe(false);
      });
    });
  });

  describe('handlePublish', () => {
    it('should publish course and navigate to courses list', async () => {
      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handlePublish();
      });

      await waitFor(() => {
        expect(mockLmsAdminApi.publishCourse).toHaveBeenCalled();
        expect(result.current.publishing).toBe(false);
      });
    });

    it('should not publish if validation fails', async () => {
      const validationWithError = {
        ...mockValidation,
        canPublish: vi.fn(() => false),
        getPublishValidationErrors: vi.fn(() => [
          {
            severity: 'error' as const,
            field: 'title',
            message: 'Title required',
            entityType: 'course' as const,
            entityId: 'test-course-id',
            fieldKey: 'title',
          },
        ]),
      };

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          validation: validationWithError,
        })
      );

      await act(async () => {
        await result.current.handlePublish();
      });

      expect(mockLmsAdminApi.publishCourse).not.toHaveBeenCalled();
      expect(validationWithError.setHasAttemptedPublish).toHaveBeenCalledWith(true);
      expect(defaultOptions.onOpenInspector).toHaveBeenCalled();
    });

    it('should not publish new courses', async () => {
      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          isNew: true,
        })
      );

      await act(async () => {
        await result.current.handlePublish();
      });

      expect(mockLmsAdminApi.publishCourse).not.toHaveBeenCalled();
    });

    it('should handle publish errors', async () => {
      mockLmsAdminApi.publishCourse.mockRejectedValue(new Error('Publish failed'));

      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handlePublish();
      });

      await waitFor(() => {
        expect(result.current.saveError).toBe('Publish failed');
        expect(result.current.publishing).toBe(false);
        expect(defaultOptions.onOpenInspector).toHaveBeenCalled();
      });
    });
  });

  describe('handlePreview', () => {
    it('should open preview for published course with lessons', () => {
      const course = createMockCourse({ status: 'published' });
      const lessons = [createMockLesson()];
      const sections = [
        {
          section_id: 'section-1',
          title: 'Section 1',
          order: 0,
          lesson_ids: ['lesson-1'],
        },
      ];
      course.sections = sections;

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          course,
          lessons,
        })
      );

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      act(() => {
        result.current.handlePreview();
      });

      expect(openSpy).toHaveBeenCalledWith(
        '/enablement/learn/courses/test-course-id/lessons/lesson-1',
        '_blank'
      );
      expect(mockValidation.setHasAttemptedPublish).toHaveBeenCalledWith(true);

      openSpy.mockRestore();
    });

    it('should not preview draft courses', () => {
      const course = createMockCourse({ status: 'draft' });
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          course,
        })
      );

      act(() => {
        result.current.handlePreview();
      });

      expect(openSpy).not.toHaveBeenCalled();

      openSpy.mockRestore();
    });
  });

  describe('handleDiscardChanges', () => {
    it('should refetch course and lessons', async () => {
      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handleDiscardChanges();
      });

      await waitFor(() => {
        expect(defaultOptions.refetchCourse).toHaveBeenCalled();
        expect(mockLmsAdminApi.getCourseLessons).toHaveBeenCalled();
        expect(result.current.saving).toBe(false);
      });
    });

    it('should reset validation state', async () => {
      const { result } = renderHook(() => useCourseEditorActions(defaultOptions));

      await act(async () => {
        await result.current.handleDiscardChanges();
      });

      expect(mockValidation.setHasAttemptedPublish).toHaveBeenCalledWith(false);
    });

    it('should not discard for new courses', async () => {
      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          isNew: true,
        })
      );

      await act(async () => {
        await result.current.handleDiscardChanges();
      });

      expect(defaultOptions.refetchCourse).not.toHaveBeenCalled();
    });
  });

  describe('canSave and canPublish', () => {
    it('should return canSave from validation', () => {
      const validationCanSave = {
        ...mockValidation,
        canSave: vi.fn(() => true),
      };

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          validation: validationCanSave,
        })
      );

      expect(result.current.canSave).toBe(true);
    });

    it('should return canPublish from validation for existing courses', () => {
      const validationCanPublish = {
        ...mockValidation,
        canPublish: vi.fn(() => true),
      };

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          validation: validationCanPublish,
        })
      );

      expect(result.current.canPublish).toBe(true);
    });

    it('should return false for canPublish for new courses', () => {
      const validationCanPublish = {
        ...mockValidation,
        canPublish: vi.fn(() => true),
      };

      const { result } = renderHook(() =>
        useCourseEditorActions({
          ...defaultOptions,
          isNew: true,
          validation: validationCanPublish,
        })
      );

      expect(result.current.canPublish).toBe(false);
    });
  });
});

