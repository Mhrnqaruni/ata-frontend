// The pupils' join lookup (Phase 1.46, SOT-8): GET /api/quiz-join/:code says which open run a code opens, live or
// homework, with its quiz and teacher, so /join can open the right pupil page. It needs no sign-in.
// Area: quizzes

import api, { apiError } from '../../../services/api';
import { cleanCode, joinPath } from '../shared/joining';
import { WORDS } from '../words';

export { cleanCode, joinPath };

// The open run a code opens: { kind: 'live' | 'homework', quiz_title, teacher_name }. A live run wins when a live and
// a homework run share the code (Q8). Refused with an Error to show and its `status`: 404 with the server's sentence
// ("This quiz has finished." or "No quiz has this code. Check it with your teacher."), 429 when one address looked up
// over 60 codes in a minute, or null when the server couldn't be reached.
export async function lookupJoin(code, { signal } = {}) {
  try {
    const { data } = await api.get(`/api/quiz-join/${encodeURIComponent(cleanCode(code))}`, { signal });
    return data;
  } catch (error) {
    const status = error.response?.status ?? null;
    const failure = status === 429 ? new Error(WORDS.tooManyTries) : apiError(error, WORDS.codeNotChecked);
    throw Object.assign(failure, { status });
  }
}
