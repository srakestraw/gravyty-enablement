/**
 * Unit tests for CourseDetailsEditor component (Phase 3)
 * 
 * Tests that the component is controlled (no local state for form fields)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CourseDetailsEditor } from './CourseDetailsEditor';
import type { Course } from '@gravyty/domain';

// Mock dependencies
vi.mock('../../metadata', () => ({
  MetadataSelect: ({ value, onChange, label }: any) => (
    <div data-testid={`metadata-select-${label}`}>
      <input
        data-testid={`metadata-input-${label}`}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
  MetadataMultiSelect: ({ values, onChange, label }: any) => (
    <div data-testid={`metadata-multi-select-${label}`}>
      <input
        data-testid={`metadata-multi-input-${label}`}
        value={Array.isArray(values) ? values.join(',') : ''}
        onChange={(e) => onChange?.(e.target.value.split(',').filter(Boolean))}
      />
    </div>
  ),
}));

vi.mock('../../common/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, label }: any) => (
    <div data-testid={`rich-text-editor-${label}`}>
      <textarea
        data-testid={`rich-text-input-${label}`}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('../../content-hub/AssetPicker', () => ({
  AssetPicker: ({ open, onClose, onSelect }: any) => (
    open ? (
      <div data-testid="asset-picker">
        <button onClick={() => onSelect('asset-1', 'version-1', 'Test Asset')}>Select Asset</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock('../../lms/CourseAssets', () => ({
  CourseAssets: () => <div data-testid="course-assets">Course Assets</div>,
}));

vi.mock('../../shared/CoverImageSelector', () => ({
  CoverImageSelector: () => <div data-testid="cover-image-selector">Cover Image Selector</div>,
}));

vi.mock('../../../utils/focusRegistry', () => ({
  focusRegistry: {
    register: vi.fn(() => vi.fn()),
  },
}));

describe('CourseDetailsEditor', () => {
  const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
    course_id: 'test-course-id',
    title: '',
    short_description: '',
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

  const mockOnUpdateCourse = vi.fn();
  const mockShouldShowError = vi.fn(() => false);
  const mockMarkFieldTouched = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Controlled component - no local state', () => {
    it('should display course values from prop (not local state)', () => {
      const course = createMockCourse({ title: 'My Course', short_description: 'Description' });
      
      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      const shortDescInput = screen.getByLabelText(/short description/i) as HTMLInputElement;

      expect(titleInput.value).toBe('My Course');
      expect(shortDescInput.value).toBe('Description');
    });

    it('should update parent state when user types (controlled input)', async () => {
      const course = createMockCourse({ title: '' });
      
      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalledWith({ title: 'New Title' });
      });
    });

    it('should update when course prop changes (controlled)', () => {
      const { rerender } = render(
        <CourseDetailsEditor
          course={createMockCourse({ title: 'Initial' })}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      let titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Initial');

      // Update course prop
      rerender(
        <CourseDetailsEditor
          course={createMockCourse({ title: 'Updated' })}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Updated');
    });
  });

  describe('Values persist when component remounts', () => {
    it('should maintain values when component unmounts and remounts', () => {
      const course = createMockCourse({ title: 'Persisted Title' });
      
      const { unmount, rerender } = render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Persisted Title');

      // Unmount component
      unmount();

      // Remount with same course
      rerender(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInputAfterRemount = screen.getByLabelText(/title/i) as HTMLInputElement;
      // Value should still be there because it comes from prop, not local state
      expect(titleInputAfterRemount.value).toBe('Persisted Title');
    });
  });

  describe('Tab switching simulation', () => {
    it('should maintain values when simulating tab switch (unmount/remount)', () => {
      const course = createMockCourse({ title: 'Tab Test Title' });
      
      // Simulate being on Details tab
      const { unmount, rerender } = render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Tab Test Title');

      // Simulate switching to Outline tab (component unmounts)
      unmount();

      // Simulate switching back to Details tab (component remounts)
      // Course state should still have the value because it's in parent
      rerender(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInputAfterSwitch = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInputAfterSwitch.value).toBe('Tab Test Title');
    });
  });

  describe('Field updates propagate to parent', () => {
    it('should call onUpdateCourse when title changes', async () => {
      const course = createMockCourse();
      
      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalledWith({ title: 'New Title' });
      });
    });

    it('should call onUpdateCourse when short_description changes', async () => {
      const course = createMockCourse();
      
      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const shortDescInput = screen.getByLabelText(/short description/i);
      fireEvent.change(shortDescInput, { target: { value: 'New Description' } });

      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalledWith({ short_description: 'New Description' });
      });
    });
  });

  describe('markFieldTouched integration', () => {
    it('should call markFieldTouched when field loses focus', async () => {
      const course = createMockCourse();
      
      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      
      fireEvent.focus(titleInput);
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(mockMarkFieldTouched).toHaveBeenCalledWith('course', 'test-course-id', 'title');
      });
    });
  });

  describe('shouldShowError integration', () => {
    it('should show error state when shouldShowError returns true', () => {
      const course = createMockCourse({ title: '' });
      const shouldShowErrorWithError = vi.fn((entityType, entityId, fieldKey) => {
        return fieldKey === 'title';
      });

      render(
        <CourseDetailsEditor
          course={course}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={shouldShowErrorWithError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      const formControl = titleInput.closest('.MuiFormControl-root');
      
      // Field should show error state
      expect(shouldShowErrorWithError).toHaveBeenCalled();
      // Error helper text should be visible
      expect(screen.getByText('Course title is required')).toBeInTheDocument();
    });
  });
});

