import { createTheme, Theme } from '@mui/material/styles';

/**
 * Gravyty Design System Theme
 * 
 * TODO: Extract tokens from Figma using MCP and replace placeholder values
 * 
 * Figma Design System: https://www.figma.com/design/rGLG1CGxkfk26LTHctRgJk/Gravyty-Design-System?node-id=0-1&m=dev
 */

export const theme: Theme = createTheme({
  palette: {
    mode: 'light',
    // TODO: Extract primary colors from Figma
    primary: {
      main: '#1976d2', // Placeholder - replace with Figma primary color
      light: '#42a5f5', // Placeholder
      dark: '#1565c0', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract secondary colors from Figma
    secondary: {
      main: '#9c27b0', // Placeholder - replace with Figma secondary color
      light: '#ba68c8', // Placeholder
      dark: '#7b1fa2', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract error colors from Figma
    error: {
      main: '#d32f2f', // Placeholder
      light: '#ef5350', // Placeholder
      dark: '#c62828', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract warning colors from Figma
    warning: {
      main: '#ed6c02', // Placeholder
      light: '#ff9800', // Placeholder
      dark: '#e65100', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract info colors from Figma
    info: {
      main: '#0288d1', // Placeholder
      light: '#03a9f4', // Placeholder
      dark: '#01579b', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract success colors from Figma
    success: {
      main: '#2e7d32', // Placeholder
      light: '#4caf50', // Placeholder
      dark: '#1b5e20', // Placeholder
      contrastText: '#ffffff',
    },
    // TODO: Extract grey/neutral colors from Figma
    grey: {
      50: '#fafafa', // Placeholder
      100: '#f5f5f5', // Placeholder
      200: '#eeeeee', // Placeholder
      300: '#e0e0e0', // Placeholder
      400: '#bdbdbd', // Placeholder
      500: '#9e9e9e', // Placeholder
      600: '#757575', // Placeholder
      700: '#616161', // Placeholder
      800: '#424242', // Placeholder
      900: '#212121', // Placeholder
    },
    // TODO: Extract background and text colors from Figma
    background: {
      default: '#ffffff', // Placeholder
      paper: '#ffffff', // Placeholder
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)', // Placeholder
      secondary: 'rgba(0, 0, 0, 0.6)', // Placeholder
      disabled: 'rgba(0, 0, 0, 0.38)', // Placeholder
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    // TODO: Extract typography scale from Figma
    h1: {
      fontSize: '2.5rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.2, // Placeholder
      // TODO: Add letterSpacing from Figma
    },
    h2: {
      fontSize: '2rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.3, // Placeholder
    },
    h3: {
      fontSize: '1.75rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.4, // Placeholder
    },
    h4: {
      fontSize: '1.5rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.4, // Placeholder
    },
    h5: {
      fontSize: '1.25rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.5, // Placeholder
    },
    h6: {
      fontSize: '1rem', // Placeholder
      fontWeight: 500, // Placeholder
      lineHeight: 1.5, // Placeholder
    },
    body1: {
      fontSize: '1rem', // Placeholder
      fontWeight: 400, // Placeholder
      lineHeight: 1.5, // Placeholder
    },
    body2: {
      fontSize: '0.875rem', // Placeholder
      fontWeight: 400, // Placeholder
      lineHeight: 1.43, // Placeholder
    },
    button: {
      fontSize: '0.875rem', // Placeholder
      fontWeight: 500, // Placeholder
      textTransform: 'none', // Placeholder - check Figma
    },
    caption: {
      fontSize: '0.75rem', // Placeholder
      fontWeight: 400, // Placeholder
      lineHeight: 1.66, // Placeholder
    },
  },
  spacing: 8, // Base spacing unit - TODO: Verify with Figma
  shape: {
    borderRadius: 4, // TODO: Extract border radius values from Figma
  },
  shadows: [
    'none',
    // TODO: Extract shadow definitions from Figma
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)', // Placeholder
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)', // Placeholder
    // ... add more shadow levels as needed from Figma
  ] as any,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
      // TODO: Verify breakpoints with Figma design system
    },
  },
});

