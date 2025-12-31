/**
 * Publish Readiness Panel
 * 
 * Shows validation status and blocking issues for course/path publishing
 */

import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import type { ValidationError, ValidationIssue } from '../../../validations/lmsValidations';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { CourseTreeNode } from '../../../types/courseTree';

export interface PublishReadinessPanelProps {
  entityType: 'course' | 'path';
  errors: ValidationError[];
  warnings?: ValidationError[];
  status?: 'draft' | 'published';
  onNavigateToIssue?: (field: string) => void;
  // Structured validation issues for better navigation
  validationIssues?: ValidationIssue[];
  onSelectEntity?: (entityType: 'course' | 'section' | 'lesson', entityId: string) => void;
  courseTree?: CourseTreeNode | null;
}

export function PublishReadinessPanel({
  entityType,
  errors,
  warnings = [],
  status = 'draft',
  onNavigateToIssue,
  validationIssues,
  onSelectEntity,
  courseTree,
}: PublishReadinessPanelProps) {
  const isReady = errors.length === 0;
  const hasWarnings = warnings.length > 0;

  // Group issues by node for better organization
  const groupedIssues = validationIssues ? (() => {
    const grouped: Record<string, { node: CourseTreeNode | null; errors: ValidationIssue[]; warnings: ValidationIssue[] }> = {};
    
    validationIssues.forEach((issue) => {
      const key = issue.entityType && issue.entityId 
        ? `${issue.entityType}:${issue.entityId}` 
        : 'course:root';
      
      if (!grouped[key]) {
        // Find node in tree
        let node: CourseTreeNode | null = null;
        if (courseTree && issue.entityType && issue.entityId) {
          // Helper to find node recursively
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
  })() : [];

  const handleNavigate = (issue: ValidationIssue | ValidationError) => {
    // Try structured navigation first
    if ('entityType' in issue && issue.entityType && issue.entityId && issue.fieldKey) {
      // Select the entity first
      if (onSelectEntity) {
        onSelectEntity(issue.entityType, issue.entityId);
      }
      
      // Small delay to allow UI to update, then focus
      setTimeout(() => {
        const focused = focusRegistry.focus(issue.entityType, issue.entityId, issue.fieldKey);
        if (!focused && onNavigateToIssue) {
          onNavigateToIssue(issue.field);
        }
      }, 100);
    } else if (onNavigateToIssue) {
      // Fallback to legacy navigation
      onNavigateToIssue(issue.field);
    } else {
      // Final fallback: scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">Publish Readiness</Typography>
        {isReady ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Ready to Publish"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            icon={<ErrorIcon />}
            label={`${errors.length} Issue${errors.length !== 1 ? 's' : ''}`}
            color="error"
            size="small"
          />
        )}
      </Box>

      {status === 'published' && (
        <Box sx={{ mb: 2 }}>
          <Chip label="Published" color="success" size="small" variant="outlined" />
        </Box>
      )}

      {isReady && !hasWarnings && (
        <Typography variant="body2" color="text.secondary">
          All validation checks passed. You can publish this {entityType}.
        </Typography>
      )}

      {errors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Blocking Issues ({errors.length})
          </Typography>
          {groupedIssues.length > 0 ? (
            // Grouped by entity
            groupedIssues.map((group) => (
              group.errors.length > 0 && (
                <Box key={group.node?.id || 'unknown'} sx={{ mb: 1 }}>
                  {group.node && group.node.type !== 'course' && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mb: 0.5, fontWeight: 500 }}>
                      {group.node.type === 'section' ? `Section: ${group.node.title}` : `Lesson: ${group.node.title}`}
                    </Typography>
                  )}
                  <List dense>
                    {group.errors.map((error, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          py: 0.5,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => handleNavigate(error)}
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
              )
            ))
          ) : (
            // Fallback: flat list
            <List dense>
              {errors.map((error, index) => (
                <ListItem
                  key={index}
                  sx={{
                    py: 0.5,
                    cursor: onNavigateToIssue ? 'pointer' : 'default',
                    '&:hover': onNavigateToIssue ? { bgcolor: 'action.hover' } : {},
                  }}
                  onClick={() => handleNavigate(error)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={error.message}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                  {onNavigateToIssue && (
                    <NavigateNextIcon fontSize="small" color="action" />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {hasWarnings && (
        <Box>
          <Typography variant="subtitle2" color="warning.main" gutterBottom>
            Recommendations ({warnings.length})
          </Typography>
          {groupedIssues.length > 0 ? (
            // Grouped by entity
            groupedIssues.map((group) => (
              group.warnings.length > 0 && (
                <Box key={group.node?.id || 'unknown'} sx={{ mb: 1 }}>
                  {group.node && group.node.type !== 'course' && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mb: 0.5, fontWeight: 500 }}>
                      {group.node.type === 'section' ? `Section: ${group.node.title}` : `Lesson: ${group.node.title}`}
                    </Typography>
                  )}
                  <List dense>
                    {group.warnings.map((warning, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          py: 0.5,
                          cursor: warning.entityType && warning.entityId && warning.fieldKey ? 'pointer' : 'default',
                          '&:hover': warning.entityType && warning.entityId && warning.fieldKey ? { bgcolor: 'action.hover' } : {},
                        }}
                        onClick={() => warning.entityType && warning.entityId && warning.fieldKey && handleNavigate(warning)}
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
              )
            ))
          ) : (
            // Fallback: flat list
            <List dense>
              {warnings.map((warning, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={warning.message}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

    </Paper>
  );
}



