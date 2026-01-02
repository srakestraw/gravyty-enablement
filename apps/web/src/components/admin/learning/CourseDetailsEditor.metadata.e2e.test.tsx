/**
 * Course Details Editor - Metadata E2E Tests
 * 
 * End-to-end tests for course creation/editing with metadata
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CourseDetailsEditor } from './CourseDetailsEditor';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import { metadataApi } from '../../../api/metadataClient';

// Mock dependencies
vi.mock('../../../hooks/useMetadataOptions');
vi.mock('../../../api/metadataClient');

describe('CourseDetailsEditor Metadata E2E Tests', () => {
  const mockUseMetadataOptions = useMetadataOptions as ReturnType<typeof vi.fn>;
  const mockMetadataApi = metadataApi as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockUseMetadataOptions.mockReturnValue({
      options: [
        {
          option_id: 'product-1',
          group_key: 'product',
          label: 'CRM',
          slug: 'crm',
          sort_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user1',
          updated_at: '2024-01-01T00:00:00Z',
          updated_by: 'user1',
        },
        {
          option_id: 'product-2',
          group_key: 'product',
          label: 'Marketing Cloud',
          slug: 'marketing-cloud',
          sort_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user1',
          updated_at: '2024-01-01T00:00:00Z',
          updated_by: 'user1',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });
  });

  it('should allow selecting product metadata', async () => {
    const mockCourse = {
      course_id: 'test-course',
      title: 'Test Course',
      product_ids: [],
      product_suite_ids: [],
      topic_tag_ids: [],
      badge_ids: [],
    };

    render(<CourseDetailsEditor course={mockCourse} onSave={vi.fn()} />);

    await waitFor(() => {
      // Should render metadata select components
      expect(screen.getByText(/product/i)).toBeInTheDocument();
    });
  });

  it('should allow selecting multiple topic tags', async () => {
    mockUseMetadataOptions.mockReturnValue({
      options: [
        {
          option_id: 'tag-1',
          group_key: 'topic_tag',
          label: 'Sales',
          slug: 'sales',
          sort_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user1',
          updated_at: '2024-01-01T00:00:00Z',
          updated_by: 'user1',
        },
        {
          option_id: 'tag-2',
          group_key: 'topic_tag',
          label: 'Marketing',
          slug: 'marketing',
          sort_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user1',
          updated_at: '2024-01-01T00:00:00Z',
          updated_by: 'user1',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });

    const mockCourse = {
      course_id: 'test-course',
      title: 'Test Course',
      product_ids: [],
      product_suite_ids: [],
      topic_tag_ids: [],
      badge_ids: [],
    };

    render(<CourseDetailsEditor course={mockCourse} onSave={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/topic/i)).toBeInTheDocument();
    });
  });
});

