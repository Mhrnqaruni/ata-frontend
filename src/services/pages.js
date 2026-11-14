// The name of every route in App.jsx (PAGES), and pageFor(), which turns a raw path into its page name and pattern.
// Log lines carry these, never the raw path, which can hold ids, room codes and share tokens.
// Area: platform

import { matchRoutes } from 'react-router-dom';

// One entry for each <Route path> in App.jsx, in its order. tests/pageNames.test.mjs fails if one is missing.
export const PAGES = [
  { path: '/owner/sign-in', name: 'owner.sign_in' },
  { path: '/owner', name: 'owner.overview' },
  { path: '/owner/ai', name: 'owner.ai' },
  { path: '/owner/ai/tasks/:task_kind/:task_id', name: 'owner.ai.task' },
  { path: '/owner/users', name: 'owner.users' },
  { path: '/owner/users/:user_id', name: 'owner.user' },
  { path: '/owner/assessments', name: 'owner.assessments' },
  { path: '/owner/assessments/:assessment_id', name: 'owner.assessment' },
  { path: '/owner/problems', name: 'owner.problems' },
  { path: '/owner/organizations', name: 'owner.organizations' },
  { path: '/owner/search', name: 'owner.search' },
  { path: '/owner/access', name: 'owner.access' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/report/:report_token', name: 'report' },
  { path: '/quiz/join', name: 'quiz.join' },
  { path: '/quiz/join/:roomCode', name: 'quiz.join.code' },
  { path: '/quiz/sp/join', name: 'quiz.sp.join' },
  { path: '/quiz/sp/join/:accessCode', name: 'quiz.sp.join.code' },
  { path: '/family', name: 'family.start' },
  { path: '/family/children', name: 'family.children' },
  { path: '/family/children/:child_id', name: 'family.child' },
  { path: '/family/children/:child_id/profile', name: 'family.profile' },
  { path: '/family/children/:child_id/notebook', name: 'family.notebook' },
  { path: '/family/children/:child_id/homework', name: 'family.homework' },
  { path: '/family/children/:child_id/activities', name: 'family.activities' },
  { path: '/family/children/:child_id/quizzes', name: 'family.quizzes' },
  { path: '/family/children/:child_id/flashcards', name: 'family.flashcards' },
  { path: '/family/children/:child_id/mind-maps', name: 'family.mind-maps' },
  { path: '/family/children/:child_id/stories', name: 'family.stories' },
  { path: '/family/children/:child_id/quizzes/:activity_id', name: 'family.quizzes.result' },
  { path: '/family/children/:child_id/flashcards/:activity_id', name: 'family.flashcards.result' },
  { path: '/family/children/:child_id/mind-maps/:activity_id', name: 'family.mind-maps.result' },
  { path: '/family/children/:child_id/stories/:activity_id', name: 'family.stories.result' },
  { path: '/family/children/:child_id/homework/:activity_id', name: 'family.homework.result' },
  { path: '/family/children/:child_id/notebook/explanations/:activity_id', name: 'family.notebook.explanation' },
  { path: '/', name: 'home' },
  { path: '/classes', name: 'classes' },
  { path: '/classes/:class_id', name: 'classes.detail' },
  { path: '/students/:student_id', name: 'students.detail' },
  { path: '/tools', name: 'tools' },
  { path: '/tools/question-generator', name: 'tools.question-generator' },
  { path: '/tools/slide-generator', name: 'tools.slide-generator' },
  { path: '/tools/rubric-generator', name: 'tools.rubric-generator' },
  { path: '/assessments', name: 'assessments' },
  { path: '/assessments/new', name: 'assessments.new' },
  { path: '/assessments/quick', name: 'assessments.quick' },
  { path: '/assessments/:job_id/results', name: 'assessments.results' },
  { path: '/assessments/:job_id/review/:entity_id', name: 'assessments.review' },
  { path: '/quizzes', name: 'quizzes' },
  { path: '/quizzes/new', name: 'quizzes.new' },
  { path: '/quizzes/:quizId/edit', name: 'quizzes.edit' },
  { path: '/quizzes/:quizId/analytics', name: 'quizzes.analytics' },
  { path: '/quizzes/sessions/:sessionId/host', name: 'quizzes.host' },
  { path: '/quizzes/sp-sessions/:sessionId/host', name: 'quizzes.sp.host' },
  { path: '/quizzes/sp-sessions/:sessionId/analytics', name: 'quizzes.sp.analytics' },
  { path: '/chat/:sessionId?', name: 'chat' },
  { path: '*', name: 'not_found' },
];

// A pathname's page: { name, route }, where route is the pattern it matched, such as /classes/:class_id.
// React Router ranks the patterns as App.jsx's <Routes> does, so '*' only takes what nothing else matches.
export function pageFor(pathname) {
  const page = matchRoutes(PAGES, pathname)?.[0]?.route ?? PAGES.at(-1);
  return { name: page.name, route: page.path };
}
