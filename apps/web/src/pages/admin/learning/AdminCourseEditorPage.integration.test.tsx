/**
 * Integration tests for AdminCourseEditorPage validation and Save button
 * 
 * Validates:
 * - Inspector shows correct number of validation errors
 * - Save Draft button becomes enabled when required fields are filled
 * - Validation updates correctly as fields are filled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState, useMemo } from 'react';
import { validateCourseDraft } from '../../../validations/lmsValidations';
import type { Course, Lesson } from '@gravyty/domain';

// Test component that mimics the key validation and Save button logic
function TestCourseEditor({ initialCourse }: { initialCourse: Course }) {
  const [course, setCourse] = useState<Course>(initialCourse);
  const [lessons] = useState<Lesson[]>([]);

  // Validation logic (same as AdminCourseEditorPage)
  const draftValidation = useMemo(() => {
    if (!course) return { errors: [], warnings: [] };
    return validateCourseDraft(course, lessons);
  }, [course, lessons]);

  const issuesCount = draftValidation.errors.length;
  const canSave = course?.title?.trim() && course?.short_description?.trim();

  const handleUpdateCourse = (updates: Partial<Course>) => {
    setCourse((prev) => ({ ...prev, ...updates } as Course));
  };

  return (
    <div data-testid="test-course-editor">
      <div data-testid="issues-count">{issuesCount}</div>
      <div data-testid="inspector-errors-count">{draftValidation.errors.length}</div>
      <div data-testid="inspector-errors">
        {draftValidation.errors.map((error, idx) => (
          <div key={idx} data-testid={`error-${idx}`}>
            {error.message}
          </div>
        ))}
      </div>
      <button
        data-testid="save-draft-button"
        disabled={!canSave}
      >
        Save Draft
      </button>
      <input
        data-testid="title-input"
        value={course.title || ''}
        onChange={(e) => handleUpdateCourse({ title: e.target.value })}
        placeholder="Title"
      />
      <textarea
        data-testid="short-description-input"
        value={course.short_description || ''}
        onChange={(e) => handleUpdateCourse({ short_description: e.target.value })}
        placeholder="Short Description"
      />
    </div>
  );
}

describe('AdminCourseEditorPage Integration', () => {
  const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
    course_id: 'new',
    title: '',
    short_description: '',
    description: '',
    product_id: undefined,
    product_suite_id: undefined,
    topic_tag_ids: [],
    badge_ids: [],
    sections: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Issues Count', () => {
    it('should show 3 errors initially for new course (title, short_description, sections)', () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      // Initially should have 3 errors: title, short_description, and sections
      const issuesCount = screen.getByTestId('issues-count');
      expect(issuesCount.textContent).toBe('3');
      
      const inspectorErrorsCount = screen.getByTestId('inspector-errors-count');
      expect(inspectorErrorsCount.textContent).toBe('3');
    });

    it('should decrease errors count when title is filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });

      // Wait for validation to update
      await waitFor(() => {
        const issuesCount = screen.getByTestId('issues-count');
        // Should decrease from 3 to 2 (title error resolved, still missing short_description and sections)
        expect(issuesCount.textContent).toBe('2');
      });

      const inspectorErrorsCount = screen.getByTestId('inspector-errors-count');
      expect(inspectorErrorsCount.textContent).toBe('2');
    });

    it('should decrease errors count when short_description is filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const shortDescInput = screen.getByTestId('short-description-input');
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      // Wait for validation to update
      await waitFor(() => {
        const issuesCount = screen.getByTestId('issues-count');
        // Should decrease from 3 to 2 (short_description error resolved, still missing title and sections)
        expect(issuesCount.textContent).toBe('2');
      });

      const inspectorErrorsCount = screen.getByTestId('inspector-errors-count');
      expect(inspectorErrorsCount.textContent).toBe('2');
    });

    it('should show 1 error when title and short_description are filled (only sections missing)', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      const shortDescInput = screen.getByTestId('short-description-input');

      // Fill both fields
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      // Wait for validation to update
      await waitFor(() => {
        const issuesCount = screen.getByTestId('issues-count');
        // Should show 1 error (only sections missing)
        expect(issuesCount.textContent).toBe('1');
      });

      const inspectorErrorsCount = screen.getByTestId('inspector-errors-count');
      expect(inspectorErrorsCount.textContent).toBe('1');
    });
  });

  describe('Save Draft Button State', () => {
    it('should be disabled initially when title and short_description are empty', () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const saveButton = screen.getByTestId('save-draft-button');
      expect(saveButton).toBeDisabled();
    });

    it('should be disabled when only title is filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).toBeDisabled(); // Still disabled because short_description is empty
      });
    });

    it('should be disabled when only short_description is filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const shortDescInput = screen.getByTestId('short-description-input');
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).toBeDisabled(); // Still disabled because title is empty
      });
    });

    it('should become enabled when both title and short_description are filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      const shortDescInput = screen.getByTestId('short-description-input');

      // Fill title first
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });
      
      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).toBeDisabled(); // Still disabled
      });

      // Fill short description
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      // Now button should be enabled
      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should become disabled again if title is cleared', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      const shortDescInput = screen.getByTestId('short-description-input');

      // Fill both fields
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).not.toBeDisabled();
      });

      // Clear title
      fireEvent.change(titleInput, { target: { value: '' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).toBeDisabled();
      });
    });

    it('should become disabled again if short_description is cleared', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      const shortDescInput = screen.getByTestId('short-description-input');

      // Fill both fields
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).not.toBeDisabled();
      });

      // Clear short description
      fireEvent.change(shortDescInput, { target: { value: '' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button');
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Inspector Validation Errors', () => {
    it('should show correct error messages in Inspector', () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      // Initially should show 3 errors
      const errorsCount = screen.getByTestId('inspector-errors-count');
      expect(errorsCount.textContent).toBe('3');

      // Check that specific error messages are present
      const errors = screen.getByTestId('inspector-errors');
      expect(errors).toBeInTheDocument();
      
      // Verify error messages
      expect(screen.getByText('Course title is required')).toBeInTheDocument();
      expect(screen.getByText('Short description is required')).toBeInTheDocument();
      expect(screen.getByText('Course must have at least one section')).toBeInTheDocument();
    });

    it('should update Inspector errors when title is filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });

      await waitFor(() => {
        const errorsCount = screen.getByTestId('inspector-errors-count');
        expect(errorsCount.textContent).toBe('2'); // Title error should be gone
      });

      // Verify "Course title is required" error is gone
      expect(screen.queryByText('Course title is required')).not.toBeInTheDocument();
      // But other errors remain
      expect(screen.getByText('Short description is required')).toBeInTheDocument();
      expect(screen.getByText('Course must have at least one section')).toBeInTheDocument();
    });

    it('should update Inspector errors when both title and short_description are filled', async () => {
      const mockCourse = createMockCourse();
      render(<TestCourseEditor initialCourse={mockCourse} />);

      const titleInput = screen.getByTestId('title-input');
      const shortDescInput = screen.getByTestId('short-description-input');

      // Fill both fields
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      await waitFor(() => {
        const errorsCount = screen.getByTestId('inspector-errors-count');
        expect(errorsCount.textContent).toBe('1'); // Only sections error remains
      });

      // Verify title and short_description errors are gone
      expect(screen.queryByText('Course title is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Short description is required')).not.toBeInTheDocument();
      // But sections error remains
      expect(screen.getByText('Course must have at least one section')).toBeInTheDocument();
    });

    it('should show errors increase when fields are cleared', async () => {
      const mockCourse = createMockCourse({
        title: 'Test Title',
        short_description: 'Test Description',
      });
      render(<TestCourseEditor initialCourse={mockCourse} />);

      // Initially should have 1 error (only sections)
      expect(screen.getByTestId('inspector-errors-count').textContent).toBe('1');

      // Clear title
      const titleInput = screen.getByTestId('title-input');
      fireEvent.change(titleInput, { target: { value: '' } });

      await waitFor(() => {
        const errorsCount = screen.getByTestId('inspector-errors-count');
        expect(errorsCount.textContent).toBe('2'); // Title error reappears
      });

      // Clear short description
      const shortDescInput = screen.getByTestId('short-description-input');
      fireEvent.change(shortDescInput, { target: { value: '' } });

      await waitFor(() => {
        const errorsCount = screen.getByTestId('inspector-errors-count');
        expect(errorsCount.textContent).toBe('3'); // Back to 3 errors
      });
    });
  });
});

