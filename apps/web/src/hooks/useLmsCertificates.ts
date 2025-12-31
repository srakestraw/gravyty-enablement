/**
 * Hook for fetching LMS certificates
 */

import { useState, useEffect } from 'react';
import { lmsApi } from '../api/lmsClient';
import type { CertificateSummary } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsCertificatesResult {
  certificates: CertificateSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLmsCertificates(): UseLmsCertificatesResult {
  const [certificates, setCertificates] = useState<CertificateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.listCertificates();
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setCertificates([]);
      } else {
        setCertificates(response.data.certificates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
  };
}



