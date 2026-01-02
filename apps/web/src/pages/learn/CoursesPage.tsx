/**
 * Courses Catalog Page
 * 
 * Role-aware page for browsing and managing courses with Card/List view toggle.
 * - Students/Viewers: See only published courses, default to Card view
 * - Contributors: See published + own drafts, default to List view
 * - Admins: See all courses, default to List view
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  SearchOutlined,
  Add as AddIcon,
} from '@mui/icons-material';
import { useLmsCourses } from '../../hooks/useLmsCourses';
import { useAdminCourses } from '../../hooks/useAdminCourses';
import { useAuth } from '../../contexts/AuthContext';
import { track } from '../../lib/telemetry';
import {
  canCreateCourse,
  canPublishCourse,
  hasLearningPermission,
} from '../../lib/learningPermissions';
import { lmsAdminApi } from '../../api/lmsAdminClient';
import type { CourseSummary } from '@gravyty/domain';
import { ViewModeToggle, getDefaultViewMode, type ViewMode } from '../../components/learning/ViewModeToggle';
import { CoursesCardGrid } from '../../components/learning/CoursesCardGrid';
import { CoursesTable } from '../../components/learning/CoursesTable';

export function CoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [productSuite, setProductSuite] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('published');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getDefaultViewMode(user?.role));
  const [sortBy, setSortBy] = useState<'title' | 'updated' | 'status'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Update view mode default when user role changes (but respect localStorage preference)
  useEffect(() => {
    const stored = localStorage.getItem('learning.courses.viewMode');
    if (!stored) {
      // Only update if no preference is stored
      const defaultMode = getDefaultViewMode(user?.role);
      setViewMode(defaultMode);
    }
  }, [user?.role]);

  // Determine if user can view drafts
  const canViewDrafts = hasLearningPermission(user?.role, 'learning.course.view.drafts.own') ||
    hasLearningPermission(user?.role, 'learning.course.view.drafts.any');
  const canCreate = canCreateCourse(user?.role);
  const canPublish = canPublishCourse(user?.role);
  const canArchive = hasLearningPermission(user?.role, 'learning.course.archive');
  const canViewAnyDrafts = hasLearningPermission(user?.role, 'learning.course.view.drafts.any');
  const canEditAny = hasLearningPermission(user?.role, 'learning.course.edit.any');

  // Use admin API if user can view drafts, otherwise use student API
  const useAdminView = canViewDrafts;
  
  // Show owner column if admin or can view/edit any drafts
  const showOwner = canViewAnyDrafts || canEditAny;
  
  const { courses: publishedCourses, loading: loadingPublished, error: errorPublished, nextCursor, refetch: refetchPublished } = useLmsCourses(
    {
      q: debouncedQuery || undefined,
      product: productSuite || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
      limit: 20,
    },
    {
      telemetry: {
        source_page: 'courses_catalog',
      },
    }
  );

  // Always call hooks (React rules), but pass undefined when not using admin view
  const { data: adminCourses, loading: loadingAdmin, error: errorAdmin, refetch: refetchAdmin } = useAdminCourses(
    useAdminView ? {
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: debouncedQuery || undefined,
      product: productSuite || undefined,
      product_suite: undefined,
    } : undefined
  );

  // Combine courses based on view mode
  const courses = useAdminView 
    ? (adminCourses || []).map(c => ({
        course_id: c.course_id,
        title: c.title,
        short_description: c.short_description,
        cover_image_url: c.cover_image_url,
        product: c.product,
        product_suite: c.product_suite,
        topic_tags: c.topic_tags || [],
        estimated_duration_minutes: c.estimated_duration_minutes,
        estimated_minutes: c.estimated_minutes,
        difficulty_level: c.difficulty_level,
        status: c.status as 'draft' | 'published' | 'archived',
        published_at: c.published_at,
        updated_at: c.updated_at, // Add updated_at for sorting
      } as CourseSummary & { updated_at?: string }))
    : publishedCourses;

  const loading = useAdminView ? loadingAdmin : loadingPublished;
  const error = useAdminView ? errorAdmin?.message : errorPublished;
  const refetch = useAdminView ? refetchAdmin : refetchPublished;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    track('page_view', { page: 'courses_catalog' });
  }, []);

  const handlePublish = async (courseId: string) => {
    setPublishing(courseId);
    try {
      await lmsAdminApi.publishCourse(courseId);
      refetch();
    } catch (err) {
      console.error('Failed to publish course:', err);
      alert('Failed to publish course');
    } finally {
      setPublishing(null);
    }
  };

  const handleCreateCourse = () => {
    navigate('/enablement/admin/learning/courses/new');
  };

  const handleEditCourse = (courseId: string) => {
    navigate(`/enablement/admin/learning/courses/${courseId}`);
  };

  // Extract unique topics and product suites for filters
  const allTopics = Array.from(
    new Set(courses.flatMap((c) => c.topic_tags || []))
  ).sort();
  const allProducts = Array.from(
    new Set(courses.map((c) => c.product).filter(Boolean) as string[])
  ).sort();

  // Filter courses based on status and permissions
  const filteredCourses = useMemo(() => {
    if (!useAdminView) {
      // Student view: only published courses (already filtered by API)
      return courses;
    }

    // Admin/Contributor view: filter by status filter
    let filtered = courses;
    if (statusFilter !== 'all') {
      filtered = courses.filter(c => c.status === statusFilter);
    }

    // Sort courses
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortBy === 'updated') {
        // Try published_at first, then fallback to any date field
        const aDate = a.published_at 
          ? new Date(a.published_at).getTime() 
          : (a as any).updated_at 
          ? new Date((a as any).updated_at).getTime() 
          : 0;
        const bDate = b.published_at 
          ? new Date(b.published_at).getTime() 
          : (b as any).updated_at 
          ? new Date((b as any).updated_at).getTime() 
          : 0;
        comparison = aDate - bDate;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [courses, statusFilter, useAdminView, sortBy, sortOrder]);

  const handleLoadMore = () => {
    // TODO: Implement pagination with cursor
    refetch();
  };

  const handleView = (courseId: string) => {
    navigate(`/enablement/learn/courses/${courseId}`);
  };

  const handleArchive = async (courseId: string) => {
    if (!confirm('Are you sure you want to archive this course? It will be hidden from the course list.')) {
      return;
    }
    setArchiving(courseId);
    try {
      await lmsAdminApi.archiveCourse(courseId);
      refetch();
    } catch (err) {
      console.error('Failed to archive course:', err);
      alert('Failed to archive course');
    } finally {
      setArchiving(null);
    }
  };

  const handleSortChange = (field: 'title' | 'updated' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Courses
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {useAdminView ? 'Manage courses, create new content, and configure course settings' : 'Browse and access enablement courses'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateCourse}
            >
              New Course
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {/* Status filter - only show if user can view drafts */}
          {useAdminView && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
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
            </Grid>
          )}
          <Grid item xs={12} md={useAdminView ? 3 : 4}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select
                value={productSuite}
                onChange={(e) => setProductSuite(e.target.value)}
                label="Product"
              >
                <MenuItem value="">All</MenuItem>
                {allProducts.map((product) => (
                  <MenuItem key={product} value={product}>
                    {product}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Topic Tags */}
        {allTopics.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Topics:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {allTopics.map((topic) => (
                <Chip
                  key={topic}
                  label={topic}
                  size="small"
                  onClick={() => {
                    setSelectedTopics((prev) =>
                      prev.includes(topic)
                        ? prev.filter((t) => t !== topic)
                        : [...prev, topic]
                    );
                  }}
                  color={selectedTopics.includes(topic) ? 'primary' : 'default'}
                  variant={selectedTopics.includes(topic) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Results */}
      {loading && filteredCourses.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredCourses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No courses found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canCreate ? 'Create your first course to get started.' : 'Try adjusting your filters'}
          </Typography>
        </Box>
      ) : viewMode === 'card' ? (
        // Card view
        <>
          <CoursesCardGrid
            courses={filteredCourses}
            userRole={user?.role}
            userId={user?.userId}
            onView={handleView}
            onEdit={useAdminView ? handleEditCourse : undefined}
            onPublish={canPublish ? handlePublish : undefined}
            onArchive={canArchive ? handleArchive : undefined}
            showStatus={useAdminView}
            showActions={useAdminView}
            isAllView={useAdminView && statusFilter === 'all'}
          />
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" onClick={handleLoadMore}>
                Load More
              </Button>
            </Box>
          )}
        </>
      ) : (
        // List view
        <>
          <CoursesTable
            courses={filteredCourses}
            userRole={user?.role}
            userId={user?.userId}
            showOwner={showOwner}
            onView={handleView}
            onEdit={useAdminView ? handleEditCourse : undefined}
            onPublish={canPublish ? handlePublish : undefined}
            onArchive={canArchive ? handleArchive : undefined}
            publishing={publishing}
            archiving={archiving}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" onClick={handleLoadMore}>
                Load More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
