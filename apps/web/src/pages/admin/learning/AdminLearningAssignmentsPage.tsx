/**
 * Admin Learning Assignments Page
 * 
 * Improved UX with searchable pickers and hydrated data display
 */

import { useState, useMemo } from 'react';
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
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useAdminAssignments } from '../../../hooks/useAdminAssignments';
import { lmsAdminApi, type HydratedAssignment } from '../../../api/lmsAdminClient';
import { CreateAssignmentModal } from '../../../components/admin/learning/CreateAssignmentModal';
import { isAssignmentOverdue } from '@gravyty/domain';

export function AdminLearningAssignmentsPage() {
  const navigate = useNavigate();
  const { data: assignments, loading, error, refetch } = useAdminAssignments();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'course' | 'path'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'started' | 'completed' | 'waived'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<HydratedAssignment | null>(null);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    
    return assignments.filter((assignment) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const assigneeMatch = 
          assignment.assignee?.name?.toLowerCase().includes(query) ||
          assignment.assignee?.email?.toLowerCase().includes(query);
        const targetMatch = assignment.target?.title.toLowerCase().includes(query);
        if (!assigneeMatch && !targetMatch) return false;
      }
      
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'course' && assignment.assignment_type !== 'course') return false;
        if (typeFilter === 'path' && assignment.assignment_type !== 'path') return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'assigned' && assignment.status !== 'assigned') return false;
        if (statusFilter === 'started' && assignment.status !== 'started') return false;
        if (statusFilter === 'completed' && assignment.status !== 'completed') return false;
        if (statusFilter === 'waived' && assignment.status !== 'waived') return false;
      }
      
      return true;
    });
  }, [assignments, searchQuery, typeFilter, statusFilter]);

  const handleCreateSuccess = (assignmentId: string, assigneeName: string, targetTitle: string) => {
    // Show success message (could use a toast library if available)
    alert(`Assigned "${targetTitle}" to ${assigneeName}`);
    refetch();
  };

  const handleWaive = async (assignment: HydratedAssignment) => {
    const assigneeUserId = assignment.user_id;
    const sk = (assignment as any)._sk || `ASSIGNMENT#${assignment.assigned_at}#${assignment.assignment_id}`;
    
    if (!assigneeUserId || !sk) {
      alert('Cannot waive: missing assignment identifiers');
      return;
    }
    
    try {
      await lmsAdminApi.waiveAssignment(assigneeUserId, sk);
      alert('Assignment waived');
      refetch();
    } catch (err) {
      console.error('Failed to waive assignment:', err);
      alert('Failed to waive assignment');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, assignment: HydratedAssignment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAssignment(assignment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAssignment(null);
  };

  const handleViewTarget = (assignment: HydratedAssignment) => {
    if (assignment.assignment_type === 'course' && assignment.course_id) {
      navigate(`/enablement/admin/learning/courses/${assignment.course_id}`);
    } else if (assignment.assignment_type === 'path' && assignment.path_id) {
      navigate(`/enablement/admin/learning/paths/${assignment.path_id}`);
    }
    handleMenuClose();
  };

  const getStatusChip = (assignment: HydratedAssignment) => {
    const isOverdue = isAssignmentOverdue(assignment);
    const status = assignment.status;
    
    if (isOverdue) {
      return <Chip label="Overdue" size="small" color="error" />;
    }
    
    const statusLabels: Record<string, string> = {
      assigned: 'Assigned',
      started: 'In Progress',
      completed: 'Completed',
      waived: 'Waived',
    };
    
    const colors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
      assigned: 'default',
      started: 'primary',
      completed: 'success',
      waived: 'warning',
    };
    
    return (
      <Chip 
        label={statusLabels[status] || status} 
        size="small" 
        color={colors[status] || 'default'}
      />
    );
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
          Create Assignment
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by assignee or target..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} label="Type">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="course">Courses</MenuItem>
            <MenuItem value="path">Learning Paths</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} label="Status">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="started">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="waived">Waived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
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
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => (
                <TableRow key={assignment.assignment_id}>
                  <TableCell>
                    {assignment.assignee ? (
                      <Box>
                        <Typography variant="body2">
                          {assignment.assignee.name || assignment.assignee.email}
                        </Typography>
                        {assignment.assignee.name && (
                          <Typography variant="caption" color="text.secondary">
                            {assignment.assignee.email}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {assignment.user_id}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignment.target ? (
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleViewTarget(assignment)}
                        sx={{ textAlign: 'left' }}
                      >
                        {assignment.target.title}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {assignment.course_id || assignment.path_id || 'Unknown'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={assignment.assignment_type === 'course' ? 'Course' : 'Learning Path'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {getStatusChip(assignment)}
                  </TableCell>
                  <TableCell>
                    {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, assignment)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  {assignments && assignments.length === 0 ? (
                    <Box>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No assignments yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Assignments let you require learners to complete specific courses or learning paths.
                      </Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
                        Create Assignment
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No matching assignments
                      </Typography>
                      <Button
                        variant="text"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('all');
                          setStatusFilter('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedAssignment && (
          <>
            <MenuItem onClick={() => handleViewTarget(selectedAssignment)}>
              View {selectedAssignment.assignment_type === 'course' ? 'Course' : 'Learning Path'}
            </MenuItem>
            {selectedAssignment.status !== 'waived' && selectedAssignment.status !== 'completed' && (
              <MenuItem onClick={() => {
                handleWaive(selectedAssignment);
                handleMenuClose();
              }}>
                Waive Assignment
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
}
