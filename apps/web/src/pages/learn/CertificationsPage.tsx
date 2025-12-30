/**
 * My Certificates Page
 * 
 * View earned certificates
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Chip,
  Snackbar,
} from '@mui/material';
import { WorkspacePremiumOutlined, DownloadOutlined } from '@mui/icons-material';
import { useLmsCertificates } from '../../hooks/useLmsCertificates';
import { track } from '../../lib/telemetry';
import { getIdToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function CertificateCard({ certificate }: { certificate: any }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    
    try {
      // Get auth headers
      const headers: HeadersInit = {};
      const token = await getIdToken(true);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to dev headers
        const devRole = import.meta.env.VITE_DEV_ROLE || 'Viewer';
        const devUserId = import.meta.env.VITE_DEV_USER_ID || 'dev-user';
        headers['x-dev-role'] = devRole;
        headers['x-dev-user-id'] = devUserId;
      }

      const response = await fetch(`${API_BASE_URL}/v1/lms/certificates/${certificate.certificate_id}/download`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Download failed: ${response.status}`);
      }

      // Create blob URL and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificate.certificate_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download certificate');
      console.error('Certificate download error:', err);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <WorkspacePremiumOutlined sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {certificate.template_name || certificate.template_id}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {certificate.recipient_name}
            </Typography>
            {certificate.course_title && (
              <Chip label={certificate.course_title} size="small" sx={{ mr: 1, mt: 1 }} />
            )}
            {certificate.path_title && (
              <Chip label={certificate.path_title} size="small" sx={{ mt: 1 }} />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Issued: {new Date(certificate.issued_at).toLocaleDateString()}
            </Typography>
            {certificate.badge_text && (
              <Chip
                label={certificate.badge_text}
                color="primary"
                size="small"
                sx={{ mt: 1, mb: 1 }}
              />
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                startIcon={<DownloadOutlined />}
                variant="outlined"
                size="small"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </Box>
            {error && (
              <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                message={error}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CertificationsPage() {
  const { certificates, loading, error, refetch } = useLmsCertificates();

  useEffect(() => {
    track('page_view', { page: 'certificates' });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={refetch} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Certificates
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View and manage your earned certificates and certifications
      </Typography>

      {certificates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <WorkspacePremiumOutlined sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No certificates yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete courses and learning paths to earn certificates
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {certificates.map((certificate) => (
            <Grid item xs={12} md={6} key={certificate.certificate_id}>
              <CertificateCard certificate={certificate} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
