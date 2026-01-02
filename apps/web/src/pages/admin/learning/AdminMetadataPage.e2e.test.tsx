/**
 * Metadata Admin Page E2E Tests
 * 
 * End-to-end tests for metadata management UI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminMetadataPage } from './AdminMetadataPage';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';

// Mock the metadata hook
import { vi } from 'vitest';

vi.mock('../../../hooks/useMetadataOptions');

describe('AdminMetadataPage E2E Tests', () => {
  const mockUseMetadataOptions = useMetadataOptions as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render metadata page with all group cards', async () => {
    // Mock hook responses
    mockUseMetadataOptions.mockReturnValue({
      options: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AdminMetadataPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Product Suite')).toBeInTheDocument();
      expect(screen.getByText('Topic Tags')).toBeInTheDocument();
      expect(screen.getByText('Badges')).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    mockUseMetadataOptions.mockReturnValue({
      options: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AdminMetadataPage />
      </BrowserRouter>
    );

    // Should show loading indicator
    expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
  });

  it('should display active and archived counts', async () => {
    const mockOptions = [
      {
        option_id: '1',
        group_key: 'product' as const,
        label: 'Active Product',
        status: 'active',
        archived_at: undefined,
        slug: 'active-product',
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user1',
        updated_at: '2024-01-01T00:00:00Z',
        updated_by: 'user1',
      },
      {
        option_id: '2',
        group_key: 'product' as const,
        label: 'Archived Product',
        status: 'archived',
        archived_at: '2024-01-02T00:00:00Z',
        slug: 'archived-product',
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user1',
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'user1',
      },
    ];

    mockUseMetadataOptions.mockReturnValue({
      options: mockOptions,
      loading: false,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AdminMetadataPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show counts
      expect(screen.getByText(/1.*active/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*archived/i)).toBeInTheDocument();
    });
  });
});

