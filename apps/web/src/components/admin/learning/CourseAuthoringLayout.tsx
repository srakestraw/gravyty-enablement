/**
 * Course Authoring Layout
 * 
 * 3-column responsive layout: Outline (left) + Editor (middle) + Inspector (right)
 * Inspector is non-overlay for desktop; mobile may use drawer.
 * Uses CSS Grid to ensure Inspector reserves space and doesn't overlap editor content.
 */

import React, { ReactNode } from 'react';
import { Box, Drawer, useTheme, useMediaQuery } from '@mui/material';

export interface CourseAuthoringLayoutProps {
  outline: ReactNode;
  editor: ReactNode;
  contextPanel?: ReactNode;
  contextPanelOpen?: boolean;
  onContextPanelToggle?: () => void;
  contextPanelWidth?: number;
}

const DEFAULT_CONTEXT_PANEL_WIDTH = 360;
const OUTLINE_WIDTH = 300;

export function CourseAuthoringLayout({
  outline,
  editor,
  contextPanel,
  contextPanelOpen = false,
  onContextPanelToggle,
  contextPanelWidth = DEFAULT_CONTEXT_PANEL_WIDTH,
}: CourseAuthoringLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Build grid template columns string
  // When inspector is closed, it doesn't reserve space (editor expands)
  const gridColumns = contextPanel && contextPanelOpen
    ? `${OUTLINE_WIDTH}px minmax(0, 1fr) ${contextPanelWidth}px`
    : `${OUTLINE_WIDTH}px minmax(0, 1fr)`;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr', // Mobile: single column (outline hidden when inspector open)
          md: gridColumns, // Desktop: 3 columns when inspector exists, 2 when not
        },
        overflow: 'hidden',
        transition: theme.transitions.create('grid-template-columns', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      {/* Left: Outline (fixed width) */}
      <Box
        sx={{
          display: { xs: contextPanelOpen ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        {outline}
      </Box>

      {/* Middle: Editor (flexible, can shrink) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0, // Critical: allows column to shrink below content size
        }}
      >
        {editor}
      </Box>

      {/* Right: Inspector Panel */}
      {contextPanel && (
        <>
          {/* Desktop/Tablet: Non-overlay panel that reserves space */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderLeft: contextPanelOpen ? 1 : 0,
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              {/* Inspector content */}
              {contextPanelOpen && (
                <Box
                  sx={{
                    height: '100%',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  {contextPanel}
                </Box>
              )}
            </Box>
          )}

          {/* Mobile: Overlay drawer (only for small screens) */}
          {isMobile && (
            <Drawer
              anchor="right"
              open={contextPanelOpen}
              onClose={onContextPanelToggle}
              ModalProps={{
                keepMounted: true, // Better mobile performance
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  width: contextPanelWidth,
                },
              }}
            >
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                {contextPanel}
              </Box>
            </Drawer>
          )}
        </>
      )}
    </Box>
  );
}

