/**
 * Courses Table Component
 * 
 * Displays courses in a table layout for management
 */

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Box,
  TableSortLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Publish as PublishIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import type { CourseSummary } from '@gravyty/domain';
import {
  canEditCourse,
  canPublishCourse,
  hasLearningPermission,
} from '../../lib/learningPermissions';

interface CoursesTableProps {
  courses: CourseSummary[];
  userRole?: string | null;
  userId?: string | null;
  showOwner?: boolean;
  onView: (courseId: string) => void;
  onEdit?: (courseId: string) => void;
  onPublish?: (courseId: string) => void;
  onArchive?: (courseId: string) => void;
  publishing?: string | null;
  sortBy?: 'title' | 'updated' | 'status';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: 'title' | 'updated' | 'status') => void;
}

export function CoursesTable({
  courses,
  userRole,
  userId,
  showOwner = false,
  onView,
  onEdit,
  onPublish,
  onArchive,
  publishing,
  sortBy = 'updated',
  sortOrder = 'desc',
  onSortChange,
}: CoursesTableProps) {
  const canEdit = (course: CourseSummary) => {
    return canEditCourse(userRole, undefined, userId, 'any');
  };

  const canPublish = (course: CourseSummary) => {
    return canPublishCourse(userRole) && course.status === 'draft';
  };

  const canArchive = (course: CourseSummary) => {
    return hasLearningPermission(userRole, 'learning.course.archive') && course.status !== 'archived';
  };

  const handleSort = (field: 'title' | 'updated' | 'status') => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              {onSortChange ? (
                <TableSortLabel
                  active={sortBy === 'title'}
                  direction={sortBy === 'title' ? sortOrder : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Title
                </TableSortLabel>
              ) : (
                'Title'
              )}
            </TableCell>
            <TableCell>
              {onSortChange ? (
                <TableSortLabel
                  active={sortBy === 'status'}
                  direction={sortBy === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              ) : (
                'Status'
              )}
            </TableCell>
            <TableCell>Product</TableCell>
            <TableCell>Product Suite</TableCell>
            {showOwner && <TableCell>Owner</TableCell>}
            <TableCell>
              {onSortChange ? (
                <TableSortLabel
                  active={sortBy === 'updated'}
                  direction={sortBy === 'updated' ? sortOrder : 'asc'}
                  onClick={() => handleSort('updated')}
                >
                  Updated
                </TableSortLabel>
              ) : (
                'Updated'
              )}
            </TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.course_id} hover>
              <TableCell>
                <Box
                  sx={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => onView(course.course_id)}
                >
                  {course.title}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={course.status}
                  color={
                    course.status === 'published'
                      ? 'success'
                      : course.status === 'archived'
                      ? 'default'
                      : 'warning'
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>{course.product || '-'}</TableCell>
              <TableCell>{course.product_suite || '-'}</TableCell>
              {showOwner && (
                <TableCell>
                  {/* TODO: Add owner when available in CourseSummary */}
                  -
                </TableCell>
              )}
              <TableCell>
                {course.published_at
                  ? new Date(course.published_at).toLocaleDateString()
                  : (course as any).updated_at
                  ? new Date((course as any).updated_at).toLocaleDateString()
                  : '-'}
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => onView(course.course_id)}
                    title="View course"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  {canEdit(course) && onEdit && (
                    <IconButton
                      size="small"
                      onClick={() => onEdit(course.course_id)}
                      title="Edit course"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {canPublish(course) && onPublish && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PublishIcon />}
                      onClick={() => onPublish(course.course_id)}
                      disabled={publishing === course.course_id}
                    >
                      {publishing === course.course_id ? 'Publishing...' : 'Publish'}
                    </Button>
                  )}
                  {canArchive(course) && onArchive && (
                    <IconButton
                      size="small"
                      onClick={() => onArchive(course.course_id)}
                      title="Archive course"
                    >
                      <ArchiveIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

