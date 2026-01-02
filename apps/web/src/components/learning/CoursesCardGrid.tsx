/**
 * Courses Card Grid Component
 * 
 * Displays courses in a card grid layout with role-based actions
 */

import { Grid, Box, Button, IconButton, Menu, MenuItem, Chip, Tooltip } from '@mui/material';
import { MoreVert as MoreVertIcon, Edit as EditIcon, Publish as PublishIcon, Archive as ArchiveIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
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
  isAllView?: boolean; // Whether currently viewing "All" courses (show status pills for all)
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
  isAllView = false,
}: CoursesCardGridProps) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (courseId: string, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent card click
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

  // Map status to display label
  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'published':
        return 'Published';
      case 'archived':
        return 'Archived';
      default:
        return status || '';
    }
  };

  // Get status chip color
  const getStatusColor = (status?: string): 'default' | 'success' | 'warning' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'archived':
        return 'default';
      case 'draft':
      default:
        return 'warning';
    }
  };

  return (
    <Grid container spacing={3}>
      {courses.map((course) => {
        const menuOpen = Boolean(anchorEl[course.course_id]);
        // Always show actions menu when showActions is true
        const shouldShowActions = showActions;
        const statusLabel = getStatusLabel(course.status);
        const statusColor = getStatusColor(course.status);
        // Show status pill only when in All view
        const shouldShowStatus = isAllView && course.status && statusLabel;

        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={course.course_id}>
            <Box sx={{ position: 'relative', height: '100%', overflow: 'visible' }}>
              {/* Status pill - only show in All view, overlaying the card */}
              {shouldShowStatus && (
                <Chip
                  label={statusLabel}
                  color={statusColor}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    pointerEvents: 'auto',
                  }}
                />
              )}

              {/* Action menu button - overlaying the card */}
              {shouldShowActions && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(course.course_id, e)}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent card click
                  aria-label="Course actions"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      boxShadow: 3,
                    },
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              )}

              <CourseCard
                course={course}
                onClick={() => {
                  // Always navigate to view (not edit) when clicking card
                  onView(course.course_id);
                }}
              />

              {/* Action menu */}
              {shouldShowActions && (
                <Menu
                  anchorEl={anchorEl[course.course_id] || null}
                  open={menuOpen}
                  onClose={() => handleMenuClose(course.course_id)}
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                  onMouseDown={(e) => e.stopPropagation()} // Prevent card click
                >
                  {/* View - always available */}
                  <MenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(course.course_id);
                      handleMenuClose(course.course_id);
                    }}
                  >
                    <VisibilityIcon sx={{ mr: 1, fontSize: 18 }} />
                    View
                  </MenuItem>
                  
                  {/* Edit - show if onEdit provided and user can edit */}
                  {onEdit && (
                    <MenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit(course)) {
                          onEdit(course.course_id);
                        }
                        handleMenuClose(course.course_id);
                      }}
                      disabled={!canEdit(course)}
                    >
                      <EditIcon sx={{ mr: 1, fontSize: 18 }} />
                      Edit
                    </MenuItem>
                  )}
                  
                  {/* Publish - show if onPublish provided, disable if not publishable */}
                  {onPublish && (
                    <Tooltip 
                      title={canPublish(course) ? '' : 'Only draft courses can be published'}
                      placement="left"
                    >
                      <span>
                        <MenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canPublish(course)) {
                              onPublish(course.course_id);
                            }
                            handleMenuClose(course.course_id);
                          }}
                          disabled={!canPublish(course)}
                        >
                          <PublishIcon sx={{ mr: 1, fontSize: 18 }} />
                          Publish
                        </MenuItem>
                      </span>
                    </Tooltip>
                  )}
                  
                  {/* Archive - show if onArchive provided and user can archive */}
                  {onArchive && (
                    <MenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canArchive(course)) {
                          onArchive(course.course_id);
                        }
                        handleMenuClose(course.course_id);
                      }}
                      disabled={!canArchive(course)}
                    >
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

