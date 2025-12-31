/**
 * Inspector Component
 * 
 * Toggleable right panel with Issues view only
 */

import { Box, Typography } from '@mui/material';
import { IssuesPanel } from './IssuesPanel';
import type { ValidationIssue } from '../../../validations/lmsValidations';
import type { CourseTreeNode } from '../../../types/courseTree';

export interface InspectorProps {
  selectedNode: CourseTreeNode | null;
  validationIssues: ValidationIssue[];
  courseTree: CourseTreeNode | null;
  onSelectCourseDetails: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function Inspector({
  selectedNode,
  validationIssues,
  courseTree,
  onSelectCourseDetails,
  onSelectNode,
}: InspectorProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Inspector</Typography>
          {validationIssues.filter((i) => i.severity === 'error').length > 0 && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'error.main',
                color: 'error.contrastText',
                borderRadius: '10px',
                px: 0.75,
                py: 0.25,
                minWidth: 20,
                textAlign: 'center',
                fontSize: '0.7rem',
              }}
            >
              {validationIssues.filter((i) => i.severity === 'error').length}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Issues Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <IssuesPanel
          validationIssues={validationIssues}
          courseTree={courseTree}
          onSelectCourseDetails={onSelectCourseDetails}
          onSelectNode={onSelectNode}
        />
      </Box>
    </Box>
  );
}

