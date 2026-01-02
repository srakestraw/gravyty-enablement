/**
 * Admin Badge Awards Page
 * 
 * View and manage badge awards for a specific badge
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { badgeApi } from '../../../api/badgeClient';
import { isErrorResponse } from '../../../lib/apiClient';
import type { Badge, BadgeAward } from '@gravyty/domain';

export function AdminBadgeAwardsPage() {
  const { badgeId } = useParams<{ badgeId: string }>();
  const navigate = useNavigate();

  const [badge, setBadge] = useState<Badge | null>(null);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (badgeId) {
      loadBadgeAndAwards();
    }
  }, [badgeId]);

  const loadBadgeAndAwards = async () => {
    if (!badgeId) return;
    setLoading(true);
    setError(null);
    try {
      const [badgeRes, awardsRes] = await Promise.all([
        badgeApi.getBadge(badgeId),
        badgeApi.listBadgeAwards(badgeId),
      ]);

      if (isErrorResponse(badgeRes)) {
        setError(badgeRes.error.message);
      } else {
        setBadge(badgeRes.data.badge);
      }

      if (isErrorResponse(awardsRes)) {
        setError(awardsRes.error.message);
      } else {
        setAwards(awardsRes.data.awards);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge awards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/enablement/admin/badges')}>
          Back
        </Button>
        <Typography variant="h4">
          {badge?.name || 'Badge'} Awards
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          {awards.length} user{awards.length !== 1 ? 's' : ''} have been awarded this badge
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Awarded At</TableCell>
              <TableCell>Expires At</TableCell>
              <TableCell>Course ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {awards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No awards found for this badge
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              awards.map((award, index) => (
                <TableRow key={index}>
                  <TableCell>{award.user_id}</TableCell>
                  <TableCell>{new Date(award.awarded_at).toLocaleString()}</TableCell>
                  <TableCell>{award.expires_at ? new Date(award.expires_at).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>{award.course_id || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

