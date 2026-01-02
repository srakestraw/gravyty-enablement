/**
 * Admin Badges Page
 * 
 * List and manage badges
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { badgeApi } from '../../../api/badgeClient';
import { isErrorResponse } from '../../../lib/apiClient';
import type { Badge } from '@gravyty/domain';
import { BadgeChip } from '../../../components/shared/badges/BadgeChip';

export function AdminBadgesPage() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await badgeApi.listBadges();
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        setBadges(response.data.badges);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Badges</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/enablement/admin/badges/new')}
        >
          Create Badge
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {badges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No badges found. Create your first badge to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              badges.map((badge) => (
                <TableRow key={badge.badge_id}>
                  <TableCell>
                    <BadgeChip
                      badge={{
                        name: badge.name,
                        icon_key: badge.icon_key,
                        icon_color: badge.icon_color,
                        color: badge.color,
                      }}
                      variant="list"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{badge.description || '-'}</TableCell>
                  <TableCell>
                    {badge.archived_at ? (
                      <Chip label="Archived" size="small" color="default" />
                    ) : (
                      <Chip label="Active" size="small" color="primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/enablement/admin/badges/${badge.badge_id}`)}
                      title="Edit badge"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

