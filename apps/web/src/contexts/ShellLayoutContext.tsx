/**
 * Shell Layout Context
 * 
 * Manages sidebar navigation state (expanded/collapsed on desktop, drawer open/closed on mobile).
 * Provides shared state for Header and SideNav components.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

type NavMode = 'expanded' | 'collapsed';

interface ShellLayoutContextType {
  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleNav: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

const ShellLayoutContext = createContext<ShellLayoutContextType | undefined>(undefined);

const STORAGE_KEY = 'enablement.sidenav.mode';

/**
 * Load nav mode from localStorage
 */
function loadNavMode(): NavMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'expanded' || stored === 'collapsed') {
      return stored;
    }
  } catch (error) {
    console.warn('[ShellLayout] Failed to load nav mode from localStorage:', error);
  }
  return 'expanded'; // Default to expanded
}

/**
 * Save nav mode to localStorage
 */
function saveNavMode(mode: NavMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn('[ShellLayout] Failed to save nav mode to localStorage:', error);
  }
}

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // sm and below
  
  // Desktop nav mode (expanded/collapsed)
  const [navMode, setNavModeState] = useState<NavMode>(() => loadNavMode());
  
  // Mobile drawer open state (not persisted)
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Persist nav mode changes
  const setNavMode = (mode: NavMode) => {
    setNavModeState(mode);
    saveNavMode(mode);
  };

  // Toggle desktop nav mode
  const toggleNav = () => {
    setNavMode(navMode === 'expanded' ? 'collapsed' : 'expanded');
  };

  // Mobile nav helpers
  const openMobileNav = () => {
    setMobileNavOpen(true);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  // Close mobile nav when switching to desktop view
  useEffect(() => {
    if (!isMobile && mobileNavOpen) {
      setMobileNavOpen(false);
    }
  }, [isMobile, mobileNavOpen]);

  return (
    <ShellLayoutContext.Provider
      value={{
        navMode,
        setNavMode,
        mobileNavOpen,
        setMobileNavOpen,
        toggleNav,
        openMobileNav,
        closeMobileNav,
      }}
    >
      {children}
    </ShellLayoutContext.Provider>
  );
}

export function useShellLayout() {
  const context = useContext(ShellLayoutContext);
  if (context === undefined) {
    throw new Error('useShellLayout must be used within a ShellLayoutProvider');
  }
  return context;
}


