/**
 * Inspector Component
 * 
 * Toggleable right panel with Issues and Properties tabs
 */

import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { IssuesPanel } from './IssuesPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { CourseSummaryPanel } from './CourseSummaryPanel';
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
  activeTab?: 'issues' | 'properties';
  onTabChange?: (tab: 'issues' | 'properties') => void;
  editorTab?: 'details' | 'outline'; // Which editor tab is active (Details or Course Outline)
}

export function Inspector({
  selectedNode,
  validationIssues,
  courseTree,
  course,
  onSelectCourseDetails,
  onSelectNode,
  onClose,
  activeTab: controlledActiveTab,
  onTabChange,
  editorTab = 'details',
}: InspectorProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'issues' | 'properties'>(() => {
    const stored = localStorage.getItem('lms.courseEditor.inspectorTab');
    return (stored === 'issues' || stored === 'properties') ? stored : 'issues';
  });
  
  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const handleTabChange = (newTab: 'issues' | 'properties') => {
    if (onTabChange) {
      onTabChange(newTab);
    } else {
      setInternalActiveTab(newTab);
    }
    localStorage.setItem('lms.courseEditor.inspectorTab', newTab);
  };
  
  // Update internal tab when controlled tab changes
  useEffect(() => {
    if (controlledActiveTab) {
      setInternalActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header with Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => handleTabChange(v)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                minWidth: 'auto',
              },
              '& .MuiTabs-indicator': {
                height: 2,
              },
            }}
          >
            <Tab value="issues" label="Issues" />
            <Tab value="properties" label="Properties" />
          </Tabs>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                ml: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              aria-label="Close Inspector"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'issues' && (
          <>
            {/* When editor is on Details tab, show course summary first */}
            {editorTab === 'details' && course && (
              <CourseSummaryPanel course={course} />
            )}
            <IssuesPanel
              validationIssues={validationIssues}
              courseTree={courseTree}
              courseId={course?.course_id}
              onSelectCourseDetails={onSelectCourseDetails}
              onSelectNode={onSelectNode}
            />
          </>
        )}
        {activeTab === 'properties' && (
          <>
            {/* When editor is on Details tab, show course summary instead of node properties */}
            {editorTab === 'details' ? (
              course ? (
                <CourseSummaryPanel course={course} />
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Course data not available
                  </Typography>
                </Box>
              )
            ) : (
              /* When editor is on Course Outline tab, show node properties */
              selectedNode ? (
                <PropertiesPanel selectedNode={selectedNode} course={course} />
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a section or lesson to view properties
                  </Typography>
                </Box>
              )
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

