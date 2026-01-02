/**
 * Create Asset Page - Metadata E2E Tests
 * 
 * End-to-end tests for asset creation with metadata
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CreateAssetPage } from './CreateAssetPage';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import { metadataApi } from '../../api/metadataClient';

// Mock dependencies
vi.mock('../../hooks/useMetadataOptions');
vi.mock('../../api/metadataClient');

describe('CreateAssetPage Metadata E2E Tests', () => {
  const mockUseMetadataOptions = useMetadataOptions as ReturnType<typeof vi.fn>;
  const mockMetadataApi = metadataApi as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

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
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
      setOptions: vi.fn(),
    });
  });

  it('should allow selecting metadata when creating asset', async () => {
    render(
      <BrowserRouter>
        <CreateAssetPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should render metadata selection components
      expect(screen.getByText(/product suite/i)).toBeInTheDocument();
      expect(screen.getByText(/product/i)).toBeInTheDocument();
      expect(screen.getByText(/topic tag/i)).toBeInTheDocument();
    });
  });

  it('should require metadata for publishing', async () => {
    render(
      <BrowserRouter>
        <CreateAssetPage />
      </BrowserRouter>
    );

    // Fill in required fields
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Asset' } });

    // Try to publish without metadata
    const publishButton = screen.getByText(/publish/i);
    fireEvent.click(publishButton);

    await waitFor(() => {
      // Should show validation error
      expect(screen.getByText(/metadata.*required/i)).toBeInTheDocument();
    });
  });
});

