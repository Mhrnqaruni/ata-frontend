// Every quiz address (Phase 1.46, SOT-16): the pupils' pages and the teacher's, each a lazy page file that one
// lane owns, and the old results addresses, which forward. App.jsx places the two lists, each where its guard is.
// Area: quizzes

import { Route } from 'react-router-dom';
import { lazyPage } from '../../services/pageViews';

// Only Lane 3 edits this file. Each page lane replaces its own page file (README.md says which lane owns which).
const JoinPage = lazyPage(() => import('./play/JoinPage'));
const LivePlay = lazyPage(() => import('./play/LivePlay'));
const HomeworkPlay = lazyPage(() => import('./play/HomeworkPlay'));
const LibraryPage = lazyPage(() => import('./library/LibraryPage'));
const EditorPage = lazyPage(() => import('./editor/EditorPage'));
const ResultsPage = lazyPage(() => import('./results/ResultsPage'));
const OldResultsAddress = lazyPage(() => import('./OldResultsAddress'));
const HostPage = lazyPage(() => import('./live/HostPage'));
const HomeworkPage = lazyPage(() => import('./homework/HomeworkPage'));
const ReviewPage = lazyPage(() => import('./review/ReviewPage'));

// The pupils' pages, with no sign-in. /join is the short link that Present and Share give out (SOT-8).
export const pupilQuizRoutes = (
  <>
    <Route path="/join" element={<JoinPage />} />
    <Route path="/join/:code" element={<JoinPage />} />
    <Route path="/quiz/join" element={<LivePlay />} />
    <Route path="/quiz/join/:roomCode" element={<LivePlay />} />
    <Route path="/quiz/sp/join" element={<HomeworkPlay />} />
    <Route path="/quiz/sp/join/:accessCode" element={<HomeworkPlay />} />
  </>
);

// The teacher's pages, behind the teacher sign-in. A quiz's results have one address, /quizzes/:quizId/results.
export const teacherQuizRoutes = (
  <>
    <Route path="/quizzes" element={<LibraryPage />} />
    <Route path="/quizzes/new" element={<EditorPage />} />
    <Route path="/quizzes/:quizId/edit" element={<EditorPage />} />
    <Route path="/quizzes/:quizId/results" element={<ResultsPage />} />
    <Route path="/quizzes/:quizId/runs/:runId/pupils/:pupilId" element={<ReviewPage />} />
    <Route path="/quizzes/:quizId/analytics" element={<OldResultsAddress />} />
    <Route path="/quizzes/sessions/:sessionId/host" element={<HostPage />} />
    <Route path="/quizzes/sp-sessions/:sessionId/host" element={<HomeworkPage />} />
    <Route path="/quizzes/sp-sessions/:sessionId/analytics" element={<OldResultsAddress />} />
  </>
);
