import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { useAuth } from './contexts/AuthContext';
import { handleOAuthRedirect } from './lib/auth';
import { track, TELEMETRY_EVENTS } from './lib/telemetry';

// Hub pages
import { LearnHubPage } from './pages/LearnHubPage';
import { AssetsHubPage } from './pages/AssetsHubPage';
import { AskAIHubPage } from './pages/AskAIHubPage';
import { AdminHubPage } from './pages/AdminHubPage';

// Learn pages
import { CoursesPage } from './pages/learn/CoursesPage';
import { CourseDetailPage } from './pages/learn/CourseDetailPage';
import { LessonPlayerPage } from './pages/learn/LessonPlayerPage';
import { LearningPathsPage } from './pages/learn/LearningPathsPage';
import { LearningPathDetailPage } from './pages/learn/LearningPathDetailPage';
import { CertificationsPage } from './pages/learn/CertificationsPage';
import { AssignmentsPage } from './pages/learn/AssignmentsPage';
import { RolePlayingPage } from './pages/learn/RolePlayingPage';
import { MyLearningPage } from './pages/learn/MyLearningPage';
import { PracticePage } from './pages/PracticePage';

// Assets pages
import { AssetLibraryPage } from './pages/assets/AssetLibraryPage';
import { KitsPage } from './pages/assets/KitsPage';
import { BrandMessagingPage } from './pages/assets/BrandMessagingPage';
import { UpdatesExpiringPage } from './pages/assets/UpdatesExpiringPage';
import { ResourcesLibraryPage } from './pages/ResourcesLibraryPage';

// AI pages
import { AiAssistantPage } from './pages/AiAssistantPage';

// Insights pages
import { InsightsAdoptionPage } from './pages/insights/InsightsAdoptionPage';
import { InsightsLearningPage } from './pages/insights/InsightsLearningPage';
import { InsightsAssetPerformancePage } from './pages/insights/InsightsAssetPerformancePage';
import { InsightsSearchAIPage } from './pages/insights/InsightsSearchAIPage';
import { InsightsResourcesPage } from './pages/InsightsResourcesPage';

// Admin pages
import { AdminUsersRolesPage } from './pages/admin/AdminUsersRolesPage';
import { AdminLearningPage } from './pages/admin/AdminLearningPage';
// Admin Learning pages
import { AdminLearningCoursesPage } from './pages/admin/learning/AdminLearningCoursesPage';
import { AdminCourseEditorPage } from './pages/admin/learning/AdminCourseEditorPage';
import { AdminLearningPathsPage } from './pages/admin/learning/AdminLearningPathsPage';
import { AdminPathEditorPage } from './pages/admin/learning/AdminPathEditorPage';
import { AdminLearningAssignmentsPage } from './pages/admin/learning/AdminLearningAssignmentsPage';
import { AdminLearningCertificatesPage } from './pages/admin/learning/AdminLearningCertificatesPage';
import { AdminLearningMediaPage } from './pages/admin/learning/AdminLearningMediaPage';
import { AdminTaxonomyPage } from './pages/admin/learning/AdminTaxonomyPage';
import { AdminTaxonomyDetailPage } from './pages/admin/learning/AdminTaxonomyDetailPage';

const RETURN_TO_KEY = 'enablement_return_to';

/**
 * Root route handler - redirects authenticated users to /enablement,
 * shows LandingPage for unauthenticated users
 */
function RootRoute() {
  const { isAuth, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (isAuth) {
        navigate('/enablement', { replace: true });
      }
    }
  }, [isAuth, loading, navigate]);

  if (loading) {
    return null; // LandingPage will handle loading state
  }

  return <LandingPage />;
}

function App() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  // Handle OAuth callback after redirect (only once on mount)
  useEffect(() => {
    let mounted = true;

    const handleRedirect = async () => {
      try {
        const wasRedirect = await handleOAuthRedirect();
        if (!mounted) return;
        
        if (wasRedirect) {
          // If we processed an OAuth redirect, check auth state
          console.log('[App] OAuth redirect handled, checking auth state...');
          await checkAuth();
          
          // After successful OAuth redirect, navigate to returnTo or default
          if (mounted) {
            const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || '/enablement';
            sessionStorage.removeItem(RETURN_TO_KEY); // Clean up
            track(TELEMETRY_EVENTS.LOGIN_SUCCESS);
            navigate(returnTo, { replace: true });
          }
        } else {
          // Normal page load - just check current auth state
          await checkAuth();
        }
      } catch (error) {
        if (!mounted) return;
        console.error('[App] Error handling OAuth redirect:', error);
        const errorCode = error instanceof Error ? (error as any).code : 'unknown';
        track(TELEMETRY_EVENTS.LOGIN_FAILED, { error_code: errorCode });
        // Still check auth state even if redirect handling failed
        try {
          await checkAuth();
        } catch (authError) {
          console.error('[App] Error checking auth state:', authError);
        }
      }
    };

    handleRedirect();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <Routes>
      {/* Public routes - no AppShell */}
      <Route path="/login" element={<LandingPage />} />
      <Route path="/" element={<RootRoute />} />
      
      {/* Protected routes - wrapped in RequireAuth and AppShell */}
      <Route
        path="/enablement"
        element={
          <RequireAuth>
            <AppShell>
              <HomePage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Hub routes */}
      <Route
        path="/enablement/learn"
        element={
          <RequireAuth>
            <AppShell>
              <LearnHubPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/assets"
        element={
          <RequireAuth>
            <AppShell>
              <AssetsHubPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/ask-ai"
        element={
          <RequireAuth>
            <AppShell>
              <AskAIHubPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminHubPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* Learn routes */}
      <Route
        path="/enablement/learn/my"
        element={
          <RequireAuth>
            <AppShell>
              <MyLearningPage />
            </AppShell>
          </RequireAuth>
        }
      />
      {/* Legacy route for backward compatibility */}
      <Route
        path="/enablement/learn/me"
        element={
          <RequireAuth>
            <AppShell>
              <MyLearningPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/courses"
        element={
          <RequireAuth>
            <AppShell>
              <CoursesPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/courses/:courseId"
        element={
          <RequireAuth>
            <AppShell>
              <CourseDetailPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/courses/:courseId/lessons/:lessonId"
        element={
          <RequireAuth>
            <AppShell>
              <LessonPlayerPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/paths"
        element={
          <RequireAuth>
            <AppShell>
              <LearningPathsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/paths/:pathId"
        element={
          <RequireAuth>
            <AppShell>
              <LearningPathDetailPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/role-playing"
        element={
          <RequireAuth>
            <AppShell>
              <RolePlayingPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/certificates"
        element={
          <RequireAuth>
            <AppShell>
              <CertificationsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      {/* Legacy route for backward compatibility */}
      <Route
        path="/enablement/learn/certifications"
        element={
          <RequireAuth>
            <AppShell>
              <CertificationsPage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Learn routes - legacy paths (for backward compatibility) */}
      <Route
        path="/enablement/courses"
        element={
          <RequireAuth>
            <AppShell>
              <CoursesPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learning-paths"
        element={
          <RequireAuth>
            <AppShell>
              <LearningPathsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/practice"
        element={
          <RequireAuth>
            <AppShell>
              <PracticePage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/certificates"
        element={
          <RequireAuth>
            <AppShell>
              <CertificationsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/learn/assignments"
        element={
          <RequireAuth>
            <AppShell>
              <AssignmentsPage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Resources routes - new structure */}
      <Route
        path="/enablement/resources"
        element={
          <RequireAuth>
            <AppShell>
              <ResourcesLibraryPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/kits"
        element={
          <RequireAuth>
            <AppShell>
              <KitsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/updates"
        element={
          <RequireAuth>
            <AppShell>
              <UpdatesExpiringPage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Assets routes - legacy paths (for backward compatibility) */}
      <Route
        path="/enablement/assets/library"
        element={
          <RequireAuth>
            <AppShell>
              <AssetLibraryPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/assets/kits"
        element={
          <RequireAuth>
            <AppShell>
              <KitsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/assets/brand"
        element={
          <RequireAuth>
            <AppShell>
              <BrandMessagingPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/assets/updates"
        element={
          <RequireAuth>
            <AppShell>
              <UpdatesExpiringPage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* AI routes */}
      <Route
        path="/enablement/ai"
        element={
          <RequireAuth>
            <AppShell>
              <AiAssistantPage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Insights routes */}
      <Route
        path="/enablement/analytics"
        element={
          <RequireAuth>
            <AppShell>
              <AnalyticsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/insights/adoption"
        element={
          <RequireAuth>
            <AppShell>
              <InsightsAdoptionPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/insights/learning"
        element={
          <RequireAuth>
            <AppShell>
              <InsightsLearningPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/insights/resources"
        element={
          <RequireAuth>
            <AppShell>
              <InsightsResourcesPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/insights/search-ai"
        element={
          <RequireAuth>
            <AppShell>
              <InsightsSearchAIPage />
            </AppShell>
          </RequireAuth>
        }
      />
      {/* Legacy insights route */}
      <Route
        path="/enablement/insights/asset-performance"
        element={
          <RequireAuth>
            <AppShell>
              <InsightsAssetPerformancePage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Admin routes (Admin only) */}
      <Route
        path="/enablement/admin/users"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminUsersRolesPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      {/* Admin Learning routes (Admin only) */}
      <Route
        path="/enablement/admin/learning/courses"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningCoursesPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/courses/:courseId"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminCourseEditorPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/paths"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningPathsPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/paths/:pathId"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminPathEditorPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/assignments"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningAssignmentsPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/certificates"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningCertificatesPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/learning/media"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminLearningMediaPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/taxonomy"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminTaxonomyPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/enablement/admin/taxonomy/:key"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminTaxonomyDetailPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* Notifications route */}
      <Route
        path="/enablement/notifications"
        element={
          <RequireAuth>
            <AppShell>
              <NotificationsPage />
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
