/**
 * Unit tests for useCourseValidation hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCourseValidation } from './useCourseValidation';
import type { Course, Lesson } from '@gravyty/domain';

describe('useCourseValidation', () => {
  const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
    course_id: 'test-course-id',
    title: '',
    short_description: '',
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
      video_id: 'video-1',
      duration_seconds: 100,
    },
    resources: [],
    required: true,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_at: new Date().toISOString(),
    updated_by: 'user-1',
    ...overrides,
  });

  describe('canSave() - Save validation (title only)', () => {
    it('should return false when title is empty', () => {
      const course = createMockCourse({ title: '' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canSave()).toBe(false);
    });

    it('should return false when title is only whitespace', () => {
      const course = createMockCourse({ title: '   ' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canSave()).toBe(false);
    });

    it('should return true when title is populated', () => {
      const course = createMockCourse({ title: 'My Course' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canSave()).toBe(true);
    });

    it('should return false when course is null', () => {
      const { result } = renderHook(() =>
        useCourseValidation({ course: null, lessons: [] })
      );

      expect(result.current.canSave()).toBe(false);
    });
  });

  describe('getSaveValidationErrors()', () => {
    it('should return title error when title is empty', () => {
      const course = createMockCourse({ title: '' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      const errors = result.current.getSaveValidationErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('title');
      expect(errors[0].message).toBe('Course title is required');
      expect(errors[0].entityType).toBe('course');
      expect(errors[0].entityId).toBe('test-course-id');
      expect(errors[0].fieldKey).toBe('title');
    });

    it('should return empty array when title is populated', () => {
      const course = createMockCourse({ title: 'My Course' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      const errors = result.current.getSaveValidationErrors();
      expect(errors).toHaveLength(0);
    });
  });

  describe('canPublish() - Publish validation (full)', () => {
    it('should return false when title is missing', () => {
      const course = createMockCourse({ title: '' });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canPublish()).toBe(false);
    });

    it('should return false when short_description is missing', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: '',
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canPublish()).toBe(false);
    });

    it('should return false when sections are missing', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: 'Description',
        sections: [],
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canPublish()).toBe(false);
    });

    it('should return false when section has no title', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: 'Description',
        sections: [
          {
            section_id: 'section-1',
            title: '',
            order: 0,
            lesson_ids: [],
          },
        ],
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canPublish()).toBe(false);
    });

    it('should return false when section has no lessons', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: 'Description',
        sections: [
          {
            section_id: 'section-1',
            title: 'Section 1',
            order: 0,
            lesson_ids: [],
          },
        ],
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.canPublish()).toBe(false);
    });

    it('should return true when all required fields are valid', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: 'Description',
        sections: [
          {
            section_id: 'section-1',
            title: 'Section 1',
            order: 0,
            lesson_ids: ['lesson-1'],
          },
        ],
      });
      const lessons = [
        createMockLesson({
          lesson_id: 'lesson-1',
          section_id: 'section-1',
          title: 'Lesson 1',
        }),
      ];
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons })
      );

      expect(result.current.canPublish()).toBe(true);
    });
  });

  describe('hasAttemptedPublish state management', () => {
    it('should initialize as false', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.hasAttemptedPublish).toBe(false);
    });

    it('should update when setHasAttemptedPublish is called', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      act(() => {
        result.current.setHasAttemptedPublish(true);
      });

      expect(result.current.hasAttemptedPublish).toBe(true);

      act(() => {
        result.current.setHasAttemptedPublish(false);
      });

      expect(result.current.hasAttemptedPublish).toBe(false);
    });
  });

  describe('touchedFields tracking', () => {
    it('should initialize with empty set', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.touchedFields.size).toBe(0);
    });

    it('should add field when markFieldTouched is called', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      act(() => {
        result.current.markFieldTouched('course', 'test-course-id', 'title');
      });

      expect(result.current.touchedFields.size).toBe(1);
      expect(result.current.touchedFields.has('course:test-course-id:title')).toBe(true);
    });

    it('should not duplicate fields when markFieldTouched is called multiple times', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      act(() => {
        result.current.markFieldTouched('course', 'test-course-id', 'title');
        result.current.markFieldTouched('course', 'test-course-id', 'title');
      });

      expect(result.current.touchedFields.size).toBe(1);
    });
  });

  describe('shouldShowError()', () => {
    it('should return false when field not touched and hasAttemptedPublish is false', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(
        result.current.shouldShowError('course', 'test-course-id', 'title')
      ).toBe(false);
    });

    it('should return true when field is touched', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      act(() => {
        result.current.markFieldTouched('course', 'test-course-id', 'title');
      });

      expect(
        result.current.shouldShowError('course', 'test-course-id', 'title')
      ).toBe(true);
    });

    it('should return true when hasAttemptedPublish is true', () => {
      const course = createMockCourse();
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      act(() => {
        result.current.setHasAttemptedPublish(true);
      });

      expect(
        result.current.shouldShowError('course', 'test-course-id', 'title')
      ).toBe(true);
    });
  });

  describe('getValidationIssues()', () => {
    it('should return all errors and warnings', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: '', // Warning
        sections: [], // Error
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      const issues = result.current.getValidationIssues();
      expect(issues.length).toBeGreaterThan(0);
      
      const errors = issues.filter((i) => i.severity === 'error');
      const warnings = issues.filter((i) => i.severity === 'warning');
      
      expect(errors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Validation counts', () => {
    it('should return correct error count', () => {
      const course = createMockCourse({
        title: '',
        short_description: '',
        sections: [],
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.errorsCount).toBeGreaterThan(0);
    });

    it('should return correct warning count', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: '', // Warning
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.warningsCount).toBeGreaterThan(0);
    });

    it('should return correct total issues count', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: '', // Warning
        sections: [], // Error
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      expect(result.current.totalIssuesCount).toBe(
        result.current.errorsCount + result.current.warningsCount
      );
    });
  });

  describe('getPublishValidationErrors()', () => {
    it('should return all publish validation errors', () => {
      const course = createMockCourse({
        title: '',
        short_description: '',
        sections: [],
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      const errors = result.current.getPublishValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((e) => e.severity === 'error')).toBe(true);
    });
  });

  describe('getPublishValidationWarnings()', () => {
    it('should return all publish validation warnings', () => {
      const course = createMockCourse({
        title: 'My Course',
        short_description: '', // Warning
      });
      const { result } = renderHook(() =>
        useCourseValidation({ course, lessons: [] })
      );

      const warnings = result.current.getPublishValidationWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.every((w) => w.severity === 'warning')).toBe(true);
    });
  });
});

