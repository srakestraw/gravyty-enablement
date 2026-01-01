/**
 * Inspector Component
 * 
 * Toggleable right panel showing validation issues
 */

import { Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { IssuesPanel } from './IssuesPanel';
import type { ValidationIssue } from '../../../validations/lmsValidations';
import type { CourseTreeNode } from '../../../types/courseTree';
import type { Course } from '@gravyty/domain';

export interface InspectorProps {
  selectedNode: CourseTreeNode | null;
  validationIssues: ValidationIssue[];
  courseTree: CourseTreeNode | null;
  course: Course | null;
  onSelectCourseDetails: () => void;
  onSelectNode: (nodeId: string) => void;
  onClose?: () => void;
}

export function Inspector({
  selectedNode,
  validationIssues,
  courseTree,
  course,
  onSelectCourseDetails,
  onSelectNode,
  onClose,
}: InspectorProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header */}
      {onClose && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', px: 1.5, py: 1 }}>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              '&:hover': { bgcolor: 'action.hover' },
            }}
            aria-label="Close Inspector"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <IssuesPanel
          validationIssues={validationIssues}
          courseTree={courseTree}
          courseId={course?.course_id}
          onSelectCourseDetails={onSelectCourseDetails}
          onSelectNode={onSelectNode}
        />
      </Box>
    </Box>
  );
}

