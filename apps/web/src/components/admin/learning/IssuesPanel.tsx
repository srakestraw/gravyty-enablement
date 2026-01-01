/**
 * Issues Panel
 * 
 * Shows validation issues grouped by severity (Errors/Warnings) with collapsible accordion groups
 * Clicking an issue navigates to the node and focuses the field
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import type { ValidationIssue } from '../../../validations/lmsValidations';
import type { CourseTreeNode } from '../../../types/courseTree';
import { focusRegistry } from '../../../utils/focusRegistry';

export interface IssuesPanelProps {
  validationIssues: ValidationIssue[];
  courseTree: CourseTreeNode | null;
  courseId?: string;
  onSelectCourseDetails: () => void;
  onSelectNode: (nodeId: string) => void; // For sections/lessons
}

export function IssuesPanel({
  validationIssues,
  courseTree,
  courseId,
  onSelectCourseDetails,
  onSelectNode,
}: IssuesPanelProps) {
  // Separate errors and warnings
  const errors = validationIssues.filter((i) => i.severity === 'error');
  const warnings = validationIssues.filter((i) => i.severity === 'warning');

  // Accordion state - persist in sessionStorage
  // Default: collapse errors and warnings
  const [errorsExpanded, setErrorsExpanded] = useState(() => {
    // Always collapse for new courses
    if (courseId === 'new') return false;
    // If errors exist, collapse by default unless user explicitly expanded
    if (errors.length === 0) return false;
    const stored = sessionStorage.getItem('inspector-errors-expanded');
    // If no stored preference, collapse by default
    return stored !== null ? stored === 'true' : false;
  });
  const [warningsExpanded, setWarningsExpanded] = useState(() => {
    // Always collapse for new courses
    if (courseId === 'new') return false;
    const stored = sessionStorage.getItem('inspector-warnings-expanded');
    return stored !== null ? stored === 'true' : false;
  });

  // Track if errors have been seen before (to avoid auto-expanding on every render)
  const [hasSeenErrors, setHasSeenErrors] = useState(false);
  const lastCourseIdRef = useRef<string | undefined>(undefined);

  // Reset state when opening a new course
  useEffect(() => {
    if (courseId === 'new' && lastCourseIdRef.current !== 'new') {
      // Reset all expanded states when opening a new course
      setErrorsExpanded(false);
      setWarningsExpanded(false);
      setHasSeenErrors(false);
    }
    lastCourseIdRef.current = courseId;
  }, [courseId]);

  // Update errors expanded state when errors change
  useEffect(() => {
    if (errors.length === 0) {
      // If errors are cleared, collapse
      setErrorsExpanded(false);
      setHasSeenErrors(false);
    } else if (errors.length > 0 && !hasSeenErrors && courseId !== 'new') {
      // First time seeing errors - respect stored preference or default to collapsed
      // Skip this for new courses (they should stay collapsed)
      const stored = sessionStorage.getItem('inspector-errors-expanded');
      // Only set if there's a stored preference (user has explicitly set it)
      if (stored !== null) {
        setErrorsExpanded(stored === 'true');
      }
      setHasSeenErrors(true);
    }
  }, [errors.length, hasSeenErrors, courseId]);

  // Persist state changes (but not for new courses)
  useEffect(() => {
    if (courseId !== 'new') {
      sessionStorage.setItem('inspector-errors-expanded', String(errorsExpanded));
    }
  }, [errorsExpanded, courseId]);

  useEffect(() => {
    if (courseId !== 'new') {
      sessionStorage.setItem('inspector-warnings-expanded', String(warningsExpanded));
    }
  }, [warningsExpanded, courseId]);

  const handleNavigateToIssue = (issue: ValidationIssue) => {
    if (!issue.entityType || !issue.entityId || !issue.fieldKey) return;

    // Select the node based on entity type
    if (issue.entityType === 'course') {
      onSelectCourseDetails();
    } else {
      onSelectNode(issue.entityId);
    }

    // Small delay to allow UI to update, then focus
    setTimeout(() => {
      const focused = focusRegistry.focus(issue.entityType!, issue.entityId!, issue.fieldKey!);
      if (!focused) {
        // Fallback: scroll to top of editor
        const editor = document.querySelector('[data-course-editor]');
        if (editor) {
          editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  };

  // Helper to get node label for an issue
  const getNodeLabel = (issue: ValidationIssue): string => {
    if (!issue.entityType || !issue.entityId || !courseTree) return '';
    
    if (issue.entityType === 'course') return 'Course details';
    
    const findNode = (n: CourseTreeNode): CourseTreeNode | null => {
      if (n.id === issue.entityId && n.type === issue.entityType) return n;
      if (n.children) {
        for (const child of n.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(courseTree);
    if (!node) return '';
    
    if (node.type === 'section') return `Section: ${node.title}`;
    if (node.type === 'lesson') return `Lesson: ${node.title}`;
    return '';
  };

  if (validationIssues.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No validation issues
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Errors Group */}
      {errors.length > 0 && (
        <Box sx={{ mb: warnings.length > 0 ? 2 : 0 }}>
          {/* Accordion Header */}
          <Box
            component="button"
            onClick={() => setErrorsExpanded(!errorsExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              p: 0.75,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
            aria-expanded={errorsExpanded}
            aria-label={`${errorsExpanded ? 'Collapse' : 'Expand'} errors`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="span"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 20, 
                  height: 20,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {errorsExpanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              >
                Errors ({errors.length})
              </Typography>
            </Box>
          </Box>

          {/* Errors List */}
          <Collapse in={errorsExpanded}>
            <Box sx={{ pl: 3.5, pt: 0.5 }}>
              {errors.map((error, index) => {
                const nodeLabel = getNodeLabel(error);
                const isClickable = !!(error.entityType && error.entityId && error.fieldKey);
                
                return (
                  <Box
                    key={index}
                    component={isClickable ? 'button' : 'div'}
                    data-issue-item={index === 0 ? 'true' : undefined}
                    onClick={() => isClickable && handleNavigateToIssue(error)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      width: '100%',
                      p: 1,
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: 1,
                      textAlign: 'left',
                      '&:hover': isClickable
                        ? { bgcolor: 'action.hover' }
                        : {},
                      '&:focus': isClickable
                        ? {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                          }
                        : {},
                    }}
                  >
                    {/* Small error indicator */}
                    <Box
                      sx={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        mt: 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {nodeLabel && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            mb: 0.25,
                          }}
                        >
                          {nodeLabel}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.primary',
                          lineHeight: 1.4,
                        }}
                      >
                        {error.message}
                      </Typography>
                    </Box>
                    {isClickable && (
                      <NavigateNextIcon
                        fontSize="small"
                        sx={{
                          color: 'action.active',
                          opacity: 0.4,
                          flexShrink: 0,
                          mt: 0.5,
                          'button:hover &': { opacity: 0.7 },
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Warnings Group */}
      {warnings.length > 0 && (
        <Box>
          {/* Accordion Header */}
          <Box
            component="button"
            onClick={() => setWarningsExpanded(!warningsExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              p: 0.75,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
            aria-expanded={warningsExpanded}
            aria-label={`${warningsExpanded ? 'Collapse' : 'Expand'} warnings`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="span"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 20, 
                  height: 20,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {warningsExpanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              >
                Warnings ({warnings.length})
              </Typography>
            </Box>
          </Box>

          {/* Warnings List */}
          <Collapse in={warningsExpanded}>
            <Box sx={{ pl: 3.5, pt: 0.5 }}>
              {warnings.map((warning, index) => {
                const nodeLabel = getNodeLabel(warning);
                const isClickable = !!(
                  warning.entityType &&
                  warning.entityId &&
                  warning.fieldKey
                );

                return (
                  <Box
                    key={index}
                    component={isClickable ? 'button' : 'div'}
                    onClick={() => isClickable && handleNavigateToIssue(warning)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      width: '100%',
                      p: 1,
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: 1,
                      textAlign: 'left',
                      '&:hover': isClickable ? { bgcolor: 'action.hover' } : {},
                      '&:focus': isClickable
                        ? {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                          }
                        : {},
                    }}
                  >
                    {/* Small warning indicator */}
                    <Box
                      sx={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        bgcolor: '#d4a574', // Muted amber
                        mt: 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {nodeLabel && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            mb: 0.25,
                          }}
                        >
                          {nodeLabel}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          lineHeight: 1.4,
                        }}
                      >
                        {warning.message}
                      </Typography>
                    </Box>
                    {isClickable && (
                      <NavigateNextIcon
                        fontSize="small"
                        sx={{
                          color: 'action.active',
                          opacity: 0.4,
                          flexShrink: 0,
                          mt: 0.5,
                          'button:hover &': { opacity: 0.7 },
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

