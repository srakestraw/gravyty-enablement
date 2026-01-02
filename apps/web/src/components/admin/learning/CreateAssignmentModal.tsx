/**
 * Create Assignment Modal Component
 * 
 * Shared modal for creating assignments with user and target autocomplete.
 * Can be used from global assignments page or contextual (Course/Path) pages.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { usersApi, type AdminUser } from '../../../lib/apiClient';

export interface CreateAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (assignmentId: string, assigneeName: string, targetTitle: string) => void;
  // Contextual mode: pre-select target
  contextualTarget?: {
    type: 'course' | 'path';
    id: string;
    title: string;
  };
}

export function CreateAssignmentModal({
  open,
  onClose,
  onSuccess,
  contextualTarget,
}: CreateAssignmentModalProps) {
  const [assignee, setAssignee] = useState<AdminUser | null>(null);
  const [targetType, setTargetType] = useState<'course' | 'path'>(contextualTarget?.type || 'course');
  const [target, setTarget] = useState<{ id: string; title: string } | null>(
    contextualTarget ? { id: contextualTarget.id, title: contextualTarget.title } : null
  );
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Search states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<AdminUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [targetSearchResults, setTargetSearchResults] = useState<Array<{ id: string; title: string }>>([]);
  const [targetSearchLoading, setTargetSearchLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAssignee(null);
      if (!contextualTarget) {
        setTarget(null);
        setTargetType('course');
      }
      setDueDate('');
      setUserSearchQuery('');
      setTargetSearchQuery('');
      setUserSearchResults([]);
      setTargetSearchResults([]);
    } else {
      // Reset to contextual target if provided
      if (contextualTarget) {
        setTargetType(contextualTarget.type);
        setTarget({ id: contextualTarget.id, title: contextualTarget.title });
      }
    }
  }, [open, contextualTarget]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);
    try {
      const response = await usersApi.listUsers({ query, limit: 20 });
      if ('data' in response) {
        setUserSearchResults(response.data.items);
      } else {
        setUserSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Search courses/paths
  const searchTargets = useCallback(async (query: string, type: 'course' | 'path') => {
    if (!query || query.length < 2) {
      setTargetSearchResults([]);
      return;
    }

    setTargetSearchLoading(true);
    try {
      if (type === 'course') {
        const response = await lmsAdminApi.listCourses({ q: query, status: 'published' });
        if ('data' in response) {
          setTargetSearchResults(
            response.data.courses.map((c) => ({ id: c.course_id, title: c.title }))
          );
        } else {
          setTargetSearchResults([]);
        }
      } else {
        const response = await lmsAdminApi.listPaths({ status: 'published' });
        if ('data' in response) {
          // Filter client-side since API doesn't support query param for paths yet
          const filtered = response.data.paths
            .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
            .map((p) => ({ id: p.path_id, title: p.title }));
          setTargetSearchResults(filtered);
        } else {
          setTargetSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Failed to search targets:', error);
      setTargetSearchResults([]);
    } finally {
      setTargetSearchLoading(false);
    }
  }, []);

  // Debounced target search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!contextualTarget) {
        searchTargets(targetSearchQuery, targetType);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [targetSearchQuery, targetType, contextualTarget, searchTargets]);

  const handleCreate = async () => {
    if (!assignee || !target) return;

    setSubmitting(true);
    try {
      const response = await lmsAdminApi.createAssignment({
        assignee_user_id: assignee.username,
        target_type: targetType,
        target_id: target.id,
        due_at: dueDate || undefined,
        assignment_reason: 'required',
      });

      if ('data' in response) {
        const assigneeName = assignee.name || assignee.email;
        const targetTitle = target.title;
        onSuccess?.(response.data.assignment.assignment_id, assigneeName, targetTitle);
        onClose();
      } else {
        alert(`Failed to create assignment: ${response.error.message}`);
      }
    } catch (err) {
      console.error('Failed to create assignment:', err);
      alert('Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = assignee !== null && target !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {contextualTarget ? `Assign "${contextualTarget.title}"` : 'Create Assignment'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Assignee */}
          <Autocomplete
            options={userSearchResults}
            getOptionLabel={(option) => option.name || option.email}
            loading={userSearchLoading}
            value={assignee}
            onChange={(_, newValue) => setAssignee(newValue)}
            onInputChange={(_, newInputValue) => setUserSearchQuery(newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assignee"
                required
                placeholder="Search by name or email..."
                helperText={!assignee && userSearchQuery.length < 2 ? 'Type at least 2 characters to search' : undefined}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {userSearchLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body1">
                    {option.name || option.email}
                  </Typography>
                  {option.name && (
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText={userSearchQuery.length < 2 ? 'Type to search for users...' : 'No users found'}
          />

          {/* Target Type (only show if not contextual) */}
          {!contextualTarget && (
            <ToggleButtonGroup
              value={targetType}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) {
                  setTargetType(newValue);
                  setTarget(null);
                  setTargetSearchQuery('');
                }
              }}
              fullWidth
            >
              <ToggleButton value="course">Course</ToggleButton>
              <ToggleButton value="path">Learning Path</ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Target (locked if contextual) */}
          {contextualTarget ? (
            <TextField
              label={`${targetType === 'course' ? 'Course' : 'Learning Path'}`}
              value={target.title}
              disabled
              helperText="This assignment is for the current course/path"
            />
          ) : (
            <Autocomplete
              options={targetSearchResults}
              getOptionLabel={(option) => option.title}
              loading={targetSearchLoading}
              value={target}
              onChange={(_, newValue) => setTarget(newValue)}
              onInputChange={(_, newInputValue) => setTargetSearchQuery(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`${targetType === 'course' ? 'Course' : 'Learning Path'}`}
                  required
                  placeholder={`Search ${targetType === 'course' ? 'courses' : 'learning paths'}...`}
                  helperText={!target && targetSearchQuery.length < 2 ? 'Type at least 2 characters to search' : undefined}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {targetSearchLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText={targetSearchQuery.length < 2 ? `Type to search for ${targetType === 'course' ? 'courses' : 'learning paths'}...` : `No ${targetType === 'course' ? 'courses' : 'learning paths'} found`}
            />
          )}

          {/* Due Date */}
          <TextField
            label="Due Date (optional)"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!canCreate || submitting}
        >
          {submitting ? 'Creating...' : 'Create Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

