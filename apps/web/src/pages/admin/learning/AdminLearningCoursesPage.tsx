/**
 * Admin Learning Courses Page
 * 
 * Manage courses: list, create, edit, publish
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
import { Add as AddIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useAdminCourses } from '../../../hooks/useAdminCourses';
import { lmsAdminApi } from '../../../api/lmsAdminClient';

export function AdminLearningCoursesPage() {
  const navigate = useNavigate();
  const { data: courses, loading, error, refetch } = useAdminCourses();
  const [publishing, setPublishing] = useState<string | null>(null);

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
        <Typography variant="h4">Courses</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/enablement/admin/learning/courses/new')}
        >
          New Course
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses && courses.length > 0 ? (
              courses.map((course) => (
                <TableRow key={course.course_id}>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={course.status}
                      color={course.status === 'published' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{course.version}</TableCell>
                  <TableCell>{new Date(course.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/enablement/admin/learning/courses/${course.course_id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    {course.status === 'draft' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handlePublish(course.course_id)}
                        disabled={publishing === course.course_id}
                      >
                        {publishing === course.course_id ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No courses found. Create your first course to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
