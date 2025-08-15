// /src/App.jsx (FINAL, WITH CHATBOT ROUTE)

import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ThemeModeProvider, useThemeMode } from './hooks/useThemeMode';
import { AuthProvider } from './hooks/useAuth';
import { SnackbarProvider } from './hooks/useSnackbar';
import { getTheme } from './theme/theme';

// --- Component & Page Imports ---
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import AITools from './pages/AITools';
import QuestionGenerator from './pages/tools/QuestionGenerator';
import SlideGenerator from './pages/tools/SlideGenerator';
import RubricGenerator from './pages/tools/RubricGenerator';
import Assessments from './pages/Assessments';
import NewAssessment from './pages/assessments/NewAssessment';
import NewAssessmentV2 from './pages/assessments/NewAssessmentV2';
import GradingWorkflow from './pages/grading/GradingWorkflow';
import FinalResultsPage from './pages/assessments/FinalResultsPage';
import PublicReportView from './pages/public/ReportView';
// --- [THE FIX IS HERE: STEP 1 - IMPORT] ---
import Chatbot from './pages/Chatbot'; // Import the real Chatbot page
// --- [END OF FIX] ---

const AppLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const ThemedApp = () => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public route without the main layout */}
        <Route path="/report/:report_token" element={<PublicReportView />} />
        
        {/* Authenticated routes that use the AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:class_id" element={<ClassDetails />} />
          <Route path="/tools" element={<AITools />} />
          <Route path="/tools/question-generator" element={<QuestionGenerator />} />
          <Route path="/tools/slide-generator" element={<SlideGenerator />} />
          <Route path="/tools/rubric-generator" element={<RubricGenerator />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/new" element={<NewAssessment />} />
          <Route path="/assessments/new-v2" element={<NewAssessmentV2 />} />
          <Route path="/assessments/:job_id/review" element={<GradingWorkflow />} />
          <Route path="/assessments/:job_id/results" element={<FinalResultsPage />} />
          
          {/* --- [THE FIX IS HERE: STEP 2 - REPLACE] --- */}
          {/* The dynamic route for chat sessions */}
          <Route path="/chat/:sessionId?" element={<Chatbot />} />
          {/* --- [END OF FIX] --- */}

          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SnackbarProvider>
          <ThemeModeProvider>
            <ThemedApp />
          </ThemeModeProvider>
        </SnackbarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;