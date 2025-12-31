/**
 * Inspector Component
 * 
 * Toggleable right panel with Issues and Properties tabs
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { IssuesPanel } from './IssuesPanel';
import { PropertiesPanel } from './PropertiesPanel';
import type { ValidationIssue } from '../../../validations/lmsValidations';
import type { CourseTreeNode } from '../../../types/courseTree';
import type { Course } from '@gravyty/domain';

export interface InspectorProps {
  selectedNode: CourseTreeNode | null;
  course: Course | null;
  validationIssues: ValidationIssue[];
  courseTree: CourseTreeNode | null;
  onSelectCourseDetails: () => void;
  onSelectNode: (nodeId: string) => void;
  defaultTab?: 'issues' | 'properties';
}

export function Inspector({
  selectedNode,
  course,
  validationIssues,
  courseTree,
  onSelectCourseDetails,
  onSelectNode,
  defaultTab = 'issues',
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<'issues' | 'properties'>(defaultTab);

  // Sync activeTab when defaultTab changes (e.g., when opening inspector with specific tab)
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ minHeight: 48 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Issues</Typography>
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
            }
            value="issues"
            sx={{ textTransform: 'none', minHeight: 48 }}
          />
          <Tab
            label="Properties"
            value="properties"
            sx={{ textTransform: 'none', minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'issues' && (
          <IssuesPanel
            validationIssues={validationIssues}
            courseTree={courseTree}
            onSelectCourseDetails={onSelectCourseDetails}
            onSelectNode={onSelectNode}
          />
        )}
        {activeTab === 'properties' && (
          <PropertiesPanel
            selectedNode={selectedNode}
            course={course}
          />
        )}
      </Box>
    </Box>
  );
}

