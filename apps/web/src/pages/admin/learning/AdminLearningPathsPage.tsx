/**
 * Admin Learning Paths Page
 */

import { useState } from 'react';
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
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAdminPaths } from '../../../hooks/useAdminPaths';
import { lmsAdminApi } from '../../../api/lmsAdminClient';

export function AdminLearningPathsPage() {
  const navigate = useNavigate();
  const { data: paths, loading, error, refetch } = useAdminPaths();
  const [publishing, setPublishing] = useState<string | null>(null);

  const handlePublish = async (pathId: string) => {
    setPublishing(pathId);
    try {
      await lmsAdminApi.publishPath(pathId);
      refetch();
    } catch (err) {
      console.error('Failed to publish path:', err);
      alert('Failed to publish path');
    } finally {
      setPublishing(null);
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
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Learning Paths</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/enablement/admin/learning/paths/new')}
        >
          New Path
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paths && paths.length > 0 ? (
              paths.map((path) => (
                <TableRow key={path.path_id}>
                  <TableCell>{path.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={path.status}
                      color={path.status === 'published' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{path.version}</TableCell>
                  <TableCell>{path.course_count}</TableCell>
                  <TableCell>{new Date(path.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/enablement/admin/learning/paths/${path.path_id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    {path.status === 'draft' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handlePublish(path.path_id)}
                        disabled={publishing === path.path_id}
                      >
                        {publishing === path.path_id ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No paths found. Create your first path to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
