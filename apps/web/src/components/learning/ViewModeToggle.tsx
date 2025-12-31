/**
 * View Mode Toggle Component
 * 
 * Toggle between Card and List views with localStorage persistence
 */

import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { ViewModule, ViewList } from '@mui/icons-material';

export type ViewMode = 'card' | 'list';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const STORAGE_KEY = 'learning.courses.viewMode';

export function getDefaultViewMode(userRole?: string | null): ViewMode {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'card' || stored === 'list') {
    return stored;
  }
  
  // Role-based defaults
  if (!userRole || userRole === 'Viewer') {
    return 'card'; // Students default to Card view
  }
  
  return 'list'; // Contributors/Admins default to List view
}

export function saveViewMode(mode: ViewMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const handleChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      onChange(newMode);
      saveViewMode(newMode);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      aria-label="view mode"
      size="small"
    >
      <ToggleButton value="card" aria-label="card view">
        <Tooltip title="Card view">
          <ViewModule />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="list" aria-label="list view">
        <Tooltip title="List view">
          <ViewList />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

