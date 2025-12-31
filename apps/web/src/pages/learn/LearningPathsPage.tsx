/**
 * Learning Paths Catalog Page
 * 
 * Role-aware page for browsing and managing learning paths.
 * - Students/Viewers: See only published paths, no authoring controls
 * - Contributors: See published + own drafts, can create/edit own
 * - Admins: See all paths, can create/edit/publish all
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { AltRouteOutlined, Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useLmsPaths } from '../../hooks/useLmsPaths';
import { useAdminPaths } from '../../hooks/useAdminPaths';
import { useAuth } from '../../contexts/AuthContext';
import { track } from '../../lib/telemetry';
import {
  canCreatePath,
  canPublishPath,
  canEditPath,
  hasLearningPermission,
} from '../../lib/learningPermissions';
import { lmsAdminApi } from '../../api/lmsAdminClient';
import type { PathSummary } from '@gravyty/domain';

function PathCard({ path, onClick }: { path: PathSummary; onClick: () => void }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <AltRouteOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                {path.title}
              </Typography>
              {path.short_description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {path.short_description}
                </Typography>
              )}
              {path.progress && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {path.progress.completed_courses} / {path.progress.total_courses} courses
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={path.progress.percent_complete}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  {path.progress.status === 'completed' && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      Completed
                    </Typography>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {path.estimated_duration_minutes && (
                  <Chip label={`${path.estimated_duration_minutes} min`} size="small" variant="outlined" />
                )}
                {path.course_count > 0 && (
                  <Chip label={`${path.course_count} courses`} size="small" variant="outlined" />
                )}
                {path.product && (
                  <Chip label={path.product} size="small" variant="outlined" />
                )}
              </Box>
              {path.topic_tags && path.topic_tags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                  {path.topic_tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function LearningPathsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('published');
  const [publishing, setPublishing] = useState<string | null>(null);

  // Determine if user can view drafts
  const canViewDrafts = hasLearningPermission(user?.role, 'learning.path.view.drafts.own') ||
    hasLearningPermission(user?.role, 'learning.path.view.drafts.any');
  const canCreate = canCreatePath(user?.role);
  const canPublish = canPublishPath(user?.role);

  // Use admin API if user can view drafts, otherwise use student API
  const useAdminView = canViewDrafts;

  // Always call hooks (React rules), but pass undefined when not using admin view
  const { paths: publishedPaths, loading: loadingPublished, error: errorPublished, nextCursor, refetch: refetchPublished } = useLmsPaths({ limit: 20 });
  const { data: adminPaths, loading: loadingAdmin, error: errorAdmin, refetch: refetchAdmin } = useAdminPaths(
    useAdminView ? { status: statusFilter === 'all' ? undefined : statusFilter } : undefined
  );

  // Combine paths based on view mode
  const paths = useAdminView 
    ? (adminPaths || []).map(p => ({
        path_id: p.path_id,
        title: p.title,
        short_description: undefined,
        product: undefined,
        topic_tags: [],
        estimated_duration_minutes: undefined,
        course_count: p.course_count,
        status: p.status as 'draft' | 'published' | 'archived',
        progress: undefined,
      }))
    : publishedPaths;

  const loading = useAdminView ? loadingAdmin : loadingPublished;
  const error = useAdminView ? errorAdmin?.message : errorPublished;
  const refetch = useAdminView ? refetchAdmin : refetchPublished;

  useEffect(() => {
    track('page_view', { page: 'learning_paths_catalog' });
  }, []);

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

  const handleCreatePath = () => {
    navigate('/enablement/admin/learning/paths/new');
  };

  const handleEditPath = (pathId: string) => {
    navigate(`/enablement/admin/learning/paths/${pathId}`);
  };

  // Filter paths based on status and permissions
  const filteredPaths = useMemo(() => {
    if (!useAdminView) {
      // Student view: only published paths (already filtered by API)
      return paths;
    }

    // Admin/Contributor view: filter by status filter
    if (statusFilter === 'all') {
      return paths;
    }
    return paths.filter(p => p.status === statusFilter);
  }, [paths, statusFilter, useAdminView]);

  if (loading && filteredPaths.length === 0) {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Learning Paths
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {useAdminView ? 'Create and manage structured learning paths' : 'Structured learning journeys and curricula'}
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePath}
          >
            New Path
          </Button>
        )}
      </Box>

      {useAdminView && (
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {filteredPaths.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No learning paths found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canCreate ? 'Create your first learning path to get started.' : 'Try adjusting your filters'}
          </Typography>
        </Box>
      ) : useAdminView ? (
        // Admin/Contributor view: Table layout with actions
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Courses</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPaths.map((path) => {
                const canEdit = canEditPath(user?.role, undefined, user?.userId, 'any');
                return (
                  <TableRow key={path.path_id}>
                    <TableCell>
                      <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/enablement/learn/paths/${path.path_id}`)}
                      >
                        {path.title}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={path.status}
                        color={path.status === 'published' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{path.course_count || 0}</TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditPath(path.path_id)}
                          title="Edit path"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {canPublish && path.status === 'draft' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handlePublish(path.path_id)}
                          disabled={publishing === path.path_id}
                          sx={{ ml: 1 }}
                        >
                          {publishing === path.path_id ? 'Publishing...' : 'Publish'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Student view: Card layout
        <>
          <Grid container spacing={3}>
            {filteredPaths.map((path) => (
              <Grid item xs={12} md={6} lg={4} key={path.path_id}>
                <PathCard path={path} onClick={() => navigate(`/enablement/learn/paths/${path.path_id}`)} />
              </Grid>
            ))}
          </Grid>
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" onClick={refetch}>
                Load More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
