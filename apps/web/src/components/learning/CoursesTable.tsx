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
  Box,
  TableSortLabel,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Publish as PublishIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useState } from 'react';
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
  archiving?: string | null;
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
  archiving,
  sortBy = 'updated',
  sortOrder = 'desc',
  onSortChange,
}: CoursesTableProps) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (courseId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [courseId]: event.currentTarget });
  };

  const handleMenuClose = (courseId: string) => {
    setAnchorEl({ ...anchorEl, [courseId]: null });
  };

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
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {(onView || canEdit(course) || canPublish(course) || canArchive(course)) && (
                    <>
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(course.course_id, e)}
                          disabled={publishing === course.course_id || archiving === course.course_id}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Menu
                        anchorEl={anchorEl[course.course_id] || null}
                        open={Boolean(anchorEl[course.course_id])}
                        onClose={() => handleMenuClose(course.course_id)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                      >
                        {onView && (
                          <MenuItem
                            onClick={() => {
                              onView(course.course_id);
                              handleMenuClose(course.course_id);
                            }}
                          >
                            <VisibilityIcon sx={{ mr: 1, fontSize: 20 }} />
                            View
                          </MenuItem>
                        )}
                        {onView && (canEdit(course) || canPublish(course) || canArchive(course)) && (
                          <Divider />
                        )}
                        {canEdit(course) && onEdit && (
                          <MenuItem
                            onClick={() => {
                              onEdit(course.course_id);
                              handleMenuClose(course.course_id);
                            }}
                          >
                            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                            Edit
                          </MenuItem>
                        )}
                        {canPublish(course) && onPublish && (
                          <MenuItem
                            onClick={() => {
                              onPublish(course.course_id);
                              handleMenuClose(course.course_id);
                            }}
                            disabled={publishing === course.course_id}
                          >
                            <PublishIcon sx={{ mr: 1, fontSize: 20 }} />
                            {publishing === course.course_id ? 'Publishing...' : 'Publish'}
                          </MenuItem>
                        )}
                        {canArchive(course) && onArchive && (
                          <MenuItem
                            onClick={() => {
                              onArchive(course.course_id);
                              handleMenuClose(course.course_id);
                            }}
                            disabled={archiving === course.course_id}
                          >
                            <ArchiveIcon sx={{ mr: 1, fontSize: 20 }} />
                            {archiving === course.course_id ? 'Archiving...' : 'Archive'}
                          </MenuItem>
                        )}
                      </Menu>
                    </>
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

