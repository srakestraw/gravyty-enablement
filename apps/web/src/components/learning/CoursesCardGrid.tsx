/**
 * Courses Card Grid Component
 * 
 * Displays courses in a card grid layout with role-based actions
 */

import { Grid, Box, Button, IconButton, Menu, MenuItem, Chip } from '@mui/material';
import { MoreVert as MoreVertIcon, Edit as EditIcon, Publish as PublishIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import { useState } from 'react';
import { CourseCard } from '../lms/CourseCard';
import type { CourseSummary } from '@gravyty/domain';
import {
  canEditCourse,
  canPublishCourse,
  hasLearningPermission,
} from '../../lib/learningPermissions';

interface CoursesCardGridProps {
  courses: CourseSummary[];
  userRole?: string | null;
  userId?: string | null;
  onView: (courseId: string) => void;
  onEdit?: (courseId: string) => void;
  onPublish?: (courseId: string) => void;
  onArchive?: (courseId: string) => void;
  showStatus?: boolean; // Show status pills for drafts/archived
  showActions?: boolean; // Show action menus
}

export function CoursesCardGrid({
  courses,
  userRole,
  userId,
  onView,
  onEdit,
  onPublish,
  onArchive,
  showStatus = false,
  showActions = false,
}: CoursesCardGridProps) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (courseId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [courseId]: event.currentTarget });
  };

  const handleMenuClose = (courseId: string) => {
    setAnchorEl({ ...anchorEl, [courseId]: null });
  };

  const canEdit = (course: CourseSummary) => {
    if (!showActions) return false;
    return canEditCourse(userRole, undefined, userId, 'any');
  };

  const canPublish = (course: CourseSummary) => {
    if (!showActions) return false;
    return canPublishCourse(userRole) && course.status === 'draft';
  };

  const canArchive = (course: CourseSummary) => {
    if (!showActions) return false;
    return hasLearningPermission(userRole, 'learning.course.archive') && course.status !== 'archived';
  };

  return (
    <Grid container spacing={3}>
      {courses.map((course) => {
        const menuOpen = Boolean(anchorEl[course.course_id]);
        const hasActions = showActions && (canEdit(course) || canPublish(course) || canArchive(course));

        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={course.course_id}>
            <Box sx={{ position: 'relative', height: '100%' }}>
              {/* Status pill for non-published courses */}
              {showStatus && course.status !== 'published' && (
                <Chip
                  label={course.status}
                  color={course.status === 'archived' ? 'default' : 'warning'}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Action menu button */}
              {hasActions && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(course.course_id, e)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: showStatus && course.status !== 'published' ? 60 : 8,
                    zIndex: 1,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              )}

              <CourseCard
                course={course}
                onClick={() => {
                  // If user can edit and has edit permission, go to edit; otherwise view
                  if (canEdit(course) && onEdit) {
                    onEdit(course.course_id);
                  } else {
                    onView(course.course_id);
                  }
                }}
              />

              {/* Action menu */}
              {hasActions && (
                <Menu
                  anchorEl={anchorEl[course.course_id] || null}
                  open={menuOpen}
                  onClose={() => handleMenuClose(course.course_id)}
                >
                  <MenuItem onClick={() => {
                    onView(course.course_id);
                    handleMenuClose(course.course_id);
                  }}>
                    View
                  </MenuItem>
                  {canEdit(course) && onEdit && (
                    <MenuItem onClick={() => {
                      onEdit(course.course_id);
                      handleMenuClose(course.course_id);
                    }}>
                      <EditIcon sx={{ mr: 1, fontSize: 18 }} />
                      Edit
                    </MenuItem>
                  )}
                  {canPublish(course) && onPublish && (
                    <MenuItem onClick={() => {
                      onPublish(course.course_id);
                      handleMenuClose(course.course_id);
                    }}>
                      <PublishIcon sx={{ mr: 1, fontSize: 18 }} />
                      Publish
                    </MenuItem>
                  )}
                  {canArchive(course) && onArchive && (
                    <MenuItem onClick={() => {
                      onArchive(course.course_id);
                      handleMenuClose(course.course_id);
                    }}>
                      <ArchiveIcon sx={{ mr: 1, fontSize: 18 }} />
                      Archive
                    </MenuItem>
                  )}
                </Menu>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

