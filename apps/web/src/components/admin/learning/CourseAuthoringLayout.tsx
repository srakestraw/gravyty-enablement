/**
 * Course Authoring Layout
 * 
 * 3-column responsive layout: Outline (left) + Editor (middle) + Inspector (right)
 * Inspector is non-overlay for desktop; mobile may use drawer.
 * Uses CSS Grid to ensure Inspector reserves space and doesn't overlap editor content.
 */

import React, { ReactNode } from 'react';
import { Box, Drawer, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
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

const DEFAULT_CONTEXT_PANEL_WIDTH = 360;
const OUTLINE_WIDTH = 300;
const TOGGLE_BUTTON_WIDTH = 40; // Space reserved for toggle button when panel is closed

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

  // Calculate right column width: panel width when open, toggle button width when closed
  // Always reserve space for the toggle button, even when closed
  const rightColumnWidth = contextPanelOpen ? contextPanelWidth : TOGGLE_BUTTON_WIDTH;

  // Build grid template columns string
  const gridColumns = contextPanel
    ? `${OUTLINE_WIDTH}px minmax(0, 1fr) ${rightColumnWidth}px`
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
                    overflow: 'auto',
                    p: 2,
                    width: '100%',
                  }}
                >
                  {contextPanel}
                </Box>
              )}

              {/* Toggle button - always visible */}
              {onContextPanelToggle && (
                <Tooltip title={contextPanelOpen ? 'Close Inspector' : 'Open Inspector'}>
                  <IconButton
                    onClick={onContextPanelToggle}
                    sx={{
                      position: 'absolute',
                      right: contextPanelOpen ? contextPanelWidth - 20 : TOGGLE_BUTTON_WIDTH / 2 - 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      boxShadow: 1,
                      width: 32,
                      height: 32,
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: theme.transitions.create('right', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                      }),
                    }}
                    aria-label={contextPanelOpen ? 'Close Inspector' : 'Open Inspector'}
                  >
                    {contextPanelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                </Tooltip>
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

