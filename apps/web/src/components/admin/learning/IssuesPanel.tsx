/**
 * Issues Panel
 * 
 * Shows validation issues grouped by node
 * Clicking an issue navigates to the node and focuses the field
 */

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import type { ValidationIssue } from '../../../validations/lmsValidations';
import type { CourseTreeNode } from '../../../types/courseTree';
import { focusRegistry } from '../../../utils/focusRegistry';

export interface IssuesPanelProps {
  validationIssues: ValidationIssue[];
  courseTree: CourseTreeNode | null;
  onSelectCourseDetails: () => void;
  onSelectNode: (nodeId: string) => void; // For sections/lessons
}

export function IssuesPanel({
  validationIssues,
  courseTree,
  onSelectCourseDetails,
  onSelectNode,
}: IssuesPanelProps) {
  // Group issues by node
  const groupedIssues = (() => {
    const grouped: Record<string, { node: CourseTreeNode | null; errors: ValidationIssue[]; warnings: ValidationIssue[] }> = {};

    validationIssues.forEach((issue) => {
      const key = issue.entityType && issue.entityId
        ? `${issue.entityType}:${issue.entityId}`
        : 'course:root';

      if (!grouped[key]) {
        // Find node in tree
        let node: CourseTreeNode | null = null;
        if (courseTree && issue.entityType && issue.entityId) {
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
          node = findNode(courseTree);
        }

        grouped[key] = {
          node,
          errors: [],
          warnings: [],
        };
      }

      if (issue.severity === 'error') {
        grouped[key].errors.push(issue);
      } else {
        grouped[key].warnings.push(issue);
      }
    });

    return Object.values(grouped);
  })();

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

  const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
  const warningCount = validationIssues.filter((i) => i.severity === 'warning').length;

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
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Issues</Typography>
        {errorCount > 0 && (
          <Chip
            label={`${errorCount} error${errorCount !== 1 ? 's' : ''}`}
            color="error"
            size="small"
          />
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      {groupedIssues.map((group) => (
        <Box key={group.node?.id || 'course'} sx={{ mb: 2 }}>
          {group.node && group.node.type === 'course' && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mb: 0.5, fontWeight: 500 }}>
              Course details
            </Typography>
          )}
          {group.node && group.node.type !== 'course' && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mb: 0.5, fontWeight: 500 }}>
              {group.node.type === 'section' ? `Section: ${group.node.title}` : `Lesson: ${group.node.title}`}
            </Typography>
          )}

          {group.errors.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="error" sx={{ ml: 2, mb: 0.5 }}>
                Errors ({group.errors.length})
              </Typography>
              <List dense>
                {group.errors.map((error, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => handleNavigateToIssue(error)}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={error.message}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                    <NavigateNextIcon fontSize="small" color="action" />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {group.warnings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="warning.main" sx={{ ml: 2, mb: 0.5 }}>
                Warnings ({group.warnings.length})
              </Typography>
              <List dense>
                {group.warnings.map((warning, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      py: 0.5,
                      cursor: warning.entityType && warning.entityId && warning.fieldKey ? 'pointer' : 'default',
                      '&:hover': warning.entityType && warning.entityId && warning.fieldKey ? { bgcolor: 'action.hover' } : {},
                    }}
                    onClick={() => warning.entityType && warning.entityId && warning.fieldKey && handleNavigateToIssue(warning)}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning.message}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                    {warning.entityType && warning.entityId && warning.fieldKey && (
                      <NavigateNextIcon fontSize="small" color="action" />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

