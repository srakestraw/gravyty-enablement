import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Header } from './Header';
import { SideNav } from './SideNav';
import { PageLayout } from './PageLayout';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <SideNav />
        <PageLayout>{children}</PageLayout>
      </Box>
    </Box>
  );
}

