// /src/App.jsx (FINAL, SECURE, SUPERVISOR-APPROVED VERSION)

// --- Core React & Router Imports ---
import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

// --- MUI & Theme Imports ---
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
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
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import AITools from './pages/AITools';
import QuestionGenerator from './pages/tools/QuestionGenerator';
import SlideGenerator from './pages/tools/SlideGenerator';
import RubricGenerator from './pages/tools/RubricGenerator';
import Assessments from './pages/Assessments';
import NewAssessmentV2 from './pages/assessments/NewAssessmentV2';
import AssessmentResultsPage from './pages/assessments/AssessmentResultsPage';
import AssessmentReviewPage from './pages/assessments/AssessmentReviewPage';
import RedirectReviewToFirstStudent from './pages/assessments/RedirectReviewToFirstStudent';
import PublicReportView from './pages/public/ReportView';
import Chatbot from './pages/Chatbot';
import StudentProfile from './pages/StudentProfile';
import AdminDashboard from './pages/AdminDashboard';
import Quizzes from './pages/Quizzes';
import QuizBuilder from './pages/quizzes/QuizBuilder';
import QuizHost from './pages/quizzes/QuizHost';
import QuizParticipant from './pages/quizzes/QuizParticipant';
import QuizAnalytics from './pages/quizzes/QuizAnalytics';

/**
 * A layout component that wraps all protected pages.
 * It includes the main Layout (Header, Sidebar) and an Outlet for the specific page content.
 */
const AppLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

/**
 * A component that applies the MUI theme and defines the application's routing structure.
 */
const ThemedApp = () => {
  const { mode } = useThemeMode();
  // useMemo ensures the theme is only recalculated when the mode changes.
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* The Routes component is where all URL-to-component mapping is defined. */}
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

        {/* --- ADMIN ROUTE (Special Protected Route) --- */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* --- [CRITICAL MODIFICATION 4/4: DEFINE PROTECTED ROUTES] --- */}
        {/* This parent Route uses the ProtectedRoute component as its element.
            ANY route nested inside this one will first be checked by ProtectedRoute.
            If the user is not authenticated, they will be redirected to /login
            and none of the child routes will ever be rendered. */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
          <Route path="/assessments/:job_id/results" element={<AssessmentResultsPage />} />
          <Route path="/assessments/:job_id/review/:entity_id" element={<AssessmentReviewPage />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quizzes/new" element={<QuizBuilder />} />
          <Route path="/quizzes/:quizId/edit" element={<QuizBuilder />} />
          <Route path="/quizzes/:quizId/analytics" element={<QuizAnalytics />} />
          <Route path="/quizzes/sessions/:sessionId/host" element={<QuizHost />} />
          <Route path="/chat/:sessionId?" element={<Chatbot />} />

          {/* A catch-all route for any other path, rendered within the protected layout. */}
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

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