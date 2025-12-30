/**
 * Admin Learning Assignments Page
 */

import { useState } from 'react';
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
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAdminAssignments } from '../../../hooks/useAdminAssignments';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import type { Assignment } from '@gravyty/domain';

export function AdminLearningAssignmentsPage() {
  const { data: assignments, loading, error, refetch } = useAdminAssignments();
  const [open, setOpen] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [targetType, setTargetType] = useState<'course' | 'path'>('course');
  const [targetId, setTargetId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await lmsAdminApi.createAssignment({
        assignee_user_id: assigneeUserId,
        target_type: targetType,
        target_id: targetId,
        due_at: dueAt || undefined,
        assignment_reason: 'required',
      });
      setOpen(false);
      setAssigneeUserId('');
      setTargetId('');
      setDueAt('');
      refetch();
    } catch (err) {
      console.error('Failed to create assignment:', err);
      alert('Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaive = async (assignment: Assignment & { _sk?: string; _assignee_user_id?: string }) => {
    const assigneeUserId = assignment._assignee_user_id || assignment.user_id;
    const sk = assignment._sk || `ASSIGNMENT#${assignment.assigned_at}#${assignment.assignment_id}`;
    
    if (!assigneeUserId || !sk) {
      alert('Cannot waive: missing assignment identifiers');
      return;
    }
    
    try {
      await lmsAdminApi.waiveAssignment(assigneeUserId, sk);
      refetch();
    } catch (err) {
      console.error('Failed to waive assignment:', err);
      alert('Failed to waive assignment');
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
        <Typography variant="h4">Assignments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Create Assignment
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Assignee</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments && assignments.length > 0 ? (
              assignments.map((assignment) => (
                <TableRow key={assignment.assignment_id}>
                  <TableCell>{assignment.user_id}</TableCell>
                  <TableCell>{assignment.course_id || assignment.path_id}</TableCell>
                  <TableCell>{assignment.assignment_type}</TableCell>
                  <TableCell>
                    <Chip label={assignment.status} size="small" />
                  </TableCell>
                  <TableCell>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell align="right">
                    {assignment.status !== 'waived' && assignment.status !== 'completed' && (
                      <Button 
                        size="small" 
                        onClick={() => handleWaive(assignment as Assignment & { _sk?: string; _assignee_user_id?: string })}
                      >
                        Waive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No assignments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Assignee User ID"
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Target Type</InputLabel>
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value as 'course' | 'path')}>
              <MenuItem value="course">Course</MenuItem>
              <MenuItem value="path">Path</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Target ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={submitting || !assigneeUserId || !targetId}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
