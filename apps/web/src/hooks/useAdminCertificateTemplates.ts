/**
 * Admin Certificate Templates Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi } from '../api/lmsAdminClient';

export function useAdminCertificateTemplates() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.listCertificateTemplates()
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data.templates);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load certificate templates'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = () => {
    setLoading(true);
    setError(null);
    lmsAdminApi.listCertificateTemplates()
      .then((response) => {
        if ('data' in response) {
          setData(response.data.templates);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load certificate templates'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

