/**
 * Course Authoring Layout
 * 
 * 3-column responsive layout: Outline (left) + Editor (middle) + Context Panel (right)
 */

import React, { ReactNode } from 'react';
import { Box, Drawer, IconButton, useTheme, useMediaQuery } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

export interface CourseAuthoringLayoutProps {
  outline: ReactNode;
  editor: ReactNode;
  contextPanel?: ReactNode;
  contextPanelOpen?: boolean;
  onContextPanelToggle?: () => void;
  contextPanelWidth?: number;
}

const DEFAULT_CONTEXT_PANEL_WIDTH = 320;

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

  return (
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Left: Outline (fixed width) */}
      <Box
        sx={{
          width: { xs: '100%', md: 300 },
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {outline}
      </Box>

      {/* Middle: Editor (flex) */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0, // Allow flex item to shrink below content size
          position: 'relative', // Ensure editor is in stacking context
          zIndex: 0, // Lower than toggle button but above panel when closed
          paddingRight: contextPanel && !contextPanelOpen ? '40px' : 0, // Space for toggle button when panel is closed
        }}
      >
        {editor}
      </Box>

      {/* Right: Context Panel (collapsible drawer) */}
      {contextPanel && (
        <>
          {/* Desktop: Persistent drawer */}
          {!isMobile && (
            <Box
              sx={{
                position: 'relative',
                width: contextPanelOpen ? contextPanelWidth : 0,
                borderLeft: contextPanelOpen ? 1 : 0,
                borderColor: 'divider',
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0, // Prevent shrinking
                pointerEvents: contextPanelOpen ? 'auto' : 'none', // Don't block clicks when closed
              }}
            >
              {contextPanelOpen && (
                <Box sx={{ height: '100%', overflow: 'auto', p: 2, pointerEvents: 'auto' }}>
                  {contextPanel}
                </Box>
              )}
              {onContextPanelToggle && (
                <IconButton
                  onClick={onContextPanelToggle}
                  sx={{
                    position: 'absolute',
                    right: contextPanelOpen ? contextPanelWidth - 8 : -8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10, // Higher z-index to ensure it's clickable
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 1,
                    pointerEvents: 'auto', // Always allow clicks on toggle button
                    width: 32,
                    height: 32,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {contextPanelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
              )}
            </Box>
          )}

          {/* Mobile: Temporary drawer */}
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
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                {contextPanel}
              </Box>
            </Drawer>
          )}
        </>
      )}
    </Box>
  );
}

