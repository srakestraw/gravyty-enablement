/**
 * Admin Path Editor Page
 * 
 * Editor for learning paths with course list builder
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Alert,
  CircularProgress,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAdminPath } from '../../../hooks/useAdminPath';
import { useAdminCourses } from '../../../hooks/useAdminCourses';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { validatePathPublish, getValidationSummary, validatePathDraft } from '../../../validations/lmsValidations';
import { PublishReadinessPanel } from '../../../components/admin/learning/PublishReadinessPanel';
import type { LearningPath, LearningPathCourseRef } from '@gravyty/domain';

export function AdminPathEditorPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const isNew = pathId === 'new';
  const { data, loading, error, refetch } = useAdminPath(isNew ? null : pathId || null);
  const { data: allCourses } = useAdminCourses({ status: 'published' });

  // Local state
  const [path, setPath] = useState<LearningPath | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Published courses for selection
  const publishedCourses = useMemo(() => {
    return allCourses?.courses || [];
  }, [allCourses]);

  // Load path data
  useEffect(() => {
    if (data?.path) {
      setPath(data.path);
      setTitle(data.path.title);
      setDescription(data.path.description || '');
      setShortDescription(data.path.short_description || '');
      setTopicTags(data.path.topic_tags || []);
    }
  }, [data]);

  // Initialize new path
  useEffect(() => {
    if (isNew && !path) {
      const newPath: LearningPath = {
        path_id: 'new',
        title: '',
        status: 'draft',
        version: 1,
        courses: [],
        topic_tags: [],
        badges: [],
        created_at: new Date().toISOString(),
        created_by: '',
        updated_at: new Date().toISOString(),
        updated_by: '',
      };
      setPath(newPath);
    }
  }, [isNew, path]);

  // Validation
  const validationResult = useMemo(() => {
    if (!path) return { valid: false, errors: [] };
    return validatePathPublish(path);
  }, [path]);

  // Draft validation with warnings
  const draftValidation = useMemo(() => {
    if (!path) return { errors: [], warnings: [] };
    return validatePathDraft(path);
  }, [path]);

  const sortedCourses = useMemo(() => {
    if (!path) return [];
    return [...path.courses].sort((a, b) => a.order - b.order);
  }, [path]);

  const handleAddCourse = () => {
    if (!selectedCourseId || !path) return;

    const course = publishedCourses.find((c) => c.course_id === selectedCourseId);
    if (!course) return;

    // Check if already added
    if (path.courses.some((c) => c.course_id === selectedCourseId)) {
      alert('Course already added to path');
      return;
    }

    const newCourseRef: LearningPathCourseRef = {
      course_id: selectedCourseId,
      order: path.courses.length,
      required: true,
    };

    const updatedCourses = [...path.courses, newCourseRef];
    setPath({ ...path, courses: updatedCourses });
    setSelectedCourseId(null);
    setAddCourseDialogOpen(false);
  };

  const handleRemoveCourse = (courseId: string) => {
    if (!path) return;

    const updatedCourses = path.courses
      .filter((c) => c.course_id !== courseId)
      .map((c, idx) => ({ ...c, order: idx }));
    setPath({ ...path, courses: updatedCourses });
  };

  const handleReorderCourse = (courseId: string, direction: 'up' | 'down') => {
    if (!path) return;

    const courses = [...path.courses].sort((a, b) => a.order - b.order);
    const index = courses.findIndex((c) => c.course_id === courseId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courses.length) return;

    [courses[index], courses[newIndex]] = [courses[newIndex], courses[index]];
    courses[index].order = index;
    courses[newIndex].order = newIndex;

    setPath({ ...path, courses });
  };

  const handleToggleRequired = (courseId: string) => {
    if (!path) return;

    const updatedCourses = path.courses.map((c) =>
      c.course_id === courseId ? { ...c, required: !c.required } : c
    );
    setPath({ ...path, courses: updatedCourses });
  };

  const handleSave = async () => {
    if (!path) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        const response = await lmsAdminApi.createPath({
          title: title.trim(),
          description: description.trim() || undefined,
          short_description: shortDescription.trim() || undefined,
          topic_tags: topicTags,
          courses: path.courses,
        });

        if ('data' in response) {
          navigate(`/enablement/admin/learning/paths/${response.data.path.path_id}`);
        }
      } else {
        await lmsAdminApi.updatePath(path.path_id, {
          title: title.trim(),
          description: description.trim() || undefined,
          short_description: shortDescription.trim() || undefined,
          topic_tags: topicTags,
          courses: path.courses,
        });
        await refetch();
        
        // Refetch to ensure UI matches backend
        const pathResponse = await lmsAdminApi.getPath(path.path_id);
        if ('data' in pathResponse) {
          setPath(pathResponse.data.path);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save path');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!path || isNew || !validationResult.valid) return;

    setPublishing(true);
    setSaveError(null);

    try {
      await lmsAdminApi.publishPath(path.path_id);
      navigate('/enablement/admin/learning/paths');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish path');
    } finally {
      setPublishing(false);
    }
  };

  // Discard changes and reload from server
  const handleDiscardChanges = async () => {
    if (!path || isNew) return;

    // Refetch path
    await refetch();
    const pathResponse = await lmsAdminApi.getPath(path.path_id);
    if ('data' in pathResponse) {
      setPath(pathResponse.data.path);
      setTitle(pathResponse.data.path.title);
      setDescription(pathResponse.data.path.description || '');
      setShortDescription(pathResponse.data.path.short_description || '');
      setTopicTags(pathResponse.data.path.topic_tags || []);
    }
    setDiscardDialogOpen(false);
  };

  // Navigate to issue in editor
  const handleNavigateToIssue = (field: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // For path editor, most issues are in the metadata form or course list
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

  if (!path && !isNew) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Path not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isNew ? 'Create Learning Path' : `Edit Path: ${title || 'Loading...'}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isNew && (
            <Tooltip title="Discard unsaved changes and reload from server">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => setDiscardDialogOpen(true)}
                disabled={saving}
              >
                Discard Changes
              </Button>
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          {!isNew && data?.is_draft && (
            <Button
              variant="contained"
              color="success"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
              disabled={publishing || !validationResult.valid}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          )}
          <Button onClick={() => navigate('/enablement/admin/learning/paths')}>
            Cancel
          </Button>
        </Box>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {!validationResult.valid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {getValidationSummary(validationResult)}. Please fix errors before publishing.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left: Path Metadata */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Path Metadata
            </Typography>

            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              margin="normal"
            />

            <TextField
              label="Short Description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
              margin="normal"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              fullWidth
              margin="normal"
            />

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={topicTags}
              onChange={(_, newValue) => setTopicTags(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Topic Tags" placeholder="Add tags" margin="normal" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />
          </Paper>
        </Grid>

        {/* Center: Course List Builder */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Courses in Path</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddCourseDialogOpen(true)}
              >
                Add Course
              </Button>
            </Box>

            {sortedCourses.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No courses added yet. Add your first course to get started.
                </Typography>
              </Box>
            ) : (
              <List>
                {sortedCourses.map((courseRef, index) => {
                  const course = publishedCourses.find((c) => c.course_id === courseRef.course_id);
                  return (
                    <ListItem
                      key={courseRef.course_id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <Checkbox
                        checked={courseRef.required}
                        onChange={() => handleToggleRequired(courseRef.course_id)}
                        title="Required"
                      />
                      <ListItemText
                        primary={course?.title || courseRef.course_id}
                        secondary={`Order: ${courseRef.order + 1}${courseRef.required ? ' • Required' : ' • Optional'}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          disabled={index === 0}
                          onClick={() => handleReorderCourse(courseRef.course_id, 'up')}
                          title="Move up"
                        >
                          <ArrowUpIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={index === sortedCourses.length - 1}
                          onClick={() => handleReorderCourse(courseRef.course_id, 'down')}
                          title="Move down"
                        >
                          <ArrowDownIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveCourse(courseRef.course_id)}
                          title="Remove course"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right: Publish Readiness Panel */}
        <Grid item xs={12} md={3}>
          {path && (
            <PublishReadinessPanel
              entityType="path"
              errors={validationResult.errors}
              warnings={draftValidation.warnings.map((w) => ({ field: w.field, message: w.message }))}
              status={path.status}
              onNavigateToIssue={handleNavigateToIssue}
            />
          )}
        </Grid>
      </Grid>

      {/* Discard Changes Dialog */}
      <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will discard all unsaved changes and reload the path from the server. Any local edits will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDiscardChanges} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={addCourseDialogOpen} onClose={() => setAddCourseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Course to Path</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={publishedCourses}
            getOptionLabel={(option) => option.title}
            value={publishedCourses.find((c) => c.course_id === selectedCourseId) || null}
            onChange={(_, newValue) => setSelectedCourseId(newValue?.course_id || null)}
            renderInput={(params) => (
              <TextField {...params} label="Select Course" placeholder="Search courses..." />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCourseDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddCourse}
            disabled={!selectedCourseId}
          >
            Add Course
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

