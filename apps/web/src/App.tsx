import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { ContentListPage } from './pages/ContentListPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BrainPage } from './pages/BrainPage';
import { BrainDocumentPage } from './pages/BrainDocumentPage';
import { DesignCheckPage } from './pages/DesignCheckPage';
import { useAuth } from './contexts/AuthContext';
import { handleOAuthRedirect } from './lib/auth';

function App() {
  const { checkAuth } = useAuth();

  // Handle OAuth callback after redirect
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const wasRedirect = await handleOAuthRedirect();
        if (wasRedirect) {
          // If we processed an OAuth redirect, check auth state
          console.log('[App] OAuth redirect handled, checking auth state...');
          await checkAuth();
        } else {
          // Normal page load - just check current auth state
          await checkAuth();
        }
      } catch (error) {
        console.error('[App] Error handling OAuth redirect:', error);
        // Still check auth state even if redirect handling failed
        try {
          await checkAuth();
        } catch (authError) {
          console.error('[App] Error checking auth state:', authError);
        }
      }
    };

    handleRedirect();
  }, [checkAuth]);

  return (
    <AppShell>
      <Routes>
        <Route path="/enablement" element={<ContentListPage />} />
        <Route path="/enablement/content" element={<ContentListPage />} />
        <Route path="/enablement/content/:id" element={<ContentDetailPage />} />
        <Route path="/enablement/assistant" element={<AssistantPage />} />
        <Route path="/enablement/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/enablement/notifications" element={<NotificationsPage />} />
        <Route path="/enablement/analytics" element={<AnalyticsPage />} />
        <Route path="/enablement/brain" element={<BrainPage />} />
        <Route path="/enablement/brain/:id" element={<BrainDocumentPage />} />
        <Route path="/enablement/_design-check" element={<DesignCheckPage />} />
        <Route path="/" element={<ContentListPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;

