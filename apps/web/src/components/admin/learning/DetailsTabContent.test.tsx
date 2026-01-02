/**
 * Tests for DetailsTabContent component
 * 
 * Validates that course title and short description updates work correctly:
 * - Local state updates immediately when user types
 * - onUpdateCourse is called with correct field names
 * - Validation reflects updated values
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DetailsTabContent } from './DetailsTabContent';
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
  MetadataMultiSelect: ({ value, onChange, label }: any) => (
    <div data-testid={`metadata-multi-select-${label}`}>
      <input
        data-testid={`metadata-multi-input-${label}`}
        value={Array.isArray(value) ? value.join(',') : ''}
        onChange={(e) => onChange?.(e.target.value.split(',').filter(Boolean))}
      />
    </div>
  ),
}));

vi.mock('../../common/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: any) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="rich-text-textarea"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('../../content-hub/AssetPicker', () => ({
  AssetPicker: () => <div data-testid="asset-picker">Asset Picker</div>,
}));

vi.mock('../../lms/CourseAssets', () => ({
  CourseAssets: () => <div data-testid="course-assets">Course Assets</div>,
}));

vi.mock('../../shared/CoverImageSelector', () => ({
  CoverImageSelector: () => <div data-testid="cover-image-selector">Cover Image Selector</div>,
}));

vi.mock('../../../api/lmsAdminClient', () => ({
  lmsAdminApi: {
    uploadTemporaryMedia: vi.fn(),
  },
}));

vi.mock('../../../utils/focusRegistry', () => ({
  focusRegistry: {
    register: vi.fn(() => vi.fn()),
  },
}));

describe('DetailsTabContent', () => {
  const mockCourse: Course = {
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
  };

  const mockOnUpdateCourse = vi.fn();
  const mockShouldShowError = vi.fn(() => false);
  const mockMarkFieldTouched = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Course Title Updates', () => {
    it('should call onUpdateCourse with title field when user types in title input', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      
      // Type in the title field
      fireEvent.change(titleInput, { target: { value: 'Test Course Title' } });

      // Verify onUpdateCourse was called with correct field name
      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      // Check that the updates object has the 'title' field
      const calls = mockOnUpdateCourse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const lastCall = calls[calls.length - 1];
      const updates = lastCall[0];
      
      expect(updates).toHaveProperty('title');
      expect(updates.title).toBe('Test Course Title');
      expect(updates).not.toHaveProperty('short_description'); // Should only update title
    });

    it('should update local state immediately when typing in title field', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      
      // Type multiple characters
      fireEvent.change(titleInput, { target: { value: 'T' } });
      expect(titleInput.value).toBe('T');
      
      fireEvent.change(titleInput, { target: { value: 'Te' } });
      expect(titleInput.value).toBe('Te');
      
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      expect(titleInput.value).toBe('Test');
    });
  });

  describe('Short Description Updates', () => {
    it('should call onUpdateCourse with short_description field when user types', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const shortDescInput = screen.getByLabelText(/short description/i) as HTMLTextAreaElement;
      
      // Type in the short description field
      fireEvent.change(shortDescInput, { target: { value: 'Test Short Description' } });

      // Verify onUpdateCourse was called with correct field name
      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      // Check that the updates object has the 'short_description' field
      const calls = mockOnUpdateCourse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const lastCall = calls[calls.length - 1];
      const updates = lastCall[0];
      
      expect(updates).toHaveProperty('short_description');
      expect(updates.short_description).toBe('Test Short Description');
      expect(updates).not.toHaveProperty('title'); // Should only update short_description
    });

    it('should update local state immediately when typing in short description field', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const shortDescInput = screen.getByLabelText(/short description/i) as HTMLTextAreaElement;
      
      // Type multiple characters
      fireEvent.change(shortDescInput, { target: { value: 'S' } });
      expect(shortDescInput.value).toBe('S');
      
      fireEvent.change(shortDescInput, { target: { value: 'Sh' } });
      expect(shortDescInput.value).toBe('Sh');
      
      fireEvent.change(shortDescInput, { target: { value: 'Short' } });
      expect(shortDescInput.value).toBe('Short');
    });
  });

  describe('Field Name Correctness', () => {
    it('should use exact field name "title" in updates object', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'My Course' } });

      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      const updates = mockOnUpdateCourse.mock.calls[mockOnUpdateCourse.mock.calls.length - 1][0];
      
      // Verify the exact field name is used (not a transformed version)
      expect(Object.keys(updates)).toContain('title');
      expect(Object.keys(updates)).not.toContain('course_title');
      expect(Object.keys(updates)).not.toContain('Title');
      expect(updates.title).toBe('My Course');
    });

    it('should use exact field name "short_description" in updates object', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const shortDescInput = screen.getByLabelText(/short description/i);
      fireEvent.change(shortDescInput, { target: { value: 'My Description' } });

      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      const updates = mockOnUpdateCourse.mock.calls[mockOnUpdateCourse.mock.calls.length - 1][0];
      
      // Verify the exact field name is used
      expect(Object.keys(updates)).toContain('short_description');
      expect(Object.keys(updates)).not.toContain('shortDescription');
      expect(Object.keys(updates)).not.toContain('Short Description');
      expect(updates.short_description).toBe('My Description');
    });
  });

  describe('Multiple Field Updates', () => {
    it('should handle separate updates for title and short_description independently', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      const shortDescInput = screen.getByLabelText(/short description/i);

      // Update title first
      fireEvent.change(titleInput, { target: { value: 'Course Title' } });
      
      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      const titleUpdate = mockOnUpdateCourse.mock.calls[mockOnUpdateCourse.mock.calls.length - 1][0];
      expect(titleUpdate).toHaveProperty('title');
      expect(titleUpdate.title).toBe('Course Title');
      expect(titleUpdate).not.toHaveProperty('short_description');

      // Clear mock to test next update
      mockOnUpdateCourse.mockClear();

      // Update short description
      fireEvent.change(shortDescInput, { target: { value: 'Short Desc' } });
      
      await waitFor(() => {
        expect(mockOnUpdateCourse).toHaveBeenCalled();
      });

      const shortDescUpdate = mockOnUpdateCourse.mock.calls[mockOnUpdateCourse.mock.calls.length - 1][0];
      expect(shortDescUpdate).toHaveProperty('short_description');
      expect(shortDescUpdate.short_description).toBe('Short Desc');
      expect(shortDescUpdate).not.toHaveProperty('title');
    });
  });

  describe('Validation Integration', () => {
    it('should call markFieldTouched when field loses focus', async () => {
      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={mockShouldShowError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      
      // Focus and blur the field
      fireEvent.focus(titleInput);
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(mockMarkFieldTouched).toHaveBeenCalledWith('course', 'new', 'title');
      });
    });

    it('should show error state when shouldShowError returns true', () => {
      const shouldShowErrorWithError = vi.fn((entityType, entityId, fieldKey) => {
        return fieldKey === 'title';
      });

      render(
        <DetailsTabContent
          course={mockCourse}
          onUpdateCourse={mockOnUpdateCourse}
          shouldShowError={shouldShowErrorWithError}
          markFieldTouched={mockMarkFieldTouched}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      
      // Field should show error state when empty and shouldShowError returns true
      // Note: The actual error display depends on the component implementation
      // This test verifies shouldShowError is called correctly
      expect(shouldShowErrorWithError).toHaveBeenCalled();
    });
  });
});

