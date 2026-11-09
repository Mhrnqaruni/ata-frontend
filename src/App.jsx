// The app root: sets up the router, theme and global providers, and maps every URL to its page.
// Its routes cover sign-in, public quiz and report pages, /family, /admin and the signed-in teacher pages.
// Area: platform

// --- Core React & Router Imports ---
import React, { useMemo, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
// Each page view reaches the UI log with its page name; lazyPage() is lazy() with the chunk's download timed.
import { lazyPage, usePageViews } from './services/pageViews';

// --- MUI & Theme Imports ---
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { getTheme } from './theme/theme';

// --- Context Provider Imports ---
// These providers wrap the entire application to provide global state.
import { ThemeModeProvider, useThemeMode } from './hooks/useThemeMode';
import { AuthProvider } from './hooks/useAuth';
import { SnackbarProvider } from './hooks/useSnackbar';

// --- [CRITICAL MODIFICATION 1/4: IMPORT NEW COMPONENTS] ---
// Import the new pages and the route protection component.
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/common/ProtectedRoute';

// --- Component & Page Imports (Existing) ---
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Classes from './pages/Classes';
const ClassDetails = lazyPage(() => import('./pages/ClassDetails'));
import AITools from './pages/AITools';
const QuestionGenerator = lazyPage(() => import('./pages/tools/QuestionGenerator'));
const SlideGenerator = lazyPage(() => import('./pages/tools/SlideGenerator'));
const RubricGenerator = lazyPage(() => import('./pages/tools/RubricGenerator'));
import Assessments from './pages/Assessments';
const NewAssessmentV2 = lazyPage(() => import('./pages/assessments/NewAssessmentV2'));
const QuickAssessment = lazyPage(() => import('./pages/assessments/QuickAssessment'));
const AssessmentResultsPage = lazyPage(() => import('./pages/assessments/AssessmentResultsPage'));
const AssessmentReviewPage = lazyPage(() => import('./pages/assessments/AssessmentReviewPage'));
const PublicReportView = lazyPage(() => import('./pages/public/ReportView'));
const Chatbot = lazyPage(() => import('./pages/Chatbot'));
const StudentProfile = lazyPage(() => import('./pages/StudentProfile'));
const AdminDashboard = lazyPage(() => import('./pages/AdminDashboard'));
const FamilyArea = lazyPage(() => import('./areas/family/FamilyArea'));
const FamilyStart = lazyPage(() => import('./areas/family/FamilyStart'));
const FamilyShell = lazyPage(() => import('./areas/family/shell/FamilyShell'));
const SectionListPage = lazyPage(() => import('./areas/family/lists/SectionListPage'));
const ActivitiesPage = lazyPage(() => import('./areas/family/lists/ActivitiesPage'));
const HomePage = lazyPage(() => import('./areas/family/child/HomePage'));
const ProfilePage = lazyPage(() => import('./areas/family/child/ProfilePage'));
const NotebookPage = lazyPage(() => import('./areas/family/notebook/NotebookPage'));
const ResultPage = lazyPage(() => import('./areas/family/results/ResultPage'));
import FamilyLoading from './areas/family/FamilyLoading';
import Quizzes from './pages/Quizzes';
const QuizBuilder = lazyPage(() => import('./pages/quizzes/QuizBuilder'));
const QuizHost = lazyPage(() => import('./pages/quizzes/QuizHost'));
const QuizParticipant = lazyPage(() => import('./pages/quizzes/QuizParticipant'));
const QuizAnalytics = lazyPage(() => import('./pages/quizzes/QuizAnalytics'));
const QuizSPParticipant = lazyPage(() => import('./pages/quizzes/QuizSPParticipant'));
const QuizSPHost = lazyPage(() => import('./pages/quizzes/QuizSPHost'));
const QuizSPAnalytics = lazyPage(() => import('./pages/quizzes/QuizSPAnalytics'));

/**
 * A layout component that wraps all protected pages.
 * It includes the main Layout (Header, Sidebar) and an Outlet for the specific page content.
 */
const AppLayout = () => (
  <Layout>
    <Suspense
      fallback={
        <Box role="status" sx={{ py: 3 }}>
          Loading page…
        </Box>
      }
    >
      <Outlet />
    </Suspense>
  </Layout>
);

/**
 * A component that applies the MUI theme and defines the application's routing structure.
 */
const ThemedApp = () => {
  const { mode } = useThemeMode();
  // useMemo ensures the theme is only recalculated when the mode changes.
  const theme = useMemo(() => getTheme(mode), [mode]);
  // Once, here inside the router: each new pathname is a page view (services/pageViews.js).
  usePageViews();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* the still brand ground (logo-colour blooms) behind every page */}
      <div aria-hidden="true" className="mst-ground" />
      {/* The Routes component is where all URL-to-component mapping is defined. */}
      <Suspense
        fallback={
          <Box role="status" sx={{ p: 3 }}>
            Loading page…
          </Box>
        }
      >
        <Routes>
          {/* --- [CRITICAL MODIFICATION 2/4: DEFINE PUBLIC-ONLY ROUTES] --- */}
          {/* These routes are for unauthenticated users. */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- [CRITICAL MODIFICATION 3/4: DEFINE TRULY PUBLIC ROUTES] --- */}
          {/* This route is accessible to anyone, logged in or not. */}
          <Route path="/report/:report_token" element={<PublicReportView />} />

          {/* --- QUIZ PARTICIPANT ROUTES (Public - No Auth Required) --- */}
          <Route path="/quiz/join" element={<QuizParticipant />} />
          <Route path="/quiz/join/:roomCode" element={<QuizParticipant />} />

          {/* --- SELF-PACED QUIZ PARTICIPANT ROUTES (Public - No Auth Required) --- */}
          <Route path="/quiz/sp/join" element={<QuizSPParticipant />} />
          <Route path="/quiz/sp/join/:accessCode" element={<QuizSPParticipant />} />

          {/* --- ADMIN ROUTE (Special Protected Route) --- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Parent mode (Phase 1.37): one pathless route holds the sign-in guard, the parent space, its loading
            screen and "Start Parent mode". Each address inside is written out, because the page-name test reads
            them; sections.js lists the sections for the navigation. */}
          <Route
            element={
              <ProtectedRoute>
                <Suspense fallback={<FamilyLoading />}>
                  <FamilyArea />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="/family" element={<FamilyStart />} />
            {/* No list page of children (C-1): this address opens what /family opens. */}
            <Route path="/family/children" element={<FamilyStart />} />
            {/* The shell's route: the side panel or phone bars, the switcher and the children's dialogs. */}
            <Route element={<FamilyShell />}>
              <Route path="/family/children/:child_id" element={<HomePage />} />
              {/* The child's profile (Phase 1.38 design §3): the details, how the child is doing, and the chats. */}
              <Route path="/family/children/:child_id/profile" element={<ProfilePage />} />
              <Route path="/family/children/:child_id/notebook" element={<NotebookPage />} />
              {/* Homework and the four Activities sections share one list page; the Activities page leads to them. */}
              <Route path="/family/children/:child_id/homework" element={<SectionListPage section="homework" />} />
              <Route path="/family/children/:child_id/activities" element={<ActivitiesPage />} />
              <Route path="/family/children/:child_id/quizzes" element={<SectionListPage section="quizzes" />} />
              <Route path="/family/children/:child_id/flashcards" element={<SectionListPage section="flashcards" />} />
              <Route path="/family/children/:child_id/mind-maps" element={<SectionListPage section="mind-maps" />} />
              <Route path="/family/children/:child_id/stories" element={<SectionListPage section="stories" />} />
              {/* Each result at its own address (C-2): one page for every kind, given its section's segment. */}
              <Route
                path="/family/children/:child_id/quizzes/:activity_id"
                element={<ResultPage segment="quizzes" />}
              />
              <Route
                path="/family/children/:child_id/flashcards/:activity_id"
                element={<ResultPage segment="flashcards" />}
              />
              <Route
                path="/family/children/:child_id/mind-maps/:activity_id"
                element={<ResultPage segment="mind-maps" />}
              />
              <Route
                path="/family/children/:child_id/stories/:activity_id"
                element={<ResultPage segment="stories" />}
              />
              <Route
                path="/family/children/:child_id/homework/:activity_id"
                element={<ResultPage segment="homework" />}
              />
              <Route
                path="/family/children/:child_id/notebook/explanations/:activity_id"
                element={<ResultPage segment="notebook/explanations" />}
              />
            </Route>
          </Route>

          {/* --- [CRITICAL MODIFICATION 4/4: DEFINE PROTECTED ROUTES] --- */}
          {/* This parent Route uses the ProtectedRoute component as its element.
            ANY route nested inside this one will first be checked by ProtectedRoute.
            If the user is not authenticated, they will be redirected to /login
            and none of the child routes will ever be rendered. */}
          <Route
            element={
              <ProtectedRoute requiredRole="teacher">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* All application pages that require a user to be logged in go here. */}
            <Route path="/" element={<Home />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/classes/:class_id" element={<ClassDetails />} />
            <Route path="/students/:student_id" element={<StudentProfile />} />
            <Route path="/tools" element={<AITools />} />
            <Route path="/tools/question-generator" element={<QuestionGenerator />} />
            <Route path="/tools/slide-generator" element={<SlideGenerator />} />
            <Route path="/tools/rubric-generator" element={<RubricGenerator />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/new" element={<NewAssessmentV2 />} />
            <Route path="/assessments/quick" element={<QuickAssessment />} />
            <Route path="/assessments/:job_id/results" element={<AssessmentResultsPage />} />
            <Route path="/assessments/:job_id/review/:entity_id" element={<AssessmentReviewPage />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/quizzes/new" element={<QuizBuilder />} />
            <Route path="/quizzes/:quizId/edit" element={<QuizBuilder />} />
            <Route path="/quizzes/:quizId/analytics" element={<QuizAnalytics />} />
            <Route path="/quizzes/sessions/:sessionId/host" element={<QuizHost />} />
            <Route path="/quizzes/sp-sessions/:sessionId/host" element={<QuizSPHost />} />
            <Route path="/quizzes/sp-sessions/:sessionId/analytics" element={<QuizSPAnalytics />} />
            <Route path="/chat/:sessionId?" element={<Chatbot />} />

            {/* A catch-all route for any other path, rendered within the protected layout. */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
};

/**
 * The absolute top-level component of the application.
 * It sets up the Router and all the global context providers.
 * The order of providers here generally doesn't matter, but it's good practice
 * to have the AuthProvider near the top.
 */
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SnackbarProvider>
            <ThemeModeProvider>
              <ThemedApp />
            </ThemeModeProvider>
          </SnackbarProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
