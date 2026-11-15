// The quiz area's shared query keys (Phase 1.46, SOT-16) for the reads more than one page caches or refreshes, and the
// library read that Home and the library share. Each page folder's queries.js builds its hooks on these.
// Area: quizzes

import api from '../../services/api';
import { sessionGeneration } from '../../services/queryCache';
import { cleanCode } from './shared/joining';

// Teacher data is keyed ['teacher', session, user, family, …] (hooks/useTeacherData.js). The library, the tags and a
// quiz sit in the 'quizzes' family, and runs and summaries in 'quizSession', so the app's existing refreshes after a
// quiz changes (services/queryCache.js's cacheFamilies.quiz) reach them too.
const teacher = (userId, family, ...rest) => ['teacher', sessionGeneration(), userId, family, ...rest];

export const quizKeys = {
  // GET /api/quiz-library?…. Without params: every page and filter of it, to refresh or set them all.
  library: (userId, params) => teacher(userId, 'quizzes', 'library', ...(params ? [libraryParams(params)] : [])),
  // GET /api/quiz-tags: the teacher's quiz tags, with their quiz counts.
  tags: (userId) => teacher(userId, 'quizzes', 'tags'),
  // GET /api/quizzes/:quizId: one quiz, with its questions.
  quiz: (userId, quizId) => teacher(userId, 'quizzes', 'quiz', String(quizId)),
  // GET /api/quizzes/:quizId/runs: the quiz's live and homework runs, newest first.
  runs: (userId, quizId) => teacher(userId, 'quizSession', 'runs', String(quizId)),
  // GET /api/quizzes/:quizId/runs/:runId/summary?class_id=: one run's results, for one class or all.
  summary: (userId, quizId, runId, classId) =>
    teacher(userId, 'quizSession', 'summary', String(quizId), String(runId), classId ? String(classId) : 'all'),
  // GET /api/quiz-join/:code: public, for pupils with no sign-in, so it has no session or user.
  join: (code) => ['quizJoin', cleanCode(code)],
};

// The library's query in one form, so the same filters always make the same key: empty values left out, and the
// repeatable filters (state, class_id, tag_id) sorted.
export function libraryParams(params = {}) {
  const tidy = {};
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (!Array.isArray(value)) tidy[name] = value;
    else if (value.length) tidy[name] = value.map(String).sort();
  }
  return tidy;
}

// The library list as one read, for every page that shows it (Home's quiz panel, the library): its key and its
// fetch of GET /api/quiz-library, whose answer is { items, total, counts, live_now } (SOT-2). Repeated filters go
// as FastAPI reads them: state=draft&state=ready.
export const libraryQuery = (userId, params) => ({
  queryKey: quizKeys.library(userId, params),
  queryFn: async ({ signal }) =>
    (await api.get('/api/quiz-library', { params: libraryParams(params), paramsSerializer: { indexes: null }, signal }))
      .data,
});
