import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { ContentListPage } from './pages/ContentListPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/enablement" element={<ContentListPage />} />
        <Route path="/enablement/content" element={<ContentListPage />} />
        <Route path="/enablement/content/:id" element={<ContentDetailPage />} />
        <Route path="/enablement/assistant" element={<AssistantPage />} />
        <Route path="/enablement/notifications" element={<NotificationsPage />} />
        <Route path="/" element={<ContentListPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;

